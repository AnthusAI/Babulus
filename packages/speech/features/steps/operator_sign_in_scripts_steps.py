"""Steps that run the Google client, operator and bootstrap scripts on a fake aws."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from behave import given, then, when
from support import fake_aws

REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
DEPLOY_DIR = REPOSITORY_ROOT / "infra" / "control-plane-deploy"
GOOGLE_SCRIPT = DEPLOY_DIR / "set-google-client.sh"
OPERATOR_SCRIPT = DEPLOY_DIR / "add-operator.sh"
BOOTSTRAP_SCRIPT = DEPLOY_DIR / "bootstrap.sh"
WRITE_CONTEXT_SCRIPT = DEPLOY_DIR / "write-deploy-context.sh"

# Built, not written out, so no account id appears in the repository.
ACCOUNT = "4" * 12
OTHER_ACCOUNT = "5" * 12
SECRET_NAME = "babulus-control-plane-google-oauth"
SECRET_ARN = f"arn:aws:secretsmanager:us-east-1:{ACCOUNT}:secret:{SECRET_NAME}-AbCdEf"
GOOGLE_CLIENT_ID = "123456789-abc123def.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "spec-secret-value-that-must-never-be-shown"
CONTEXT = {
    "bootstrap_bucket_name": "spec-assets-bucket",
    "budget_alert_email": "spec-alerts@example.com",
    "spend_ceiling_per_day": "spec-ceiling-value-91",
}
CONTROL_PLANE_POOL = {"Name": "BabulusUserPool-spec", "Id": "us-east-1_Control"}
STUDIO_POOL = {"Name": "amplifyAuthUserPool-spec", "Id": "us-east-1_Studio"}
PERSON = "person@example.com"
PERSON_USER = {"Username": "Google_1001", "email": PERSON}


def _context_json() -> str:
    return json.dumps(CONTEXT)


def _remember_context(context, account) -> None:
    context.fake_aws = account
    context.context_before = account.state()["context"]
    context.script_result = None


@given("a fake AWS account with a deploy context")
def step_account_with_context(context) -> None:
    _remember_context(context, fake_aws.install(ACCOUNT, context_json=_context_json()))


@given("a fake AWS account without a deploy context")
def step_account_without_context(context) -> None:
    _remember_context(context, fake_aws.install(ACCOUNT))


@given("a fake AWS account with a deploy context and an existing Google secret")
def step_account_with_secret_and_context(context) -> None:
    account = fake_aws.install(
        ACCOUNT,
        context_json=_context_json(),
        secrets={SECRET_NAME: {"arn": SECRET_ARN, "value": "{}"}},
    )
    _remember_context(context, account)


@given("a fake AWS account whose deploy context already names the Google secret")
def step_account_context_names_secret(context) -> None:
    stored = {**CONTEXT, "google_oauth_secret_arn": SECRET_ARN}
    _remember_context(
        context, fake_aws.install(ACCOUNT, context_json=json.dumps(stored))
    )


def _write_settings(context, values: dict) -> None:
    values_file = context.fake_aws.root / "values.json"
    values_file.write_text(json.dumps(values), encoding="utf-8")
    context.new_settings = values
    context.script_result = context.fake_aws.run(
        WRITE_CONTEXT_SCRIPT, ["--account", ACCOUNT, "--values", str(values_file)]
    )


@when("a person writes new private settings that do not name a Google secret")
def step_write_settings(context) -> None:
    _write_settings(context, {"bootstrap_bucket_name": "other-bucket"})


@when("a person writes new private settings that name a different Google secret")
def step_write_settings_other_secret(context) -> None:
    _write_settings(
        context,
        {"bootstrap_bucket_name": "other-bucket", "google_oauth_secret_arn": "other"},
    )


@then(
    "the stored deploy context has the new settings and the same google_oauth_secret_arn"
)
def step_context_kept_arn(context) -> None:
    assert _context_now(context) == {
        **context.new_settings,
        "google_oauth_secret_arn": SECRET_ARN,
    }


@then("the stored deploy context names the different Google secret")
def step_context_other_arn(context) -> None:
    assert _context_now(context) == context.new_settings


@given("a fake AWS account with an existing Google secret")
def step_account_with_secret(context) -> None:
    account = fake_aws.install(
        ACCOUNT, secrets={SECRET_NAME: {"arn": SECRET_ARN, "value": "{}"}}
    )
    _remember_context(context, account)


@given("a fake AWS account with no secrets")
def step_account_no_secrets(context) -> None:
    _remember_context(context, fake_aws.install(ACCOUNT))


def _pool_account(context, *, pools, groups=None, members=None) -> None:
    account = fake_aws.install(
        ACCOUNT, pools=pools, users=[PERSON_USER], groups=groups or {}
    )
    if members:
        state = account.state()
        state["members"] = members
        account.state_path.write_text(json.dumps(state), encoding="utf-8")
    _remember_context(context, account)


@given(
    "a fake AWS account with a control plane pool and a user who has signed in with Google"
)
def step_pool_and_user(context) -> None:
    _pool_account(context, pools=[CONTROL_PLANE_POOL])


@given(
    "a fake AWS account with a control plane pool, an operators group and a user who has signed in with Google"
)
def step_pool_group_and_user(context) -> None:
    _pool_account(
        context,
        pools=[CONTROL_PLANE_POOL],
        groups={CONTROL_PLANE_POOL["Id"]: ["operators"]},
    )


@given(
    "a fake AWS account with a Studio pool listed before the control plane pool and a user who has signed in with Google"
)
def step_studio_pool_first(context) -> None:
    _pool_account(context, pools=[STUDIO_POOL, CONTROL_PLANE_POOL])


@given(
    "a fake AWS account with a control plane pool, an operators group and an operator"
)
def step_pool_group_and_operator(context) -> None:
    _pool_account(
        context,
        pools=[CONTROL_PLANE_POOL],
        groups={CONTROL_PLANE_POOL["Id"]: ["operators"]},
        members=[PERSON_USER["Username"]],
    )


def _run_google(context, account: str, client_id: str, secret: str) -> None:
    context.script_result = context.fake_aws.run(
        GOOGLE_SCRIPT, ["--account", account], stdin=f"{client_id}\n{secret}\n"
    )


@when(
    "a person runs the Google client script for a different account and types a valid client id and secret"
)
def step_google_wrong_account(context) -> None:
    _run_google(context, OTHER_ACCOUNT, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)


@when("a person runs the Google client script and types a valid client id and secret")
def step_google_valid(context) -> None:
    _run_google(context, ACCOUNT, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)


@when(
    'a person runs the Google client script and types the client id "{client_id}" and a secret'
)
def step_google_with_id(context, client_id: str) -> None:
    _run_google(context, ACCOUNT, client_id, GOOGLE_CLIENT_SECRET)


def _run_operator(context, account: str, email: str, *extra: str) -> None:
    context.script_result = context.fake_aws.run(
        OPERATOR_SCRIPT, ["--account", account, "--email", email, *extra]
    )


@when("a person runs the operator script for a different account to add that user")
def step_operator_wrong_account(context) -> None:
    _run_operator(context, OTHER_ACCOUNT, PERSON)


@when("a person runs the operator script to add that user")
def step_operator_add(context) -> None:
    _run_operator(context, ACCOUNT, PERSON)


@when("a person runs the operator script to add someone who has never signed in")
def step_operator_add_stranger(context) -> None:
    _run_operator(context, ACCOUNT, "stranger@example.com")


@when("a person runs the operator script to remove that user")
def step_operator_remove(context) -> None:
    _run_operator(context, ACCOUNT, PERSON, "--remove")


@when("a person plans the deploy roles with the bootstrap script")
def step_bootstrap_plan(context) -> None:
    context.script_result = context.fake_aws.run(
        BOOTSTRAP_SCRIPT, ["--account", ACCOUNT, "--plan-only"]
    )


def _output(context) -> str:
    result = context.script_result
    return result.stdout + result.stderr


@then("the script exits with status {status:d}")
def step_exit_status(context, status: int) -> None:
    assert context.script_result.returncode == status, (
        context.script_result.returncode,
        _output(context),
    )


@then("the fake account has no secrets")
def step_no_secrets(context) -> None:
    assert context.fake_aws.state()["secrets"] == {}
    assert not context.fake_aws.calls_to("secretsmanager", "create-secret")
    assert not context.fake_aws.calls_to("secretsmanager", "put-secret-value")


@then("the deploy context is unchanged")
def step_context_unchanged(context) -> None:
    assert context.fake_aws.state()["context"] == context.context_before
    assert not context.fake_aws.calls_to("ssm", "put-parameter")


@then('the secret "{name}" holds the client id and client secret as JSON')
def step_secret_holds(context, name: str) -> None:
    stored = json.loads(context.fake_aws.state()["secrets"][name]["value"])
    assert stored == {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
    }


@then("the secret reached Secrets Manager through a file only its owner could read")
def step_secret_via_private_file(context) -> None:
    writes = context.fake_aws.calls_to(
        "secretsmanager", "create-secret"
    ) + context.fake_aws.calls_to("secretsmanager", "put-secret-value")
    assert len(writes) == 1
    (received,) = writes[0]["files"]
    assert received["mode"] == 0o600, oct(received["mode"])
    assert any(a.startswith("file://") for a in writes[0]["argv"])


def _context_now(context) -> dict:
    return json.loads(context.fake_aws.state()["context"])


@then("the deploy context keeps its other keys and gains google_oauth_secret_arn")
def step_context_merged(context) -> None:
    merged = _context_now(context)
    assert merged.pop("google_oauth_secret_arn") == SECRET_ARN
    assert merged == CONTEXT


@then("the output names bootstrap.sh and the deploy workflow as the next steps")
def step_next_steps(context) -> None:
    output = _output(context)
    assert "bootstrap.sh" in output
    assert "Control plane deploy" in output
    assert output.index("bootstrap.sh") < output.index("Control plane deploy")


@then("the client secret appears in no aws command line")
def step_secret_not_in_argv(context) -> None:
    for call in context.fake_aws.calls():
        assert GOOGLE_CLIENT_SECRET not in " ".join(call["argv"]), call["argv"]


@then("the client secret appears nowhere in the script's output")
def step_secret_not_in_output(context) -> None:
    assert GOOGLE_CLIENT_SECRET not in _output(context)


@then("no other deploy context value appears in the script's output")
def step_context_not_in_output(context) -> None:
    for value in CONTEXT.values():
        assert value not in _output(context), value


@then("the existing secret was updated, not created again")
def step_secret_updated(context) -> None:
    assert context.fake_aws.calls_to("secretsmanager", "put-secret-value")
    assert not context.fake_aws.calls_to("secretsmanager", "create-secret")


@then("nobody is in the operators group")
def step_nobody_operator(context) -> None:
    assert context.fake_aws.state()["members"] == []


@then("no group was created")
def step_no_group_created(context) -> None:
    assert not context.fake_aws.calls_to("cognito-idp", "create-group")


@then("the control plane pool has an operators group")
def step_pool_has_group(context) -> None:
    groups = context.fake_aws.state()["groups"]
    assert groups == {CONTROL_PLANE_POOL["Id"]: ["operators"]}, groups


@then("that user is in the operators group")
def step_user_is_operator(context) -> None:
    assert context.fake_aws.state()["members"] == [PERSON_USER["Username"]]


@then("the output says the person must sign in once with Google first")
def step_sign_in_first(context) -> None:
    assert "sign in" in _output(context)
    assert "Google" in _output(context)


@then("every group call named the control plane pool")
def step_group_calls_pool(context) -> None:
    calls = [c for c in context.fake_aws.calls() if c["argv"][0] == "cognito-idp"]
    group_calls = [c for c in calls if "--user-pool-id" in c["argv"]]
    assert group_calls
    for call in group_calls:
        position = call["argv"].index("--user-pool-id") + 1
        assert call["argv"][position] == CONTROL_PLANE_POOL["Id"], call["argv"]


def _change_set_parameters(context) -> list[str]:
    (call,) = context.fake_aws.calls_to("cloudformation", "create-change-set")
    return [a for a in call["argv"] if a.startswith("ParameterKey=")]


@then(
    "the change set is created with the GoogleOAuthSecretArn parameter set to that secret's address"
)
def step_bootstrap_passes_arn(context) -> None:
    assert context.script_result.returncode == 0, _output(context)
    expected = f"ParameterKey=GoogleOAuthSecretArn,ParameterValue={SECRET_ARN}"
    assert expected in _change_set_parameters(context)


@then("the change set is created with the GoogleOAuthSecretArn parameter empty")
def step_bootstrap_empty(context) -> None:
    assert context.script_result.returncode == 0, _output(context)
    assert "ParameterKey=GoogleOAuthSecretArn,ParameterValue=" in (
        _change_set_parameters(context)
    )


@given("the Google client script and the operator script are read")
def step_read_new_scripts(context) -> None:
    context.new_scripts = {
        path: path.read_text(encoding="utf-8")
        for path in (GOOGLE_SCRIPT, OPERATOR_SCRIPT)
    }


@then("each script runs under bash with strict settings and valid syntax")
def step_scripts_strict(context) -> None:
    for path, text in context.new_scripts.items():
        assert text.startswith("#!/usr/bin/env bash\n"), path
        assert "\nset -euo pipefail\n" in text, path
        subprocess.run(["bash", "-n", str(path)], check=True)


@then("no variable in either script is written without braces")
def step_scripts_braced(context) -> None:
    for path, text in context.new_scripts.items():
        unbraced = re.findall(r"\$(?!\{|\()[A-Za-z_0-9@#?*!-]", text)
        assert not unbraced, (path, unbraced)


@then("neither script holds a twelve digit account id or an email address")
def step_scripts_no_identifiers(context) -> None:
    for path, text in context.new_scripts.items():
        assert not re.search(r"\b\d{12}\b", text), path
        assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text), path


@then(
    "the Google client script reads the secret silently and never passes it as an argument"
)
def step_google_reads_silently(context) -> None:
    text = context.new_scripts[GOOGLE_SCRIPT]
    assert "read -r -s" in text
    assert 'read -r -p "Google OAuth client id' in text
    assert '--secret-string "file://' in text
    assert '--secret-string "${' not in text
    assert "set -x" not in text
    assert 'echo "${client_secret}"' not in text


@given("the setup guide for the Google client and operators is read")
def step_read_guide(context) -> None:
    guide = REPOSITORY_ROOT / "docs" / "new-account-setup.md"
    context.guide_text = guide.read_text(encoding="utf-8")


@then(
    "the guide names set-google-client.sh, bootstrap.sh, the deploy, the first sign-in and add-operator.sh in that order"
)
def step_guide_order(context) -> None:
    text = context.guide_text
    headings = [
        text.index("## 8. Store the Google sign-in client"),
        text.index("infra/control-plane-deploy/set-google-client.sh --account"),
        text.index("infra/control-plane-deploy/bootstrap.sh --account"),
        text.index("## 10. Deploy the control plane"),
        text.index("## 11. Sign in once"),
        text.index("infra/control-plane-deploy/add-operator.sh --account"),
    ]
    assert headings == sorted(headings), headings
