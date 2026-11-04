"""Steps for the cloud spending guards. Every paid service is a stand-in."""

from __future__ import annotations

import os
from decimal import Decimal
from unittest.mock import Mock

from behave import given, then, when
from support.operator_tokens import operator_headers
from support.spend_guards import SITE_ID, load_budget_guard

CONTENT_HASH = "fenced-job-hash"
MONEY_WORDS = ("usd", "dollar", "cost", "price", "rate", "amount")


def _jobs(context):
    return context.fencing_router.jobs_table


def _job(context) -> dict:
    return _jobs(context).get_item(Key={"content_hash": CONTENT_HASH})["Item"]


def _ledger(context) -> dict:
    items = context.guards.ceiling_table.scan()["Items"]
    return {item["ledger_key"]: item for item in items}


def _spent(context) -> Decimal:
    ledger = _ledger(context)
    day = [item for key, item in ledger.items() if key.startswith("day#")]
    return sum((item.get("spent", Decimal(0)) for item in day), Decimal(0))


# -- Given: how the guards are set -------------------------------------------


@given("Prospectus answers the way it does when {situation}")
def step_prospectus_mode(context, situation: str) -> None:
    modes = {
        "the account's quota is empty": "empty",
        "it cannot be reached": "unreachable",
        "its service is down": "down",
        "it sends back something unreadable": "garbage",
        "it sends back an answer nobody expects": "unexpected",
    }
    context.guards.prospectus.mode = modes[situation]


@given("the account has cloud rendering turned off")
def step_cloud_off(context) -> None:
    context.fencing_router.sites_table.update_item(
        Key={"site_id": SITE_ID},
        UpdateExpression="SET cloud_enabled = :off",
        ExpressionAttributeValues={":off": False},
    )


@given("the deployment has no {setting}")
def step_missing_setting(context, setting: str) -> None:
    names = {
        "Prospectus endpoint": "PROSPECTUS_QUOTA_ENDPOINT",
        "Prospectus caller role": "PROSPECTUS_CALLER_ROLE_ARN",
        "per-attempt ceiling": "SPEND_CEILING_PER_ATTEMPT",
        "daily ceiling": "SPEND_CEILING_PER_DAY",
        "monthly ceiling": "SPEND_CEILING_PER_MONTH",
        "ceiling estimate rate": "SPEND_ESTIMATE_RATE_PER_VCPU_SECOND",
        "budget guard": "BUDGET_GUARD_CONFIGURED",
    }
    os.environ.pop(names[setting], None)


@given("the per-attempt ceiling is smaller than one attempt")
def step_small_attempt(context) -> None:
    os.environ["SPEND_CEILING_PER_ATTEMPT"] = "1"


@given("the day's ceiling is already used up")
def step_day_full(context) -> None:
    today = context.guards.module.time.strftime(
        "%Y-%m-%d", context.guards.module.time.gmtime(context.clock.now)
    )
    context.guards.ceiling_table.put_item(
        Item={"ledger_key": f"day#{today}", "spent": Decimal("24")}
    )


@given("the month's ceiling is already used up")
def step_month_full(context) -> None:
    month = context.guards.module.time.strftime(
        "%Y-%m", context.guards.module.time.gmtime(context.clock.now)
    )
    context.guards.ceiling_table.put_item(
        Item={"ledger_key": f"month#{month}", "spent": Decimal("59")}
    )


@given("another cloud job already holds the one concurrent slot")
def step_slot_taken(context) -> None:
    context.guards.ceiling_table.put_item(
        Item={
            "ledger_key": "slot",
            "holder": "someone-else",
            "holder_expires": Decimal(context.clock.now + 3600),
        }
    )


@given("the kill switch is on")
def step_kill_switch(context) -> None:
    context.guards.batch.describe_job_queues.return_value = {
        "jobQueues": [{"state": "DISABLED"}]
    }


@given("the kill switch cannot be read")
def step_kill_switch_unreadable(context) -> None:
    context.guards.batch.describe_job_queues.side_effect = RuntimeError("no answer")


@given("the cloud has already tried the job {count:d} times")
def step_already_tried(context, count: int) -> None:
    _jobs(context).update_item(
        Key={"content_hash": CONTENT_HASH},
        UpdateExpression="SET cloud_attempts = :n",
        ExpressionAttributeValues={":n": count},
    )


@given("a pending video job with a fallback timer")
def step_pending_video(context) -> None:
    _jobs(context).update_item(
        Key={"content_hash": CONTENT_HASH},
        UpdateExpression="SET kind = :video",
        ExpressionAttributeValues={":video": "video"},
    )


# -- When --------------------------------------------------------------------


@when("the Batch job ends after {seconds:d} seconds of running")
def step_batch_ends(context, seconds: int) -> None:
    started = 1_800_000_000_000
    context.finish_result = context.finisher.handler(
        _batch_event(context, "SUCCEEDED", started, started + seconds * 1000), None
    )


