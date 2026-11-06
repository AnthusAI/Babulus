#!/usr/bin/env bash
# Creates, or brings up to date, the roles the control plane pipeline deploys
# with. A person runs this with an administrator session; the pipeline cannot
# change its own roles. Safe to run again: with nothing to change it says so.
#
#   AWS_PROFILE=<profile> infra/control-plane-deploy/bootstrap.sh --account <id> [--plan-only] [--yes]
#
# It takes the template from origin/main, shows the change set and asks before
# applying, sets the repository variable, then verifies the deployed template.
# Private values are looked up here, never printed and never stored in the repo.
# Exit codes: 0 done, 1 something failed, 2 refused and nothing changed.
set -euo pipefail

repo="AnthusAI/Babulus"
region="us-east-1"
stack="babulus-control-plane-deploy"
expected_account=""
plan_only=""
assume_yes=""

refuse() {
  echo "REFUSED: $1" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --account)
      expected_account="${2:-}"
      shift 2
      ;;
    --plan-only)
      plan_only="true"
      shift
      ;;
    --yes)
      assume_yes="true"
      shift
      ;;
    *) refuse "unknown argument $1. Usage: bootstrap.sh --account <id> [--plan-only] [--yes]" ;;
  esac
done
[[ "${expected_account}" =~ ^[0-9]{12}$ ]] || refuse "pass --account <12 digit AWS account id>."
aws_args=(--region "${region}")

account="$(aws sts get-caller-identity "${aws_args[@]}" --query Account --output text)"
if [[ "${account}" != "${expected_account}" ]]; then
  refuse "signed in to a different AWS account. Check AWS_PROFILE."
fi

repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
git -C "${repo_root}" fetch -q origin main
template="$(mktemp -d)/template.yml"
git -C "${repo_root}" show origin/main:infra/control-plane-deploy/template.yml > "${template}"

oidc="$(aws iam list-open-id-connect-providers "${aws_args[@]}" \
  --query 'OpenIDConnectProviderList[?ends_with(Arn, `/token.actions.githubusercontent.com`)].Arn | [0]' --output text)"
owner_id="$(gh api "repos/${repo}" --jq .owner.id)"
repo_id="$(gh api "repos/${repo}" --jq .id)"
pools=""
for pool_id in $(aws cognito-idp list-user-pools --max-results 60 "${aws_args[@]}" --query 'UserPools[].Id' --output text); do
  pools="${pools:+${pools},}arn:aws:cognito-idp:${region}:${account}:userpool/${pool_id}"
done
distribution="$(aws cloudfront list-distributions "${aws_args[@]}" \
  --query 'DistributionList.Items[?Comment==`babul.us front door`].Id | [0]' --output text)"
# Present once set-google-client.sh has run. Left empty otherwise, so the stack
# makes its own placeholder secret.
google_secret_name="babulus-control-plane-google-oauth"
google_secret_arn="$(aws secretsmanager describe-secret "${aws_args[@]}" --secret-id "${google_secret_name}" \
  --query ARN --output text 2> /dev/null || echo "")"
if [[ "${google_secret_arn}" == "None" ]]; then
  google_secret_arn=""
fi
bucket="$(aws cloudformation describe-stack-resource "${aws_args[@]}" --stack-name CDKToolkit \
  --logical-resource-id StagingBucket --query 'StackResourceDetail.PhysicalResourceId' --output text)"

require() {
  if [[ -z "$2" || "$2" == "None" ]]; then
    refuse "missing $1. See docs/new-account-setup.md for the step that creates it."
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
  if [[ -n "${plan_only}" ]]; then
    refuse "the stack is in ROLLBACK_COMPLETE, so a run without --plan-only would delete it and create it again."
  fi
  # A failed first create leaves an empty stack that can only be deleted.
  aws cloudformation delete-stack "${aws_args[@]}" --stack-name "${stack}"
  aws cloudformation wait stack-delete-complete "${aws_args[@]}" --stack-name "${stack}"
  status="NONE"
fi
case "${status}" in
  NONE) change_set_type="CREATE" ;;
  CREATE_COMPLETE | UPDATE_COMPLETE | UPDATE_ROLLBACK_COMPLETE) change_set_type="UPDATE" ;;
  *) refuse "the stack is in ${status}. A person must repair it first." ;;
