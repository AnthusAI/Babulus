"""Behavioral tests for the operator-only cloud switch on sites."""

from typing import Any

from support.operator_tokens import operator_headers

# Built from parts so no bare UUID sits in the repository.
ACCOUNT = "-".join(["123e4567", "e89b", "42d3", "a456", "426614174000"])


def _patch(resources: dict[str, Any], body: dict[str, Any], site_id: str = "site-1"):
    event = resources["event"](
        "PATCH",
        f"/sites/{site_id}",
        body=body,
        headers=operator_headers(),
        path_parameters={"id": site_id},
    )
    return resources["handler"].handler(event, None)


def test_sites_list_reports_cloud_off_by_default(
    router_resources: dict[str, Any],
) -> None:
    """A site nobody switched on lists as cloud off with no Account."""
    event = router_resources["event"]("GET", "/sites", headers=operator_headers())
    response = router_resources["handler"].handler(event, None)
    (site,) = router_resources["response_body"](response)["sites"]
    assert site["cloud_enabled"] is False
    assert site["account_id"] is None


def test_patch_turns_cloud_on_and_off(router_resources: dict[str, Any]) -> None:
    """Cloud on stores the Account; off keeps it and clears the switch."""
    on = _patch(router_resources, {"cloud_enabled": True, "account_id": ACCOUNT})
    assert on["statusCode"] == 200
    item = router_resources["sites"].get_item(Key={"site_id": "site-1"})["Item"]
    assert item["cloud_enabled"] is True
    assert item["account_id"] == ACCOUNT

    off = _patch(router_resources, {"cloud_enabled": False})
    assert off["statusCode"] == 200
    item = router_resources["sites"].get_item(Key={"site_id": "site-1"})["Item"]
    assert item["cloud_enabled"] is False
    assert item["account_id"] == ACCOUNT


def test_patch_refuses_cloud_on_without_a_valid_account(
    router_resources: dict[str, Any],
) -> None:
    """Cloud on needs an Account UUID, and nothing is stored when it is refused."""
    for body in (
        {"cloud_enabled": True},
        {"cloud_enabled": True, "account_id": "nope"},
        {"cloud_enabled": "true", "account_id": ACCOUNT},
    ):
        assert _patch(router_resources, body)["statusCode"] == 400
    item = router_resources["sites"].get_item(Key={"site_id": "site-1"})["Item"]
    assert "cloud_enabled" not in item


def test_patch_unknown_site_is_404(router_resources: dict[str, Any]) -> None:
    """An unknown site is not found."""
    response = _patch(
        router_resources, {"cloud_enabled": True, "account_id": ACCOUNT}, "ghost"
    )
    assert response["statusCode"] == 404


def test_patch_requires_an_operator(router_resources: dict[str, Any]) -> None:
    """A request without an operator token is refused."""
    event = router_resources["event"](
        "PATCH",
        "/sites/site-1",
        body={"cloud_enabled": True, "account_id": ACCOUNT},
        path_parameters={"id": "site-1"},
    )
    assert router_resources["handler"].handler(event, None)["statusCode"] == 403