@when("the Batch job ends without ever starting")
def step_batch_never_started(context) -> None:
    context.finish_result = context.finisher.handler(
        _batch_event(context, "FAILED", None, None), None
    )


@when("the Batch job ends but Prospectus cannot be reached")
def step_batch_end_unreachable(context) -> None:
    context.guards.prospectus.mode = "unreachable"
    started = 1_800_000_000_000
    context.finish_error = None
    try:
        context.finisher.handler(
            _batch_event(context, "SUCCEEDED", started, started + 600_000), None
        )
    except Exception as exc:  # noqa: BLE001 - the refusal is what we assert
        context.finish_error = exc


def _batch_event(context, status: str, started, stopped) -> dict:
    detail = {
        "status": status,
        "jobName": f"auritus-{CONTENT_HASH}",
        "jobQueue": "arn:aws:batch:us-east-1:111122223333:job-queue/spec-queue",
    }
    if started is not None:
        detail["startedAt"] = started
        detail["stoppedAt"] = stopped
    return {"source": "aws.batch", "detail": detail}


@when("an unauthenticated caller creates a speech job")
def step_unauth_create(context) -> None:
    context.create_response = context.fencing_router.call(
        "POST", "/jobs", body={"text": "Hello world.", "tts_backend": "kokoro"}
    )


@when("a caller with an unknown site key creates a speech job")
def step_bad_key_create(context) -> None:
    context.create_response = context.fencing_router.call(
        "POST",
        "/jobs",
        headers={"x-auritus-site-key": "not-a-real-key"},
        body={"text": "Hello world.", "tts_backend": "kokoro"},
    )


@when("an unauthenticated caller creates a video job")
def step_unauth_video(context) -> None:
    context.create_response = context.fencing_router.call(
        "POST",
        "/jobs",
        body={"kind": "video", "script": "intro", "timeline": {}},
    )


@when("an operator creates a speech job without a site key")
def step_operator_no_site(context) -> None:
    context.create_response = context.fencing_router.call(
        "POST",
        "/jobs",
        headers=operator_headers(),
        body={"text": "Hello world.", "tts_backend": "kokoro"},
    )


@when("the budget alert fires")
def step_budget_alert(context) -> None:
    guard = load_budget_guard()
    queues = {"spec-queue": "ENABLED", "spec-cpu-queue": "ENABLED"}
    batch = Mock()
    batch.describe_job_queues.side_effect = lambda jobQueues: {
        "jobQueues": [{"jobQueueArn": f"arn:spec:{jobQueues[0]}"}]
    }

    def update(jobQueue: str, state: str) -> dict:
        queues[jobQueue.removeprefix("arn:spec:")] = state
        return {}

    batch.update_job_queue.side_effect = update
    guard._batch = batch
    guard.QUEUE_NAMES = "spec-queue,spec-cpu-queue"
    guard.handler({"Records": []}, None)
    context.queue_states = queues
    # The gate reads the same queue the budget just switched off.
    context.guards.batch.describe_job_queues.return_value = {
        "jobQueues": [{"state": queues["spec-queue"]}]
    }


# -- Then --------------------------------------------------------------------


@then("Prospectus received no requests")
def step_no_prospectus(context) -> None:
    assert context.guards.prospectus.calls == [], context.guards.prospectus.calls


@then("Prospectus received {count:d} reservation request")
@then("Prospectus received {count:d} reservation requests")
def step_reservation_count(context, count: int) -> None:
    calls = context.guards.prospectus.routes("/reservations")
    assert len(calls) == count, context.guards.prospectus.calls


@then("every reservation request was repeated with the same operation ID")
def step_same_operation(context) -> None:
    calls = context.guards.prospectus.routes("/reservations")
    assert len(calls) > 1, "the uncertain outcome was never retried"
    assert len({call["body"]["operationId"] for call in calls}) == 1, calls
    assert len({str(call["body"]) for call in calls}) == 1, calls


@then("the reservation was released")
def step_reservation_released(context) -> None:
    reservations = context.guards.prospectus.reservations
    assert reservations, "nothing was reserved"
    assert all(r["state"] == "released" for r in reservations.values()), reservations


@then("the reservation was settled for {quantity:d} vCPU seconds")
def step_reservation_settled(context, quantity: int) -> None:
    settles = context.guards.prospectus.routes("/settle")
    assert len(settles) == 1, context.guards.prospectus.calls
    assert settles[0]["body"]["items"] == [
        {"itemKind": "aws.batch.vcpu_seconds", "quantity": quantity}
    ], settles
    reservations = context.guards.prospectus.reservations
    assert [r["state"] for r in reservations.values()] == ["settled"], reservations