esac

change_set="bootstrap-$(date -u +%Y%m%d%H%M%S)"
change_set_args=(--stack-name "${stack}" --change-set-name "${change_set}")
aws cloudformation create-change-set "${aws_args[@]}" "${change_set_args[@]}" --change-set-type "${change_set_type}" \
  --template-body "file://${template}" --capabilities CAPABILITY_NAMED_IAM --parameters \
  "ParameterKey=OidcProviderArn,ParameterValue=${oidc}" \
  "ParameterKey=GitHubOwnerId,ParameterValue=${owner_id}" \
  "ParameterKey=GitHubRepoId,ParameterValue=${repo_id}" \
  "ParameterKey=ProtectedUserPoolArns,ParameterValue='${pools}'" \
  "ParameterKey=ProtectedDistributionArn,ParameterValue=arn:aws:cloudfront::${account}:distribution/${distribution}" \
  "ParameterKey=BootstrapBucketName,ParameterValue=${bucket}" \
  "ParameterKey=GoogleOAuthSecretArn,ParameterValue=${google_secret_arn}" > /dev/null
aws cloudformation wait change-set-create-complete "${aws_args[@]}" "${change_set_args[@]}" 2> /dev/null || true
change_set_status="$(aws cloudformation describe-change-set "${aws_args[@]}" "${change_set_args[@]}" --query Status --output text)"
change_set_reason="$(aws cloudformation describe-change-set "${aws_args[@]}" "${change_set_args[@]}" --query StatusReason --output text)"

if [[ "${change_set_status}" == "FAILED" ]]; then
  case "${change_set_reason}" in
    *"didn't contain changes"* | *"No updates are to be performed"*)
      echo "No changes: the roles already match the template on main."
      aws cloudformation delete-change-set "${aws_args[@]}" "${change_set_args[@]}"
      ;;
    *)
      echo "FAILED: the change set could not be created: ${change_set_reason}" >&2
      exit 1
      ;;
  esac
else
  aws cloudformation describe-change-set "${aws_args[@]}" "${change_set_args[@]}" \
    --query 'Changes[].ResourceChange.[Action,LogicalResourceId,ResourceType,Replacement]' --output table
  if [[ -n "${plan_only}" ]]; then
    aws cloudformation delete-change-set "${aws_args[@]}" "${change_set_args[@]}"
    echo "--plan-only: change set deleted, nothing applied."
    exit 0
  fi
  if [[ -z "${assume_yes}" ]]; then
    read -r -p "Apply these changes? Type yes: " answer
    if [[ "${answer}" != "yes" ]]; then
      aws cloudformation delete-change-set "${aws_args[@]}" "${change_set_args[@]}"
      refuse "not confirmed. Change set deleted, nothing applied."
    fi
  fi
  aws cloudformation execute-change-set "${aws_args[@]}" "${change_set_args[@]}"
  if [[ "${change_set_type}" == "CREATE" ]]; then
    aws cloudformation wait stack-create-complete "${aws_args[@]}" --stack-name "${stack}"
  else
    aws cloudformation wait stack-update-complete "${aws_args[@]}" --stack-name "${stack}"
  fi
fi

if [[ -n "${plan_only}" ]]; then
  exit 0
fi

deploy_role="$(aws cloudformation describe-stacks "${aws_args[@]}" --stack-name "${stack}" \
  --query 'Stacks[0].Outputs[?OutputKey==`DeployRoleArn`].OutputValue | [0]' --output text)"
gh variable set CONTROL_PLANE_DEPLOY_ROLE_ARN --repo "${repo}" --body "${deploy_role}"

# Command substitution drops the trailing newline the text output adds.
deployed="$(aws cloudformation get-template "${aws_args[@]}" --stack-name "${stack}" --template-stage Original \
  --query TemplateBody --output text)"
if [[ "${deployed}" != "$(cat "${template}")" ]]; then
  echo "FAILED: the deployed template differs from the template on main." >&2
  exit 1
fi
aws cloudformation describe-stacks "${aws_args[@]}" --stack-name "${stack}" --query 'Stacks[0].StackStatus' --output text
echo "Done. The deployed roles match the template on main."
