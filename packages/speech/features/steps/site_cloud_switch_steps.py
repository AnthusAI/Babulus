"""Steps for the operator-only cloud switch on sites."""

from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

from behave import given, then, when
from support.operator_tokens import operator_access_token, operator_headers
from support.router_harness import LAMBDAS_PATH, start_router


def _account(name: str, upper: bool = False) -> str:
    """Return a stable Account UUID for a name, so no UUID is written in a spec."""
    account = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{name}.accounts.invalid"))
    return account.upper() if upper else account


def _router(context):
    if not hasattr(context, "cloud_router"):
        context.cloud_router = start_router(context)
    return context.cloud_router


def _put_site(context, name: str, **fields) -> None:
    _router(context).sites_table.put_item(
        Item={
            "site_id": f"site-{name}",
            "site_key": f"key-{name}",
            "label": name,
            "disabled": False,
            "created_at": "2026-11-01T00:00:00Z",
            **fields,
        }
    )


def _site(context, name: str) -> dict:
    return _router(context).sites_table.get_item(Key={"site_id": f"site-{name}"})[
        "Item"
    ]


def _patch(context, name: str, body, headers=None) -> None:
    context.cloud_response = _router(context).call(
        "PATCH",
        f"/sites/site-{name}",
        headers=operator_headers() if headers is None else headers,
        raw_body=body if isinstance(body, str) else json.dumps(body),
        path_parameters={"id": f"site-{name}"},
    )


@given('a site "{name}" exists')
def step_site_exists(context, name: str) -> None:
    _put_site(context, name)


@given('a site "{name}" with cloud on for the valid Account "{account}"')
def step_site_cloud_on(context, name: str, account: str) -> None:
    _put_site(context, name, cloud_enabled=True, account_id=_account(account))


@when("an operator lists the sites")
def step_list_sites(context) -> None:
    context.cloud_response = _router(context).call(
        "GET", "/sites", headers=operator_headers()
    )


@when('an operator turns cloud on for "{name}" with the valid Account "{account}"')
def step_turn_on(context, name: str, account: str) -> None:
    _patch(context, name, {"cloud_enabled": True, "account_id": _account(account)})


@when(
    'an operator turns cloud on for "{name}" with the valid Account "{account}" in upper case'
)
def step_turn_on_upper(context, name: str, account: str) -> None:
    body = {"cloud_enabled": True, "account_id": _account(account, upper=True)}
    _patch(context, name, body)


@when('an operator turns cloud on for "{name}" with the Account "{account}"')
def step_turn_on_raw(context, name: str, account: str) -> None:
    _patch(context, name, {"cloud_enabled": True, "account_id": account})


@when('an operator turns cloud on for "{name}" with the Account {account}')
def step_turn_on_odd(context, name: str, account: str) -> None:
    body: dict = {"cloud_enabled": True}
    if account == "missing":
        pass
    elif account == "a number":
        body["account_id"] = 12345
    else:
        body["account_id"] = json.loads(account)
    _patch(context, name, body)


@when('an operator turns cloud off for "{name}" without an Account')
def step_turn_off(context, name: str) -> None:
    _patch(context, name, {"cloud_enabled": False})


@when('an operator turns cloud off for "{name}" with the Account "{account}"')
def step_turn_off_with(context, name: str, account: str) -> None:
    _patch(context, name, {"cloud_enabled": False, "account_id": account})


@when('an operator sends the body {body} to change "{name}"')
def step_send_body(context, body: str, name: str) -> None:
    _patch(context, name, body.replace("<billing>", _account("billing")))


@when(
    'someone with no token turns cloud on for "{name}" with the valid Account "{account}"'
)
def step_no_token(context, name: str, account: str) -> None:
    body = {"cloud_enabled": True, "account_id": _account(account)}
    _patch(context, name, body, headers={})


@when(
    'a user outside the operators group turns cloud on for "{name}" with the valid Account "{account}"'
)
def step_not_operator(context, name: str, account: str) -> None:
    token = operator_access_token(groups=())
    _patch(
        context,
        name,
        {"cloud_enabled": True, "account_id": _account(account)},
        headers={"authorization": f"Bearer {token}"},
    )


@then("the response is {status:d}")
def step_response_status(context, status: int) -> None:
    assert context.cloud_response["statusCode"] == status, context.cloud_response


def _listed(context, name: str) -> dict:
    sites = json.loads(context.cloud_response["body"])["sites"]
    (row,) = [s for s in sites if s["site_id"] == f"site-{name}"]
    return row


@then('the site "{name}" shows cloud off and no Account')
def step_listed_off(context, name: str) -> None:
    row = _listed(context, name)
    assert row["cloud_enabled"] is False
    assert row["account_id"] is None


@then('the site "{name}" is still cloud off with no Account')
def step_stored_off(context, name: str) -> None:
    item = _site(context, name)
    assert item.get("cloud_enabled") is not True
    assert item.get("account_id") is None


@then('the site "{name}" is stored with cloud on and the valid Account "{account}"')
def step_stored_on(context, name: str, account: str) -> None:
    item = _site(context, name)
    assert item["cloud_enabled"] is True
    assert item["account_id"] == _account(account)


@then('the site "{name}" is stored with cloud off and the valid Account "{account}"')
def step_stored_off_with_account(context, name: str, account: str) -> None:
    item = _site(context, name)
    assert item["cloud_enabled"] is False
    assert item["account_id"] == _account(account)


@then(
    'listing the sites shows "{name}" with cloud on and the valid Account "{account}"'
)
def step_listing_shows(context, name: str, account: str) -> None:
    step_list_sites(context)
    row = _listed(context, name)
    assert row["cloud_enabled"] is True
    assert row["account_id"] == _account(account)


@then('the fallback gate accepts the Account stored for "{name}"')
def step_gate_accepts(context, name: str) -> None:
    layer = str(LAMBDAS_PATH / "spend_guards_layer" / "python")
    if layer not in sys.path:
        sys.path.insert(0, layer)
    from babulus_spend_guards import valid_account_id

    account = _site(context, name)["account_id"]
    assert valid_account_id(account) == account
    assert Path(layer).is_dir()
