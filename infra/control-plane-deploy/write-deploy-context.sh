#!/usr/bin/env bash
# Writes the private deploy settings to Parameter Store as a SecureString. The
# values file stays outside the repository; copy deploy-context.example.json to
# start one. Values are never printed.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: write-deploy-context.sh <aws-profile> <account-id> <values-file>" >&2
  exit 2
fi
profile="$1"
expected_account="$2"
values_file="$3"
aws_args=(--profile "${profile}" --region "us-east-1")

account="$(aws sts get-caller-identity "${aws_args[@]}" --query Account --output text)"
if [[ "${account}" != "${expected_account}" ]]; then
  echo "Signed in to a different AWS account; stopping." >&2
  exit 1
fi

if ! jq -e 'type == "object" and (.bootstrap_bucket_name | type == "string") and (tostring | contains("<") | not)' \
  "${values_file}" > /dev/null; then
  echo "The values file must be JSON with bootstrap_bucket_name and no placeholders left; stopping." >&2
  exit 1
fi

aws ssm put-parameter "${aws_args[@]}" --name /babulus/control-plane/deploy-context --type SecureString \
  --overwrite --value "file://${values_file}" --query Version --output text
