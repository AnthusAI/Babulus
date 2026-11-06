"""Steps that check the synthesized control plane stack's names and sign-in."""

from __future__ import annotations

import json
import subprocess
import sys

from behave import given, then
from support.fallback_machine import CONTROL_PLANE

SYNTHESIZE_APP_SCRIPT = (
    "import json, sys\n"
    "sys.path.insert(0, sys.argv[1])\n"
    "import app as control_plane_app\n"
    "assembly = control_plane_app.app.synth()\n"
    "print(json.dumps([\n"
    "    {'name': s.stack_name, 'template': s.template} for s in assembly.stacks\n"
    "]))\n"
)


@given("the control plane app is synthesized")
def step_synthesize_app(context) -> None:
    completed = subprocess.run(
        [sys.executable, "-c", SYNTHESIZE_APP_SCRIPT, str(CONTROL_PLANE)],
        capture_output=True,
        text=True,
        check=True,
        cwd=str(CONTROL_PLANE),
    )
    context.synthesized_stacks = json.loads(completed.stdout.strip().splitlines()[-1])


def _only_stack(context) -> dict:
    stacks = context.synthesized_stacks
    assert len(stacks) == 1, [stack["name"] for stack in stacks]
    return stacks[0]


def _resources_of(context, resource_type: str) -> list:
    resources = _only_stack(context)["template"]["Resources"].values()
    return [r for r in resources if r["Type"] == resource_type]


@then('the stack is named "{name}"')
def step_stack_name(context, name: str) -> None:
    assert _only_stack(context)["name"] == name, _only_stack(context)["name"]


@then('the worker image repository is named "{name}"')
def step_repository_name(context, name: str) -> None:
    repositories = _resources_of(context, "AWS::ECR::Repository")
    names = [r["Properties"]["RepositoryName"] for r in repositories]
    assert names == [name], names


@then("no logical resource id contains the old product name")
def step_no_old_name(context) -> None:
    resources = _only_stack(context)["template"]["Resources"]
    offenders = [key for key in resources if "auritus" in key.lower()]
    assert not offenders, offenders


@then("no Cognito app client allows USER_PASSWORD_AUTH")
def step_no_password(context) -> None:
    clients = _resources_of(context, "AWS::Cognito::UserPoolClient")
    assert clients
    for client in clients:
        flows = client["Properties"].get("ExplicitAuthFlows") or []
        assert "ALLOW_USER_PASSWORD_AUTH" not in flows, flows


@then("every Cognito app client allows SRP sign-in")
def step_srp(context) -> None:
    for client in _resources_of(context, "AWS::Cognito::UserPoolClient"):
        assert "ALLOW_USER_SRP_AUTH" in client["Properties"]["ExplicitAuthFlows"]


@then("every Cognito app client lists Google as its only sign-in provider")
def step_google_only(context) -> None:
    clients = _resources_of(context, "AWS::Cognito::UserPoolClient")
    assert clients
    for client in clients:
        providers = client["Properties"]["SupportedIdentityProviders"]
        assert providers == ["Google"], providers


@then('the route "{route_key}" requires the operator authorizer')
def step_route_authorized(context, route_key: str) -> None:
    routes = [
        r
        for r in _resources_of(context, "AWS::ApiGatewayV2::Route")
        if r["Properties"]["RouteKey"] == route_key
    ]
    assert len(routes) == 1, route_key
    assert routes[0]["Properties"]["AuthorizationType"] == "CUSTOM", route_key


@then("the API allows the PATCH method from a browser")
def step_cors_patch(context) -> None:
    apis = _resources_of(context, "AWS::ApiGatewayV2::Api")
    assert apis
    assert "PATCH" in apis[0]["Properties"]["CorsConfiguration"]["AllowMethods"]
