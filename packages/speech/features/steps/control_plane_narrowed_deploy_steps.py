"""Steps that check the narrowed control plane deploy path from templates alone."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml
from behave import given, then
from support.fallback_machine import CONTROL_PLANE

REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DEPLOY_TEMPLATE = (
    REPOSITORY_ROOT / "infra" / "control-plane-deploy" / "template.yml"
)
NARROWED_CONTEXT = {
    "deploy_mode": "narrowed",
    "bootstrap_bucket_name": "placeholder-assets-bucket",
}
SYNTHESIZE_APP_SCRIPT = (
    "import json, sys\n"
    "sys.path.insert(0, sys.argv[1])\n"
    "import app as control_plane_app\n"
    "assembly = control_plane_app.app.synth()\n"
    "print(json.dumps(assembly.stacks[0].template))\n"
)
ACCOUNT_ID_PATTERN = re.compile(r"\b\d{12}\b")
EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}")


class CloudFormationLoader(yaml.SafeLoader):
    """Safe YAML loader that turns short-form intrinsic tags into mappings."""


def _construct_intrinsic(loader: CloudFormationLoader, suffix: str, node) -> Any:
    if isinstance(node, yaml.ScalarNode):
        value: Any = loader.construct_scalar(node)
    elif isinstance(node, yaml.SequenceNode):
        value = loader.construct_sequence(node, deep=True)
    else:
        value = loader.construct_mapping(node, deep=True)
    if suffix == "Ref":
        return {"Ref": value}
    if suffix == "GetAtt" and isinstance(value, str):
        return {"Fn::GetAtt": value.split(".", 1)}
    return {f"Fn::{suffix}": value}


CloudFormationLoader.add_multi_constructor("!", _construct_intrinsic)


def _as_list(value: Any) -> list:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _text(value: Any) -> str:
    """Render a resource or principal value as comparable text."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict) and "Fn::Sub" in value:
        return _text(value["Fn::Sub"])
    if isinstance(value, list) and value and isinstance(value[0], str):
        return value[0]
    return json.dumps(value, sort_keys=True)


def _statements(policy_document: dict, effect: str) -> list[dict]:
    return [
        statement
        for statement in _as_list(policy_document["Statement"])
        if statement.get("Effect") == effect
    ]


def _role_policy_documents(role: dict) -> list[dict]:
    return [
        policy["PolicyDocument"] for policy in role["Properties"].get("Policies", [])
    ]


def _role_statements(role: dict, effect: str) -> list[dict]:
    found: list[dict] = []
    for document in _role_policy_documents(role):
        found.extend(_statements(document, effect))
    return found


def _deploy_template(context) -> dict:
    return context.deploy_template["Resources"]


def _role(context, key: str) -> dict:
    return _deploy_template(context)[key]


def _statement_actions(statement: dict) -> list[str]:
    return _as_list(statement["Action"])


def _statements_with_action(statements: list[dict], action: str) -> list[dict]:
    return [s for s in statements if action in _statement_actions(s)]


def _granting_everything(action: str) -> bool:
    return action in ("*", "iam:*")


@given("the control plane app is synthesized in narrowed deploy mode")
def step_synthesize_narrowed(context) -> None:
    environment = dict(os.environ)
    environment["CDK_CONTEXT_JSON"] = json.dumps(NARROWED_CONTEXT)
    completed = subprocess.run(
        [sys.executable, "-c", SYNTHESIZE_APP_SCRIPT, str(CONTROL_PLANE)],
        capture_output=True,
        text=True,
        check=True,
        cwd=str(CONTROL_PLANE),
        env=environment,
    )
    context.synthesized_stack_template = json.loads(
        completed.stdout.strip().splitlines()[-1]
    )


@given("the narrowed deploy template is parsed")
def step_parse_deploy_template(context) -> None:
    path = Path(
        context.config.userdata.get("deploy_template", str(DEFAULT_DEPLOY_TEMPLATE))
    )
    context.deploy_template_text = path.read_text(encoding="utf-8")
    context.deploy_template = yaml.load(
        context.deploy_template_text, Loader=CloudFormationLoader
    )


def _synthesized_template(context) -> dict:
    if hasattr(context, "synthesized_stack_template"):
        return context.synthesized_stack_template
    return context.synthesized_stacks[0]["template"]


def _stack_roles(context) -> dict:
    resources = _synthesized_template(context)["Resources"]
    return {k: v for k, v in resources.items() if v["Type"] == "AWS::IAM::Role"}


