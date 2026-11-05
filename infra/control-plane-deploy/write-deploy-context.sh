#!/usr/bin/env bash
# Writes the private deploy settings to Parameter Store as a SecureString. The
# values file stays outside the repository; copy deploy-context.example.json to
# start one. Values are never printed. A person runs this.
#
#   AWS_PROFILE=<profile> infra/control-plane-deploy/write-deploy-context.sh --account <id> --values <file>
set -euo pipefail

expected_account=""
values_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --account)
      expected_account="${2:-}"
      shift 2
      ;;
    --values)
      values_file="${2:-}"
      shift 2
      ;;
    *)
      echo "REFUSED: unknown argument $1." >&2
      exit 2
      ;;
  esac
done
if [[ ! "${expected_account}" =~ ^[0-9]{12}$ || -z "${values_file}" ]]; then
  echo "REFUSED: pass --account <12 digit AWS account id> and --values <file>." >&2
  exit 2
fi
aws_args=(--region "us-east-1")

account="$(aws sts get-caller-identity "${aws_args[@]}" --query Account --output text)"
if [[ "${account}" != "${expected_account}" ]]; then
  echo "REFUSED: signed in to a different AWS account. Check AWS_PROFILE." >&2
  exit 2
fi

if ! jq -e 'type == "object" and (.bootstrap_bucket_name | type == "string") and (tostring | contains("<") | not)' \
  "${values_file}" > /dev/null; then
  echo "REFUSED: the values file must be JSON with bootstrap_bucket_name and no placeholders left." >&2
  exit 2
fi

aws ssm put-parameter "${aws_args[@]}" --name /babulus/control-plane/deploy-context --type SecureString \
  --overwrite --value "file://${values_file}" --query Version --output text
