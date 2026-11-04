"""Unit tests for the Prospectus quota client and the global spending ceiling.

Prospectus is a recorder and DynamoDB is moto; the network is blocked by the
suite's ``conftest.py``, so nothing here can reach a real service. All limits
are made-up numbers.
"""

from __future__ import annotations

import json
import os
import sys
import uuid
from decimal import Decimal
from typing import Any

import boto3
import pytest
from moto import mock_aws

LAYER = os.path.join(
    os.path.dirname(__file__), "..", "lambdas", "spend_guards_layer", "python"
)
if LAYER not in sys.path:
    sys.path.insert(0, LAYER)

import babulus_spend_guards as guards  # noqa: E402

ENDPOINT = "https://quota.test/prod"
NOW = 1_800_000_000


class Creds:
    access_key = "k"
    secret_key = "s"
    token = "t"

    def get_frozen_credentials(self) -> "Creds":
        return self


def client(responses: list[Any], calls: list[dict[str, Any]]) -> guards.ProspectusQuota:
    """A quota client whose transport plays back ``responses`` in order."""

    def transport(method: str, url: str, headers: dict[str, str], body: bytes):
        calls.append({"url": url, "headers": headers, "body": json.loads(body)})
        answer = responses[min(len(calls), len(responses)) - 1]
        if isinstance(answer, Exception):
            raise answer
        status, payload = answer
        return status, (
            payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        )

    return guards.ProspectusQuota(
        guards.QuotaConfig(ENDPOINT, "arn:aws:iam::111122223333:role/x"),
        transport=transport,
        credentials=lambda: Creds(),
        region="us-east-1",
        sleep=lambda _s: None,
    )


OP = str(uuid.uuid5(uuid.NAMESPACE_URL, "spec:reservation"))
ITEMS = [{"itemKind": "aws.batch.vcpu_seconds", "quantity": 100}]
RESERVED = (200, {"reservationId": OP, "accountId": "a", "status": "reserved"})


def test_reserve_posts_the_contract_body_signed_for_execute_api() -> None:
    calls: list[dict[str, Any]] = []
    assert client([RESERVED], calls).reserve("acct-1", OP, ITEMS, 2700) == OP
    (call,) = calls
    assert call["url"] == f"{ENDPOINT}/v1/quota/accounts/acct-1/reservations"
    assert call["body"] == {
        "operationId": OP,
        "items": ITEMS,
        "expiresInSeconds": 2700,
    }
    assert "/execute-api/aws4_request" in call["headers"]["Authorization"]


@pytest.mark.parametrize(
    ("answer", "reason"),
    [
        ((402, {"error": "quota_exhausted"}), "quota_exhausted"),
        ((402, {"error": "quota_insufficient"}), "quota_exhausted"),
        ((403, {"error": "caller_forbidden"}), "quota_forbidden"),
        ((404, {"error": "account_missing"}), "quota_forbidden"),
        ((400, {"error": "invalid_items"}), "quota_unavailable"),
        ((422, {"error": "unknown_item_kind"}), "quota_unavailable"),
        ((200, b"<html>"), "quota_unavailable"),
        ((200, {"status": "settled", "reservationId": OP}), "quota_unavailable"),
        ((200, {"status": "reserved"}), "quota_unavailable"),
        ((200, {"status": "reserved", "reservationId": "../x"}), "quota_unavailable"),
    ],
)
def test_anything_but_a_clean_reserved_answer_is_a_refusal(
    answer: Any, reason: str
) -> None:
    with pytest.raises(guards.GuardRefusal) as refusal:
        client([answer], []).reserve("acct-1", OP, ITEMS, 2700)
    assert refusal.value.reason == reason


def test_a_reservation_id_that_is_not_the_operation_id_is_refused() -> None:
    other = (200, {"reservationId": "someone-else", "status": "reserved"})
    with pytest.raises(guards.GuardRefusal):
        client([other], []).reserve("acct-1", OP, ITEMS, 2700)


def test_an_uncertain_outcome_is_repeated_with_the_same_id_and_body() -> None:
    calls: list[dict[str, Any]] = []
    answers = [
        ConnectionError("reset"),
        (503, {"error": "quota_unavailable"}),
        RESERVED,
    ]
    assert client(answers, calls).reserve("acct-1", OP, ITEMS, 2700) == OP
    assert len(calls) == 3
    assert len({json.dumps(c["body"], sort_keys=True) for c in calls}) == 1