@then('every IAM role in the stack has the permissions boundary "{name}"')
def step_every_role_has_boundary(context, name: str) -> None:
    roles = _stack_roles(context)
    assert roles
    for key, role in roles.items():
        boundary = role["Properties"].get("PermissionsBoundary")
        assert boundary is not None, f"{key} has no permissions boundary"
        assert f":policy/{name}" in json.dumps(boundary), (key, boundary)


@then("no IAM role in the stack has a permissions boundary")
def step_no_role_has_boundary(context) -> None:
    for key, role in _stack_roles(context).items():
        assert "PermissionsBoundary" not in role["Properties"], key


@then("no IAM role in the stack has the AdministratorAccess policy")
def step_no_administrator_access(context) -> None:
    for key, role in _stack_roles(context).items():
        arns = json.dumps(role["Properties"].get("ManagedPolicyArns", []))
        assert "AdministratorAccess" not in arns, key


@then("no IAM role in the stack is allowed every action")
def step_no_role_allows_everything(context) -> None:
    resources = _synthesized_template(context)["Resources"]
    for key, resource in resources.items():
        if resource["Type"] != "AWS::IAM::Policy":
            continue
        for statement in _statements(resource["Properties"]["PolicyDocument"], "Allow"):
            for action in _statement_actions(statement):
                assert not _granting_everything(action), (key, action)


def _boundary_allowed_actions(context) -> set[str]:
    boundary = _deploy_template(context)["ControlPlaneBoundary"]
    allowed: set[str] = set()
    for statement in _statements(boundary["Properties"]["PolicyDocument"], "Allow"):
        allowed.update(_statement_actions(statement))
    return allowed


@then("every action granted to a stack role is allowed by the permissions boundary")
def step_boundary_covers_granted_actions(context) -> None:
    granted: set[str] = set()
    resources = _synthesized_template(context)["Resources"]
    for resource in resources.values():
        if resource["Type"] != "AWS::IAM::Policy":
            continue
        for statement in _statements(resource["Properties"]["PolicyDocument"], "Allow"):
            granted.update(_statement_actions(statement))
    assert granted
    missing = sorted(granted - _boundary_allowed_actions(context))
    assert not missing, missing