@then("the reservation was for the job's maximum {quantity:d} vCPU seconds")
def step_reserved_maximum(context, quantity: int) -> None:
    reserve = context.guards.prospectus.routes("/reservations")[0]["body"]
    assert reserve["items"] == [
        {"itemKind": "aws.batch.vcpu_seconds", "quantity": quantity}
    ], reserve
    assert reserve["expiresInSeconds"] > 1800, reserve


@then("the reservation request was signed for execute-api")
def step_signed(context) -> None:
    call = context.guards.prospectus.routes("/reservations")[0]
    authorization = call["headers"].get("Authorization", "")
    assert authorization.startswith("AWS4-HMAC-SHA256"), authorization
    assert "/execute-api/aws4_request" in authorization, authorization


@then('the job is waiting for a local worker because "{reason}"')
def step_waiting_reason(context, reason: str) -> None:
    item = _job(context)
    assert item["status"] == "pending", item
    assert item["waiting_reason"] == reason, item
    assert context.timer_result.data["gate"]["decision"] == "stop", context.timer_result
    message = context.fencing_router.router._waiting_message(item)
    assert message and message.startswith("Waiting for a local worker"), message


@then("the job record holds no reservation")
def step_no_reservation(context) -> None:
    item = _job(context)
    assert "quota_reservation_id" not in item, item
    assert "ceiling_lease" not in item, item


@then("the ceiling holds nothing for the job")
def step_ceiling_empty(context) -> None:
    ledger = _ledger(context)
    assert not [key for key in ledger if key.startswith("lease#")], ledger
    slot = ledger.get("slot", {})
    assert "holder" not in slot or slot["holder"] == "someone-else", slot
    assert _spent(context) in (Decimal(0), Decimal(24)), ledger


@then("the ceiling slot is free")
def step_slot_free(context) -> None:
    slot = _ledger(context).get("slot", {})
    assert "holder" not in slot, slot


@then("the ceiling slot is held by the cloud job")
def step_slot_held(context) -> None:
    slot = _ledger(context).get("slot", {})
    assert slot.get("holder") == _job(context)["ceiling_lease"], slot


@then("the day's ceiling count is back to zero")
def step_day_zero(context) -> None:
    assert _spent(context) == 0, _ledger(context)


@then("the day's ceiling count is for one attempt")
def step_day_one_attempt(context) -> None:
    assert _spent(context) == Decimal("3.6"), _ledger(context)


@then("the job record shows its reservation as {state}")
def step_record_state(context, state: str) -> None:
    assert _job(context)["quota_state"] == state, _job(context)


@then("the job has been tried by the cloud {count:d} time")
@then("the job has been tried by the cloud {count:d} times")
def step_attempts(context, count: int) -> None:
    assert int(_job(context).get("cloud_attempts", 0)) == count, _job(context)


@then("nothing the customer can read mentions money")
def step_no_money(context) -> None:
    item = _job(context)
    fields = [
        key
        for key in item
        if (
            key.startswith("quota_")
            or key.startswith("ceiling_")
            or key == "waiting_reason"
        )
    ]
    for key in fields:
        assert not any(word in key for word in MONEY_WORDS), key
        assert (
            not isinstance(item[key], (int, float, Decimal)) or key == "cloud_attempts"
        )
    for call in context.guards.prospectus.calls:
        assert set(call["body"]) <= {"operationId", "items", "expiresInSeconds"}, call
        for line in call["body"].get("items", []):
            assert set(line) == {"itemKind", "quantity"}, line
    from_router = context.fencing_router.router
    message = from_router._waiting_message(item) or ""
    assert "$" not in message and "usd" not in message.lower(), message


@then('the request is refused with "{error}"')
def step_refused_with(context, error: str) -> None:
    body = context.fencing_router.router.json.loads(context.create_response["body"])
    assert context.create_response["statusCode"] == 403, context.create_response
    assert body["error"] == error, body


@then("the request is refused")
def step_refused(context) -> None:
    assert context.create_response["statusCode"] == 403, context.create_response


@then("no timer was armed by the request")
def step_no_timer(context) -> None:
    assert not context.fencing_router.router._sfn.start_execution.called
    assert _jobs(context).scan()["Items"] == []


@then("the Batch queues are both disabled")
def step_queues_disabled(context) -> None:
    assert context.queue_states == {
        "spec-queue": "DISABLED",
        "spec-cpu-queue": "DISABLED",
    }, context.queue_states


@then("finishing failed and the reservation is still open")
def step_finish_failed(context) -> None:
    assert context.finish_error is not None
    assert _job(context)["quota_state"] == "reserved", _job(context)


@then("the timer ends without a Batch job and the job waits for a local worker")
def step_no_compute_end(context) -> None:
    assert context.batch_submissions == []
    assert context.timer_result.outcome.endswith(
        ":FallbackNotNeeded"
    ), context.timer_result