def test_busy_is_repeated_but_other_conflicts_are_not() -> None:
    calls: list[dict[str, Any]] = []
    busy = [(409, {"error": "busy"}), RESERVED]
    assert client(busy, calls).reserve("acct-1", OP, ITEMS, 2700) == OP
    calls.clear()
    with pytest.raises(guards.GuardRefusal):
        client([(409, {"error": "idempotency_conflict"})], calls).reserve(
            "acct-1", OP, ITEMS, 2700
        )
    assert len(calls) == 1


def test_giving_up_after_the_retry_limit() -> None:
    calls: list[dict[str, Any]] = []
    with pytest.raises(guards.GuardRefusal) as refusal:
        client([ConnectionError("down")], calls).reserve("acct-1", OP, ITEMS, 2700)
    assert refusal.value.reason == "quota_unavailable"
    assert len(calls) == guards.MAX_QUOTA_TRIES


@pytest.mark.parametrize("account", ["", "a/b", "../x", "a b", None, "x" * 65])
def test_an_account_that_could_change_the_path_is_refused(account: Any) -> None:
    calls: list[dict[str, Any]] = []
    with pytest.raises(guards.GuardRefusal):
        client([RESERVED], calls).reserve(account, OP, ITEMS, 2700)
    assert calls == []


def test_settle_and_release_use_their_own_routes_and_statuses() -> None:
    calls: list[dict[str, Any]] = []
    settled = (200, {"reservationId": OP, "accountId": "a", "status": "settled"})
    client([settled], calls).settle("acct-1", OP, "op-2", ITEMS)
    assert calls[0]["url"].endswith(f"/reservations/{OP}/settle")
    assert calls[0]["body"] == {"operationId": "op-2", "items": ITEMS}
    released = (200, {"reservationId": OP, "accountId": "a", "status": "released"})
    client([released], calls).release("acct-1", OP, "op-3")
    assert calls[1]["url"].endswith(f"/reservations/{OP}/release")
    assert calls[1]["body"] == {"operationId": "op-3"}


@pytest.mark.parametrize(
    "endpoint", ["", "http://quota.test/prod", "quota.test", "https://"]
)
def test_a_missing_or_insecure_endpoint_fails_closed(
    monkeypatch: pytest.MonkeyPatch, endpoint: str
) -> None:
    monkeypatch.setenv("PROSPECTUS_QUOTA_ENDPOINT", endpoint)
    monkeypatch.setenv("PROSPECTUS_CALLER_ROLE_ARN", "arn:aws:iam::1:role/x")
    with pytest.raises(guards.GuardRefusal) as refusal:
        guards.QuotaConfig.from_environment()
    assert refusal.value.reason == "guards_not_configured"


def test_a_missing_role_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PROSPECTUS_QUOTA_ENDPOINT", ENDPOINT)
    monkeypatch.delenv("PROSPECTUS_CALLER_ROLE_ARN", raising=False)
    with pytest.raises(guards.GuardRefusal):
        guards.QuotaConfig.from_environment()


def test_the_signing_region_comes_from_the_endpoint() -> None:
    config = guards.QuotaConfig(
        "https://abc.execute-api.eu-west-2.amazonaws.com/prod", "arn"
    )
    assert config.region == "eu-west-2"


@pytest.mark.parametrize("bad", ["", "abc", "0", "-1", "nan", "inf"])
def test_ceiling_limits_have_no_defaults_and_reject_nonsense(
    monkeypatch: pytest.MonkeyPatch, bad: str
) -> None:
    for name in (
        "SPEND_CEILING_PER_ATTEMPT",
        "SPEND_CEILING_PER_DAY",
        "SPEND_CEILING_PER_MONTH",
        "SPEND_ESTIMATE_RATE_PER_VCPU_SECOND",
    ):
        monkeypatch.setenv(name, "5")
    monkeypatch.setenv("SPEND_CEILING_PER_DAY", bad)
    with pytest.raises(guards.GuardRefusal):
        guards.CeilingLimits.from_environment()