@then("the deploy role trusts only the GitHub OIDC provider parameter")
def step_deploy_role_trusts_provider(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    statements = _as_list(role["Properties"]["AssumeRolePolicyDocument"]["Statement"])
    assert len(statements) == 1, statements
    statement = statements[0]
    assert statement["Effect"] == "Allow"
    assert statement["Principal"] == {"Federated": {"Ref": "OidcProviderArn"}}
    assert statement["Action"] == "sts:AssumeRoleWithWebIdentity"


@then("the deploy role subject is the immutable main branch subject of this repository")
def step_deploy_role_subject(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    statement = role["Properties"]["AssumeRolePolicyDocument"]["Statement"][0]
    condition = statement["Condition"]
    assert list(condition) == ["StringEquals"], list(condition)
    subject = condition["StringEquals"]["token.actions.githubusercontent.com:sub"]
    expected = (
        "repo:AnthusAI@${GitHubOwnerId}/Babulus@${GitHubRepoId}:ref:refs/heads/main"
    )
    assert subject == {"Fn::Sub": expected}, subject


@then("the deploy role audience is sts.amazonaws.com")
def step_deploy_role_audience(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    statement = role["Properties"]["AssumeRolePolicyDocument"]["Statement"][0]
    audience = statement["Condition"]["StringEquals"][
        "token.actions.githubusercontent.com:aud"
    ]
    assert audience == "sts.amazonaws.com", audience


@then("no statement in the deploy role allows assuming any role")
def step_deploy_role_cannot_assume(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    for statement in _role_statements(role, "Allow"):
        for action in _statement_actions(statement):
            assert not action.startswith("sts:"), action
            assert action != "*", action


@then("the deploy role explicitly denies assuming roles named cdk")
def step_deploy_role_denies_cdk(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    denials = _statements_with_action(_role_statements(role, "Deny"), "sts:AssumeRole")
    assert denials
    assert any(_text(d["Resource"]).endswith(":role/cdk-*") for d in denials), denials


@then(
    "the deploy role passes only the execution role and only to cloudformation.amazonaws.com"
)
def step_deploy_role_pass_role(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    passes = _statements_with_action(_role_statements(role, "Allow"), "iam:PassRole")
    assert len(passes) == 1, passes
    statement = passes[0]
    assert statement["Resource"] == {"Fn::GetAtt": ["ControlPlaneCfnExecRole", "Arn"]}
    condition = statement["Condition"]["StringEquals"]
    assert condition == {"iam:PassedToService": "cloudformation.amazonaws.com"}


@then("the deploy role creates change sets only with the execution role")
def step_deploy_role_change_sets(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    creates = _statements_with_action(
        _role_statements(role, "Allow"), "cloudformation:CreateChangeSet"
    )
    assert len(creates) == 1, creates
    condition = creates[0]["Condition"]["StringEquals"]
    assert condition == {
        "cloudformation:RoleArn": {"Fn::GetAtt": ["ControlPlaneCfnExecRole", "Arn"]}
    }, condition
    assert _text(creates[0]["Resource"]).endswith(":stack/BabulusControlPlane/*")


@then(
    "the execution role allows iam:CreateRole only on roles named BabulusControlPlane with the boundary condition"
)
def step_exec_role_create_role(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    creates = _statements_with_action(_role_statements(role, "Allow"), "iam:CreateRole")
    assert len(creates) == 1, creates
    statement = creates[0]
    assert _text(statement["Resource"]).endswith(":role/BabulusControlPlane-*")
    assert "iam:PutRolePermissionsBoundary" in _statement_actions(statement)
    condition = statement["Condition"]["StringEquals"]
    assert condition == {"iam:PermissionsBoundary": {"Ref": "ControlPlaneBoundary"}}


@then(
    "the execution role allows iam:PassRole only on roles named BabulusControlPlane and only to named services"
)
def step_exec_role_pass_role(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    passes = _statements_with_action(_role_statements(role, "Allow"), "iam:PassRole")
    assert passes
    for statement in passes:
        assert _text(statement["Resource"]).endswith(":role/BabulusControlPlane-*")
        services = _as_list(
            statement["Condition"]["StringEquals"]["iam:PassedToService"]
        )
        assert services
        assert all(s.endswith(".amazonaws.com") for s in services), services


@then("the execution role is assumed only by cloudformation.amazonaws.com")
def step_exec_role_trust(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    statements = _as_list(role["Properties"]["AssumeRolePolicyDocument"]["Statement"])
    assert len(statements) == 1, statements
    assert statements[0]["Principal"] == {"Service": "cloudformation.amazonaws.com"}


@then('the execution role explicitly denies "{action}"')
def step_exec_role_denies(context, action: str) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    assert _statements_with_action(_role_statements(role, "Deny"), action), action


@then("the execution role explicitly denies every action on the protected user pool")
def step_exec_role_denies_protected_pool(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    denials = _statements_with_action(_role_statements(role, "Deny"), "*")
    assert any(d["Resource"] == {"Ref": "ProtectedUserPoolArn"} for d in denials)


def _boundary_denials(context) -> list[dict]:
    boundary = _deploy_template(context)["ControlPlaneBoundary"]
    return _statements(boundary["Properties"]["PolicyDocument"], "Deny")


@then('the permissions boundary explicitly denies "{action}"')
def step_boundary_denies(context, action: str) -> None:
    assert _statements_with_action(_boundary_denials(context), action), action


@then(
    "the permissions boundary explicitly denies every action on the protected user pool"
)
def step_boundary_denies_protected_pool(context) -> None:
    denials = _statements_with_action(_boundary_denials(context), "*")
    assert any(d["Resource"] == {"Ref": "ProtectedUserPoolArn"} for d in denials)


@then("the template text contains no twelve digit account id and no email address")
def step_no_identifiers(context) -> None:
    text = context.deploy_template_text
    assert not ACCOUNT_ID_PATTERN.search(text), ACCOUNT_ID_PATTERN.findall(text)
    assert not EMAIL_PATTERN.search(text), EMAIL_PATTERN.findall(text)


@then("no role in the template is allowed every action")
def step_no_template_role_allows_everything(context) -> None:
    for key in ("ControlPlaneCfnExecRole", "ControlPlaneDeployRole"):
        for statement in _role_statements(_role(context, key), "Allow"):
            for action in _statement_actions(statement):
                assert not _granting_everything(action), (key, action)
    boundary = _deploy_template(context)["ControlPlaneBoundary"]
    for statement in _statements(boundary["Properties"]["PolicyDocument"], "Allow"):
        for action in _statement_actions(statement):
            assert not _granting_everything(action), action
