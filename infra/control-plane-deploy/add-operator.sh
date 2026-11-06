#!/usr/bin/env bash
# Makes a person an operator of the control plane, or removes them. A person
# runs this with an administrator session; nothing else can grant the role.
#
#   AWS_PROFILE=<profile> infra/control-plane-deploy/add-operator.sh --account <id> --email <address> [--remove]
#
# Operators are the members of the control plane user pool's operators group.
# The person must have signed in once with Google first, which creates their
# user in the pool. The group is created here if it does not exist yet.
# Exit codes: 0 done, 1 something failed, 2 refused and nothing changed.
set -euo pipefail

region="us-east-1"
group="operators"
expected_account=""
email=""
remove=""

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
    --email)
      email="${2:-}"
      shift 2
      ;;
    --remove)
      remove="true"
      shift
      ;;
    *) refuse "unknown argument ${1}. Usage: add-operator.sh --account <id> --email <address> [--remove]" ;;
  esac
done
[[ "${expected_account}" =~ ^[0-9]{12}$ ]] || refuse "pass --account <12 digit AWS account id>."
[[ "${email}" =~ ^[^@[:space:]\"\']+@[^@[:space:]\"\']+$ ]] || refuse "pass --email <the person's address>."
aws_args=(--region "${region}")

account="$(aws sts get-caller-identity "${aws_args[@]}" --query Account --output text)"
if [[ "${account}" != "${expected_account}" ]]; then
  refuse "signed in to a different AWS account. Check AWS_PROFILE."
fi

pool_id="$(aws cognito-idp list-user-pools "${aws_args[@]}" --max-results 60 \
  --query 'UserPools[?starts_with(Name, `BabulusUserPool`)].Id | [0]' --output text)"
if [[ -z "${pool_id}" || "${pool_id}" == "None" ]]; then
  refuse "no user pool named BabulusUserPool... exists. Deploy the control plane first (docs/new-account-setup.md, step 10)."
fi

group_error="$(mktemp)"
trap 'rm -f "${group_error}"' EXIT
if ! aws cognito-idp get-group "${aws_args[@]}" --user-pool-id "${pool_id}" --group-name "${group}" \
  > /dev/null 2> "${group_error}"; then
  if grep -q "ResourceNotFoundException" "${group_error}"; then
    if [[ -n "${remove}" ]]; then
      refuse "the ${group} group does not exist, so nobody is an operator."
    fi
    aws cognito-idp create-group "${aws_args[@]}" --user-pool-id "${pool_id}" --group-name "${group}" \
      --description "People allowed to operate the Babulus control plane" > /dev/null
    echo "Created the ${group} group."
  else
    echo "FAILED: could not look up the ${group} group." >&2
    exit 1
  fi
fi

username="$(aws cognito-idp list-users "${aws_args[@]}" --user-pool-id "${pool_id}" \
  --filter "email = \"${email}\"" --query 'Users[0].Username' --output text)"
if [[ -z "${username}" || "${username}" == "None" ]]; then
  echo "REFUSED: no user with that email yet. Ask them to sign in to the console once with Google, then run this again." >&2
  exit 2
fi

if [[ -n "${remove}" ]]; then
  aws cognito-idp admin-remove-user-from-group "${aws_args[@]}" --user-pool-id "${pool_id}" \
    --username "${username}" --group-name "${group}"
  echo "Removed ${email} from ${group}. Their existing tokens stop working when they expire (within an hour)."
else
  aws cognito-idp admin-add-user-to-group "${aws_args[@]}" --user-pool-id "${pool_id}" \
    --username "${username}" --group-name "${group}"
  echo "Added ${email} to ${group}. They sign in again to get a token that carries the group."
fi
