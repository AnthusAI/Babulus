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
DEFAULT_DEPLOY_WORKFLOW = (
    REPOSITORY_ROOT / ".github" / "workflows" / "control-plane-deploy.yml"
)
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
DEFAULT_APPLY_SCRIPT = (
    REPOSITORY_ROOT / "infra" / "control-plane-deploy" / "bootstrap.sh"
)
DEFAULT_CONTEXT_SCRIPT = (
    REPOSITORY_ROOT / "infra" / "control-plane-deploy" / "write-deploy-context.sh"
)
EXAMPLE_CONTEXT = (
    REPOSITORY_ROOT / "infra" / "control-plane-deploy" / "deploy-context.example.json"
)
SETUP_GUIDE = REPOSITORY_ROOT / "docs" / "new-account-setup.md"
MANAGED_POLICY_LIMIT = 6144
INLINE_POLICY_LIMIT = 10240
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


def _rendered(value: Any) -> Any:
    """Stand in for intrinsics with values at least as long as the real ones."""
    if isinstance(value, dict):
        if "Ref" in value:
            return "x" * 300
        if "Fn::Sub" in value:
            return re.sub(r"\$\{[^}]+\}", "x" * 20, value["Fn::Sub"])
        if "Fn::If" in value:
            return _rendered(value["Fn::If"][1])
        return {key: _rendered(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_rendered(item) for item in value]
    return value


def _policy_size(policy_document: dict) -> int:
    return len(json.dumps(_rendered(policy_document), separators=(",", ":")))


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


@then("the execution role explicitly denies every action on the protected user pools")
def step_exec_role_denies_protected_pool(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    denials = _statements_with_action(_role_statements(role, "Deny"), "*")
    assert any(d["Resource"] == {"Ref": "ProtectedUserPoolArns"} for d in denials)


def _boundary_denials(context) -> list[dict]:
    boundary = _deploy_template(context)["ControlPlaneBoundary"]
    return _statements(boundary["Properties"]["PolicyDocument"], "Deny")


@then('the permissions boundary explicitly denies "{action}"')
def step_boundary_denies(context, action: str) -> None:
    assert _statements_with_action(_boundary_denials(context), action), action


@then(
    "the permissions boundary explicitly denies every action on the protected user pools"
)
def step_boundary_denies_protected_pool(context) -> None:
    denials = _statements_with_action(_boundary_denials(context), "*")
    assert any(d["Resource"] == {"Ref": "ProtectedUserPoolArns"} for d in denials)


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
    for key in ("ControlPlaneBoundary", "ControlPlaneCfnExecResources"):
        policy = _deploy_template(context)[key]
        for statement in _statements(policy["Properties"]["PolicyDocument"], "Allow"):
            for action in _statement_actions(statement):
                assert not _granting_everything(action), action


@then(
    "the execution role explicitly denies every CloudFront action on the protected distribution"
)
def step_exec_role_denies_protected_distribution(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    denials = _statements_with_action(_role_statements(role, "Deny"), "cloudfront:*")
    assert any(d["Resource"] == {"Ref": "ProtectedDistributionArn"} for d in denials)


@then('every Lambda layer in the stack is named with the prefix "{prefix}"')
def step_layers_named_with_prefix(context, prefix: str) -> None:
    resources = _synthesized_template(context)["Resources"]
    layers = [r for r in resources.values() if r["Type"] == "AWS::Lambda::LayerVersion"]
    assert layers
    for layer in layers:
        name = layer["Properties"].get("LayerName")
        assert isinstance(name, str) and name.startswith(prefix), name


@then(
    "the execution role allows layer actions only on layers named BabulusControlPlane"
)
def step_exec_role_layers_scoped(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    layer_statements = [
        s
        for s in _role_statements(role, "Allow")
        if any(a.startswith("lambda:") and "Layer" in a for a in _statement_actions(s))
    ]
    assert layer_statements
    for statement in layer_statements:
        for resource in _as_list(statement["Resource"]):
            assert ":layer:BabulusControlPlane-" in _text(resource), resource


@then(
    "the deploy role allows cloudformation:DeleteStack only on the BabulusControlPlane stack and only with the execution role"
)
def step_deploy_role_delete_stack(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    deletes = _statements_with_action(
        _role_statements(role, "Allow"), "cloudformation:DeleteStack"
    )
    assert len(deletes) == 1, deletes
    assert _text(deletes[0]["Resource"]).endswith(":stack/BabulusControlPlane/*")
    assert deletes[0]["Condition"]["StringEquals"] == {
        "cloudformation:RoleArn": {"Fn::GetAtt": ["ControlPlaneCfnExecRole", "Arn"]}
    }


@given("the control plane deploy workflow is read")
def step_read_workflow(context) -> None:
    path = Path(
        context.config.userdata.get("deploy_workflow", str(DEFAULT_DEPLOY_WORKFLOW))
    )
    context.deploy_workflow_text = path.read_text(encoding="utf-8")


@then("every mask command is printed with an immediate flush")
def step_masks_flushed(context) -> None:
    text = context.deploy_workflow_text
    mask_prints = [line for line in text.splitlines() if "::add-mask::" in line]
    assert mask_prints
    for line in mask_prints:
        assert "flush=True" in line, line


@then("the output is flushed before the CDK process starts")
def step_flush_before_cdk(context) -> None:
    text = context.deploy_workflow_text
    flush_at = text.find("sys.stdout.flush()")
    run_at = text.find("subprocess.run(command")
    assert 0 <= flush_at < run_at, (flush_at, run_at)


@then("only context values of at least 4 characters are masked")
def step_minimum_mask_length(context) -> None:
    text = context.deploy_workflow_text
    guard = re.search(r"if len\(line\.strip\(\)\) >= 4:", text)
    mask_at = text.find("::add-mask::")
    assert guard and guard.start() < mask_at


@then("every managed policy in the template fits the {limit:d} character limit")
def step_managed_policies_fit(context, limit: int) -> None:
    assert limit == MANAGED_POLICY_LIMIT
    for key, resource in _deploy_template(context).items():
        if resource["Type"] == "AWS::IAM::ManagedPolicy":
            size = _policy_size(resource["Properties"]["PolicyDocument"])
            assert size <= limit, (key, size)


@then("the inline policies of every role fit the {limit:d} character limit")
def step_inline_policies_fit(context, limit: int) -> None:
    assert limit == INLINE_POLICY_LIMIT
    for key, resource in _deploy_template(context).items():
        if resource["Type"] == "AWS::IAM::Role":
            size = sum(_policy_size(d) for d in _role_policy_documents(resource))
            assert size <= limit, (key, size)


@then(
    "the execution role attaches its resource policy under the name the role cannot change"
)
def step_exec_role_resource_policy(context) -> None:
    role = _role(context, "ControlPlaneCfnExecRole")
    assert {"Ref": "ControlPlaneCfnExecResources"} in role["Properties"][
        "ManagedPolicyArns"
    ]
    policy = _deploy_template(context)["ControlPlaneCfnExecResources"]
    name = policy["Properties"]["ManagedPolicyName"]
    assert name.startswith("babulus-control-plane-"), name
    denials = _statements_with_action(_role_statements(role, "Deny"), "iam:*")
    resources = [_text(r) for s in denials for r in _as_list(s["Resource"])]
    assert any(
        r.endswith(":policy/babulus-control-plane-*") for r in resources
    ), resources


@given("the deploy bootstrap script is read")
def step_read_apply_script(context) -> None:
    context.apply_script_path = Path(
        context.config.userdata.get("deploy_apply_script", str(DEFAULT_APPLY_SCRIPT))
    )
    context.apply_script_text = context.apply_script_path.read_text(encoding="utf-8")


@then("the script runs under bash and has valid bash syntax")
def step_script_is_bash(context) -> None:
    assert context.apply_script_text.startswith("#!/usr/bin/env bash\n")
    subprocess.run(["bash", "-n", str(context.apply_script_path)], check=True)


@then("no shell variable in the script is directly followed by a colon")
def step_script_no_variable_colon(context) -> None:
    found = re.findall(r"\$[A-Za-z_][A-Za-z0-9_]*:", context.apply_script_text)
    assert not found, found


@then("the script holds no twelve digit account id")
def step_script_no_account_id(context) -> None:
    assert not ACCOUNT_ID_PATTERN.search(context.apply_script_text)


@then(
    "the script stops unless the signed in account is the one named on the command line"
)
def step_script_checks_account(context) -> None:
    assert 'if [[ "${account}" != "${expected_account}" ]]' in context.apply_script_text


@then("the script selects the GitHub OIDC provider by name")
def step_script_selects_provider(context) -> None:
    assert "token.actions.githubusercontent.com" in context.apply_script_text
    assert "OpenIDConnectProviderList[0]" not in context.apply_script_text


@then("the script deletes the stack only from the ROLLBACK_COMPLETE state")
def step_script_delete_guard(context) -> None:
    text = context.apply_script_text
    guard = text.index('if [[ "${status}" == "ROLLBACK_COMPLETE" ]]')
    assert text.count("delete-stack") == 1
    assert guard < text.index("delete-stack") < text.index("\nfi", guard)


@given("the deploy context script is read")
def step_read_context_script(context) -> None:
    context.apply_script_path = DEFAULT_CONTEXT_SCRIPT
    context.apply_script_text = DEFAULT_CONTEXT_SCRIPT.read_text(encoding="utf-8")


@then("the script refuses a values file that still holds placeholders")
def step_context_script_refuses_placeholders(context) -> None:
    assert 'contains("<")' in context.apply_script_text


@then("the script writes a SecureString parameter")
def step_context_script_secure(context) -> None:
    assert "--type SecureString" in context.apply_script_text


@then("the example values file holds only placeholders")
def step_example_context_placeholders(context) -> None:
    values = json.loads(EXAMPLE_CONTEXT.read_text(encoding="utf-8"))
    assert values
    for key, value in values.items():
        assert value.startswith("<") and value.endswith(">"), key


@given("the new account setup guide is read")
def step_read_setup_guide(context) -> None:
    context.setup_guide_text = SETUP_GUIDE.read_text(encoding="utf-8")


@then("the guide names every stack under infra")
def step_guide_names_stacks(context) -> None:
    for template in (REPOSITORY_ROOT / "infra").glob("*/template.yml"):
        assert f"infra/{template.parent.name}" in context.setup_guide_text, template


@then("the guide names the deploy context script and the bootstrap script")
def step_guide_names_scripts(context) -> None:
    assert "write-deploy-context.sh" in context.setup_guide_text
    assert "bootstrap.sh" in context.setup_guide_text


@then("the README and AGENTS both link to the guide")
def step_readme_and_agents_link(context) -> None:
    for name in ("README.md", "AGENTS.md"):
        text = (REPOSITORY_ROOT / name).read_text(encoding="utf-8")
        assert "docs/new-account-setup.md" in text, name


@then("the script shows the change set and asks before applying")
def step_script_asks(context) -> None:
    text = context.apply_script_text
    assert text.index("create-change-set") < text.index("Type yes")
    assert text.index("Type yes") < text.index("execute-change-set")


@then("the script can show the change set without applying it")
def step_script_plan_only(context) -> None:
    text = context.apply_script_text
    assert "--plan-only" in text
    assert text.index(
        'if [[ -n "${plan_only}" ]]; then\n    aws cloudformation delete-change-set'
    ) < text.index("execute-change-set")


@then("the script checks that the deployed template matches main")
def step_script_verifies(context) -> None:
    assert "--template-stage Original" in context.apply_script_text


@then("a failed deploy names the bootstrap command and the setup guide")
def step_workflow_failure_notice(context) -> None:
    assert "if: failure()" in context.deploy_workflow_text
    assert "infra/control-plane-deploy/bootstrap.sh" in context.deploy_workflow_text
    assert "docs/new-account-setup.md" in context.deploy_workflow_text


@then("no policy in the template repeats a statement id")
def step_no_duplicate_sids(context) -> None:
    for key, resource in _deploy_template(context).items():
        properties = resource["Properties"]
        documents = (
            [properties["PolicyDocument"]] if "PolicyDocument" in properties else []
        )
        documents += _role_policy_documents(resource)
        for document in documents:
            ids = json.dumps(document)
            found = re.findall(r'"Sid": "([^"]+)"', ids)
            assert len(found) == len(set(found)), key


@then(
    "the workflow warns about out of date roles before it deploys and does not stop for it"
)
def step_workflow_warns_out_of_date(context) -> None:
    text = context.deploy_workflow_text
    warning = text.index("The deploy roles are out of date")
    assert warning < text.index("Deploy through the narrowed execution role")
    assert "::warning::" in text[warning - 40 : warning]
    check = text[text.index("Warn if the deploy roles are out of date") : warning]
    assert "check=True" not in check


@then("the deploy role can do nothing to its own roles stack but read its template")
def step_deploy_role_reads_own_template(context) -> None:
    role = _role(context, "ControlPlaneDeployRole")
    own_stack = [
        statement
        for statement in _role_statements(role, "Allow")
        if _text(statement["Resource"]).endswith(":stack/${AWS::StackName}/*")
    ]
    assert len(own_stack) == 1
    assert _statement_actions(own_stack[0]) == ["cloudformation:GetTemplate"]


@then(
    "the workflow deletes the stack only from ROLLBACK_COMPLETE and only through the execution role, before CDK runs"
)
def step_workflow_clears_failed_create(context) -> None:
    text = context.deploy_workflow_text
    guard = text.index('status.stdout.strip() == "ROLLBACK_COMPLETE"')
    delete = text.index('"delete-stack", *stack, "--role-arn", exec_role_arn')
    assert text.count("delete-stack") == 1
    assert guard < delete < text.index('"cdk", "deploy"')


@then("no resource in the stack is kept when its first create fails")
def step_no_resource_kept_on_failed_create(context) -> None:
    resources = context.synthesized_stack_template["Resources"]
    for key, resource in resources.items():
        assert resource.get("DeletionPolicy") != "Retain", key


@then(
    "the tables, the audio bucket and the worker image repository are kept when the stack is deleted"
)
def step_data_kept_on_delete(context) -> None:
    resources = context.synthesized_stack_template["Resources"].values()
    for kind in ("AWS::DynamoDB::Table", "AWS::S3::Bucket", "AWS::ECR::Repository"):
        found = [r for r in resources if r["Type"] == kind]
        assert found, kind
        for resource in found:
            assert resource["DeletionPolicy"] == "RetainExceptOnCreate", kind


@then("the execution role can delete what a failed first create made")
def step_exec_role_can_clean_up(context) -> None:
    text = json.dumps(_deploy_template(context))
    for action in (
        "dynamodb:DeleteTable",
        "s3:DeleteBucket",
        "ecr:DeleteRepository",
    ):
        assert f'"{action}"' in text, action
