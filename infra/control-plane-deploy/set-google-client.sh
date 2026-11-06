#!/usr/bin/env bash
# Stores the Google OAuth web client the control plane's Cognito pool signs
# people in with. A person runs this with an administrator session.
#
#   AWS_PROFILE=<profile> infra/control-plane-deploy/set-google-client.sh --account <id>
#
# It asks for the client id and the client secret. The secret is read without
# echo and is never printed or placed on a command line: it goes to Secrets
# Manager through a temporary file only you can read. The secret's ARN is then
# merged into the deploy-context parameter as google_oauth_secret_arn, and no
# other value of that parameter is shown.
# Exit codes: 0 done, 1 something failed, 2 refused and nothing changed.
set -euo pipefail

region="us-east-1"
secret_name="babulus-control-plane-google-oauth"
context_parameter="/babulus/control-plane/deploy-context"
expected_account=""

refuse() {
  echo "REFUSED: ${1}" >&2
  exit 2
}

while [[ ${#} -gt 0 ]]; do
  case "${1}" in
    --account)
      expected_account="${2:-}"
      shift 2
      ;;
    *) refuse "unknown argument ${1}. Usage: set-google-client.sh --account <id>" ;;
  esac
done
[[ "${expected_account}" =~ ^[0-9]{12}$ ]] || refuse "pass --account <12 digit AWS account id>."
aws_args=(--region "${region}")

account="$(aws sts get-caller-identity "${aws_args[@]}" --query Account --output text)"
if [[ "${account}" != "${expected_account}" ]]; then
  refuse "signed in to a different AWS account. Check AWS_PROFILE."
fi

# The deploy context must exist first, so a mistake here cannot half-apply.
if ! context_json="$(aws ssm get-parameter "${aws_args[@]}" --name "${context_parameter}" --with-decryption \
  --query Parameter.Value --output text 2> /dev/null)"; then
  refuse "the deploy context parameter is missing. Run write-deploy-context.sh first (docs/new-account-setup.md, step 7)."
fi

read -r -p "Google OAuth client id: " client_id
if [[ ! "${client_id}" =~ ^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$ ]]; then
  refuse "that is not a Google web client id. It looks like 123456789-abc123.apps.googleusercontent.com."
fi
read -r -s -p "Google OAuth client secret (not shown): " client_secret
echo >&2
[[ -n "${client_secret}" ]] || refuse "the client secret is empty."

umask 077
work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT
secret_file="${work_dir}/secret.json"
context_file="${work_dir}/context.json"

# The values travel to jq in its environment, not its arguments.
GOOGLE_CLIENT_ID="${client_id}" GOOGLE_CLIENT_SECRET="${client_secret}" \
  jq -n '{client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET}' > "${secret_file}"
chmod 600 "${secret_file}"
client_secret=""

describe_error="${work_dir}/describe-error.txt"
if secret_arn="$(aws secretsmanager describe-secret "${aws_args[@]}" --secret-id "${secret_name}" \
  --query ARN --output text 2> "${describe_error}")"; then
  aws secretsmanager put-secret-value "${aws_args[@]}" --secret-id "${secret_name}" \
    --secret-string "file://${secret_file}" > /dev/null
  echo "Updated the secret ${secret_name}."
elif grep -q "ResourceNotFoundException" "${describe_error}"; then
  secret_arn="$(aws secretsmanager create-secret "${aws_args[@]}" --name "${secret_name}" \
    --description "Google OAuth web client for the Babulus control plane Cognito pool" \
    --secret-string "file://${secret_file}" --query ARN --output text)"
  echo "Created the secret ${secret_name}."
else
  echo "FAILED: could not look up the secret ${secret_name}." >&2
  exit 1
fi

if ! printf '%s' "${context_json}" | SECRET_ARN="${secret_arn}" \
  jq '. + {google_oauth_secret_arn: env.SECRET_ARN}' > "${context_file}"; then
  echo "FAILED: the deploy context parameter is not valid JSON." >&2
  exit 1
fi
aws ssm put-parameter "${aws_args[@]}" --name "${context_parameter}" --type SecureString --overwrite \
  --value "file://${context_file}" > /dev/null
echo "Added google_oauth_secret_arn to the deploy context."

cat <<NEXT

Next:
  1. AWS_PROFILE=<profile> infra/control-plane-deploy/bootstrap.sh --account ${expected_account}
     so the deploy roles may read the secret.
  2. Rerun the "Control plane deploy" workflow from main.
  3. Sign in to the console once with Google, then run add-operator.sh.
NEXT