@pytest.fixture
def ceiling():
    limits = guards.CeilingLimits(
        per_attempt=Decimal(10),
        per_day=Decimal(25),
        per_month=Decimal(60),
        rate_per_vcpu_second=Decimal("0.001"),
    )
    with mock_aws():
        low = boto3.client("dynamodb", region_name="us-east-1")
        low.create_table(
            TableName="ceiling",
            KeySchema=[{"AttributeName": "ledger_key", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "ledger_key", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        table = boto3.resource("dynamodb", region_name="us-east-1").Table("ceiling")
        yield guards.SpendCeiling(table, low, limits), table


def test_one_concurrent_slot(ceiling) -> None:
    spend, _table = ceiling
    spend.acquire("lease-1", Decimal(3), NOW, 3600)
    with pytest.raises(guards.GuardRefusal) as refusal:
        spend.acquire("lease-2", Decimal(3), NOW, 3600)
    assert refusal.value.reason == "ceiling_reached"
    spend.finish("lease-1", ran=True)
    spend.acquire("lease-2", Decimal(3), NOW, 3600)


def test_an_abandoned_slot_frees_itself_after_its_lease_expires(ceiling) -> None:
    spend, _table = ceiling
    spend.acquire("lease-1", Decimal(3), NOW, 3600)
    spend.acquire("lease-2", Decimal(3), NOW + 3601, 3600)


def test_repeating_the_same_lease_is_a_no_op(ceiling) -> None:
    spend, table = ceiling
    spend.acquire("lease-1", Decimal(3), NOW, 3600)
    spend.acquire("lease-1", Decimal(3), NOW, 3600)
    day = [i for i in table.scan()["Items"] if i["ledger_key"].startswith("day#")]
    assert day[0]["spent"] == 3


def test_per_attempt_day_and_month_limits(ceiling) -> None:
    spend, table = ceiling
    with pytest.raises(guards.GuardRefusal):
        spend.acquire("big", Decimal(11), NOW, 3600)  # over the per-attempt limit
    for index in range(2):  # 2 x 10 = 20 of the day's 25
        spend.acquire(f"l{index}", Decimal(10), NOW, 3600)
        spend.finish(f"l{index}", ran=True)
    with pytest.raises(guards.GuardRefusal):
        spend.acquire("l3", Decimal(6), NOW, 3600)  # 20 + 6 > 25
    spend.acquire("l4", Decimal(5), NOW, 3600)  # exactly fills the day
    spend.finish("l4", ran=True)
    # Next day, same month: 25 used of 60.
    later = NOW + 86_400
    for index in range(2):
        spend.acquire(f"m{index}", Decimal(10), later, 3600)
        spend.finish(f"m{index}", ran=True)
    with pytest.raises(guards.GuardRefusal):
        spend.acquire(
            "m3", Decimal(10), later, 3600
        )  # month: 45 + 10 < 60 but day full
    assert {i["ledger_key"] for i in table.scan()["Items"]} >= {"slot"}


def test_nothing_ran_gives_the_amount_back_and_ran_keeps_it(ceiling) -> None:
    spend, table = ceiling

    def spent() -> Decimal:
        rows = [i for i in table.scan()["Items"] if i["ledger_key"].startswith("day#")]
        return rows[0]["spent"]

    spend.acquire("a", Decimal(4), NOW, 3600)
    spend.finish("a", ran=False)
    assert spent() == 0
    spend.acquire("b", Decimal(4), NOW, 3600)
    spend.finish("b", ran=True)
    assert spent() == 4
    spend.finish("b", ran=False)  # already finished: nothing changes
    assert spent() == 4


def test_a_ceiling_that_cannot_be_checked_is_a_refusal() -> None:
    limits = guards.CeilingLimits(
        Decimal(10), Decimal(25), Decimal(60), Decimal("0.001")
    )
    with mock_aws():
        low = boto3.client("dynamodb", region_name="us-east-1")
        table = boto3.resource("dynamodb", region_name="us-east-1").Table("missing")
        with pytest.raises(guards.GuardRefusal) as refusal:
            guards.SpendCeiling(table, low, limits).acquire("x", Decimal(1), NOW, 60)
    assert refusal.value.reason == "ceiling_unavailable"


def test_the_estimate_is_the_rate_times_the_most_the_job_can_run() -> None:
    limits = guards.CeilingLimits(
        Decimal(10), Decimal(25), Decimal(60), Decimal("0.001")
    )
    assert limits.estimate(3600) == Decimal("3.6")
