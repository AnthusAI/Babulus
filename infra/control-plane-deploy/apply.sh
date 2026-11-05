#!/usr/bin/env bash
# Applies template.yml from origin/main to the deploy stack. Run by a person with
# an administrator session, because the pipeline cannot change its own roles.
# Private values are looked up here, never printed and never stored in the repo.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: apply.sh <aws-profile> <account-id>" >&2
  exit 2
fi
profile="$1"
expected_account="$2"
region="us-east-1"
stack="babulus-control-plane-deploy"
aws_args=(--profile "${profile}" --region "${region}")

account="$(aws sts get-caller-identity "${aws_args[@]}" --query Account --output text)"
if [[ "${account}" != "${expected_account}" ]]; then
  echo "Signed in to a different AWS account; stopping." >&2
  exit 1
fi

repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
git -C "${repo_root}" fetch -q origin main
template="$(mktemp -d)/template.yml"
git -C "${repo_root}" show origin/main:infra/control-plane-deploy/template.yml > "${template}"

oidc="$(aws iam list-open-id-connect-providers "${aws_args[@]}" \
  --query 'OpenIDConnectProviderList[?ends_with(Arn, `/token.actions.githubusercontent.com`)].Arn | [0]' --output text)"
owner_id="$(gh api repos/AnthusAI/Babulus --jq .owner.id)"
repo_id="$(gh api repos/AnthusAI/Babulus --jq .id)"
pools=""
for pool_id in $(aws cognito-idp list-user-pools --max-results 60 "${aws_args[@]}" --query 'UserPools[].Id' --output text); do
  pools="${pools:+${pools},}arn:aws:cognito-idp:${region}:${account}:userpool/${pool_id}"
done
distribution="$(aws cloudfront list-distributions "${aws_args[@]}" \
  --query 'DistributionList.Items[?Comment==`babul.us front door`].Id | [0]' --output text)"
bucket="$(aws cloudformation describe-stack-resource "${aws_args[@]}" --stack-name CDKToolkit \
  --logical-resource-id StagingBucket --query 'StackResourceDetail.PhysicalResourceId' --output text)"

require() {
  if [[ -z "$2" || "$2" == "None" ]]; then
    echo "Missing $1. See docs/new-account-setup.md for the step that creates it; stopping." >&2
    exit 1
  fi
}
require "the GitHub OIDC provider (infra/github-deploy)" "${oidc}"
require "the GitHub owner id" "${owner_id}"
require "the GitHub repository id" "${repo_id}"
require "the Studio's Cognito user pools (first Amplify build)" "${pools}"
require "the babul.us front door (infra/babul-us-edge)" "${distribution}"
require "the CDK bootstrap bucket (cdk bootstrap)" "${bucket}"

status="$(aws cloudformation describe-stacks "${aws_args[@]}" --stack-name "${stack}" \
  --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo NONE)"
if [[ "${status}" == "ROLLBACK_COMPLETE" ]]; then
  # A failed first create leaves an empty stack that can only be deleted.
  aws cloudformation delete-stack "${aws_args[@]}" --stack-name "${stack}"
  aws cloudformation wait stack-delete-complete "${aws_args[@]}" --stack-name "${stack}"
fi

aws cloudformation deploy "${aws_args[@]}" --stack-name "${stack}" --template-file "${template}" \
  --capabilities CAPABILITY_NAMED_IAM --no-fail-on-empty-changeset \
  --parameter-overrides "OidcProviderArn=${oidc}" "GitHubOwnerId=${owner_id}" "GitHubRepoId=${repo_id}" \
  "ProtectedUserPoolArns=${pools}" "ProtectedDistributionArn=arn:aws:cloudfront::${account}:distribution/${distribution}" \
  "BootstrapBucketName=${bucket}"
aws cloudformation describe-stacks "${aws_args[@]}" --stack-name "${stack}" --query 'Stacks[0].StackStatus' --output text
deploy_role="$(aws cloudformation describe-stacks "${aws_args[@]}" --stack-name "${stack}" \
  --query 'Stacks[0].Outputs[?OutputKey==`DeployRoleArn`].OutputValue | [0]' --output text)"
gh variable set CONTROL_PLANE_DEPLOY_ROLE_ARN --repo AnthusAI/Babulus --body "${deploy_role}"
