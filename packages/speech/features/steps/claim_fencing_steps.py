"""Steps for claim fencing and the fallback gate, with all AWS mocked."""

from __future__ import annotations

import importlib.util
import time as real_time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

from behave import given, then, when
from botocore.exceptions import ClientError
from support.fallback_machine import (
    FakeClock,
    run_machine,
    synthesize_fallback_definition,
)
from support.operator_tokens import operator_headers
from support.router_harness import RouterHarness, start_router

GATE_PATH = (
    Path(__file__).resolve().parents[4]
    / "packages"
    / "control-plane"
    / "lambdas"
    / "fallback_gate"
    / "handler.py"
)
CONTENT_HASH = "fenced-job-hash"
SITE_KEY = "fencing-site-key"
JOB_TOKEN = "job-token-attempt-1"


def _fake_time(clock: FakeClock) -> SimpleNamespace:
    return SimpleNamespace(
        time=clock.time, strftime=real_time.strftime, gmtime=real_time.gmtime
    )


def _body(response: dict) -> dict:
    import json

    return json.loads(response["body"])


def _call(context, method: str, path: str, body: dict | None = None) -> dict:
    return context.fencing_router.call(
        method,
        path,
        headers=operator_headers(),
        body=body,
        path_parameters={"hash": CONTENT_HASH},
    )


def _item(context) -> dict:
    return context.fencing_router.jobs_table.get_item(
        Key={"content_hash": CONTENT_HASH}
    )["Item"]


@given("a router with a fake clock and a fallback gate")
def step_router(context) -> None:
    router: RouterHarness = start_router(context)
    clock = FakeClock()
    router.router.time = _fake_time(clock)
    spec = importlib.util.spec_from_file_location("fallback_gate_handler", GATE_PATH)
    gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gate)
    gate.time = _fake_time(clock)
    context.fencing_router = router
    context.clock = clock
    context.gate = gate
    context.gate_available = True
    context.batch_submissions = []
    context.batch_behaviour = None
    context.tokens = {}
    context.timer_result = None
    context.definition = synthesize_fallback_definition()


@given("a pending job with a fallback timer")
def step_pending_job(context) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    context.fencing_router.jobs_table.put_item(
        Item={
            "content_hash": CONTENT_HASH,
            "status": "pending",
            "text": "Fenced narration.",
            "voice_id": "af_heart",
            "tts_backend": "kokoro",
            "site_id": "site-fencing",
            "job_token": JOB_TOKEN,
            "created_at": now,
            "updated_at": now,
        }
    )
    context.timer_input = {
        "content_hash": CONTENT_HASH,
        "job_token": JOB_TOKEN,
        "tts_backend": "kokoro",
    }


def _claim(context, owner: str) -> dict:
    response = _call(
        context, "PUT", f"/jobs/{CONTENT_HASH}/claim", {"claim_owner": owner}
    )
    if response["statusCode"] == 200:
        context.tokens[owner] = _body(response)["claim_token"]
    return response


def _renew(context, owner: str) -> dict:
    return _call(
        context,
        "PUT",
        f"/jobs/{CONTENT_HASH}/claim",
        {
            "claim_owner": owner,
            "renew": True,
            "claim_token": context.tokens.get(owner, "no-token"),
        },
    )


def _complete(context, owner: str, with_token: bool = True) -> dict:
    body = {"audio_key": f"audio/{CONTENT_HASH}.wav", "owner": owner}
    if with_token:
        body["claim_token"] = context.tokens.get(owner, "no-token")
    return _call(context, "PUT", f"/jobs/{CONTENT_HASH}/done", body)


@given('local worker "{owner}" claims the job')
def step_claims(context, owner: str) -> None:
    response = _claim(context, owner)
    assert response["statusCode"] == 200, response


@given("{seconds:d} seconds pass")
@when("{seconds:d} seconds pass")
def step_time_passes(context, seconds: int) -> None:
    context.clock.advance(seconds)


@given(
    "the worker renews its claim every {every:d} seconds for {total:d} seconds and then finishes the job"
)
def step_heartbeats(context, every: int, total: int) -> None:
    owner = "local:a"
    start = context.clock.now
    for offset in range(every, total + 1, every):
        context.clock.at(start + offset, lambda: _renew_checked(context, owner))
    context.clock.at(start + total, lambda: _complete(context, owner))


def _renew_checked(context, owner: str) -> None:
    response = _renew(context, owner)
    assert response["statusCode"] == 200, response


@given(
    "a Batch job that renews its claim every {every:d} seconds for {total:d} seconds and then finishes"
)
def step_batch_behaviour(context, every: int, total: int) -> None:
    context.batch_behaviour = (every, total)


def _submit(context, environment: dict) -> None:
    context.batch_submissions.append(environment)
    if context.batch_behaviour is None:
        return
    every, total = context.batch_behaviour
    owner = "batch:spec-batch-job"
    context.tokens[owner] = environment["AURITUS_CLAIM_TOKEN"]
    start = context.clock.now
    for offset in range(every, total + 1, every):
        context.clock.at(start + offset, lambda: _renew_checked(context, owner))
    context.clock.at(start + total, lambda: _complete(context, owner))


def _gate(context, payload: dict) -> dict:
    if not context.gate_available:
        raise RuntimeError("gate unavailable")
    return context.gate.handler(payload, None)


def _run_timer(context, start_at: str | None = None) -> None:
    context.timer_result = run_machine(
        context.definition,
        dict(context.timer_input),
        clock=context.clock,
        gate=lambda payload: _gate(context, payload),
        submit=lambda env: _submit(context, env),
        start_at=start_at,
    )


@given("the fallback gate is unavailable")
def step_gate_down(context) -> None:
    context.gate_available = False


@when("the fallback timer runs")
@when("the original fallback timer fires")
def step_timer_runs(context) -> None:
    _run_timer(context)


@when("a second timer for the same attempt fires {seconds:d} seconds later")
def step_second_timer(context, seconds: int) -> None:
    context.clock.advance(seconds)
    _run_timer(context, start_at="ReserveFallback")


@when("the worker renews its claim after {seconds:d} seconds")
def step_renew_after(context, seconds: int) -> None:
    context.clock.advance(seconds)
    response = _renew(context, "local:a")
    assert response["statusCode"] == 200, response


@when("an operator force-retries the job")
def step_force_retry(context) -> None:
    response = _call(
        context, "POST", f"/admin/jobs/{CONTENT_HASH}/retry", {"force": True}
    )
    assert response["statusCode"] == 200, response


@when("the router arms the fallback for the same attempt twice")
def step_arm_twice(context) -> None:
    router = context.fencing_router.router
    router.FALLBACK_STATE_MACHINE_ARN = (
        "arn:aws:states:us-east-1:111122223333:stateMachine:spec"
    )
    sfn = Mock()
    sfn.start_execution.side_effect = [
        {"executionArn": "arn:spec"},
        ClientError(
            {"Error": {"Code": "ExecutionAlreadyExists", "Message": "exists"}},
            "StartExecution",
        ),
    ]
    router._sfn = sfn
    context.arm_sfn = sfn
    router._arm_fallback(CONTENT_HASH, JOB_TOKEN, "kokoro")
    context.arm_error = None
    try:
        router._arm_fallback(CONTENT_HASH, JOB_TOKEN, "kokoro")
    except Exception as exc:  # noqa: BLE001 - recorded for the assertion
        context.arm_error = exc


@when('worker "{owner}" fails the job')
@given('worker "{owner}" fails the job')
def step_fails(context, owner: str) -> None:
    response = _call(
        context,
        "PUT",
        f"/jobs/{CONTENT_HASH}/failed",
        {"owner": owner, "reason": "spec", "claim_token": context.tokens[owner]},
    )
    assert response["statusCode"] == 200, response


@when('worker "{owner}" completes the job')
@then('worker "{owner}" completes the job')
def step_completes(context, owner: str) -> None:
    response = _complete(context, owner)
    assert response["statusCode"] == 200, response


@when("the site creates a job")
def step_site_creates(context) -> None:
    context.create_response = context.fencing_router.call(
        "POST",
        "/jobs",
        headers={"x-auritus-site-key": SITE_KEY, "origin": "https://example.com"},
        body={"text": "A narrated paragraph."},
    )


@given("a site whose quota of {quota:d} was used up yesterday")
def step_site_yesterday(context, quota: int) -> None:
    _register_site(context, quota, "2020-01-01")


@given("a site whose quota of {quota:d} was used up today")
def step_site_today(context, quota: int) -> None:
    _register_site(context, quota, datetime.now(timezone.utc).strftime("%Y-%m-%d"))


def _register_site(context, quota: int, usage_day: str) -> None:
    context.fencing_router.sites_table.put_item(
        Item={
            "site_id": "site-fencing",
            "site_key": SITE_KEY,
            "allowed_origins": ["https://example.com"],
            "daily_quota": quota,
            "daily_usage": quota,
            "usage_day": usage_day,
            "disabled": False,
        }
    )


@then("the job is created")
def step_created(context) -> None:
    assert context.create_response["statusCode"] == 201, context.create_response


@then("the site's usage for today is {count:d}")
def step_usage(context, count: int) -> None:
    site = context.fencing_router.sites_table.get_item(Key={"site_id": "site-fencing"})[
        "Item"
    ]
    assert int(site["daily_usage"]) == count, site
    assert site["usage_day"] == datetime.now(timezone.utc).strftime("%Y-%m-%d")


@then('the job is refused with "{error}"')
def step_refused(context, error: str) -> None:
    assert context.create_response["statusCode"] == 403, context.create_response
    assert _body(context.create_response) == {"error": error}


@then("no Batch job is submitted")
def step_no_batch(context) -> None:
    assert context.batch_submissions == [], context.batch_submissions


@then("exactly {count:d} Batch job is submitted")
def step_batch_count(context, count: int) -> None:
    assert len(context.batch_submissions) == count, context.batch_submissions


@then('the timer ends with "{state}"')
def step_timer_end(context, state: str) -> None:
    assert context.timer_result.outcome.endswith(f":{state}"), context.timer_result


@then('the job is "{status}" and was produced by "{owner}"')
def step_done_by(context, status: str, owner: str) -> None:
    item = _item(context)
    assert item["status"] == status, item
    assert item["claimed_by"] == owner, item


@then('the job is "{status}"')
def step_job_status(context, status: str) -> None:
    assert _item(context)["status"] == status, _item(context)


@then("the Batch job carries the fencing token of the claim the fallback holds")
def step_batch_token(context) -> None:
    token = context.batch_submissions[0]["AURITUS_CLAIM_TOKEN"]
    assert token and token == _item(context)["claim_token"]


@then('the claim is still held by "{owner}"')
@then('the claim is held by "{owner}"')
def step_holder(context, owner: str) -> None:
    item = _item(context)
    assert item["status"] == "claimed", item
    assert item["claim_owner"] == owner, item


@then('a competing claim by "{owner}" is rejected')
def step_competing(context, owner: str) -> None:
    response = _claim(context, owner)
    assert response["statusCode"] == 409, response


@then('worker "{owner}" is refused when it uploads, completes, fails and renews')
def step_refused_all(context, owner: str) -> None:
    token = context.tokens[owner]
    before = _item(context)
    upload = _call(
        context, "POST", f"/jobs/{CONTENT_HASH}/presign-upload", {"claim_token": token}
    )
    done = _complete(context, owner)
    failed = _call(
        context,
        "PUT",
        f"/jobs/{CONTENT_HASH}/failed",
        {"owner": owner, "reason": "late", "claim_token": token},
    )
    renewed = _renew(context, owner)
    assert upload["statusCode"] == 409, upload
    assert done["statusCode"] == 409, done
    assert failed["statusCode"] == 409, failed
    assert renewed["statusCode"] == 409, renewed
    after = _item(context)
    assert after["status"] == before["status"], (before, after)
    assert after.get("claim_owner") == before.get("claim_owner"), (before, after)


@then("completing the job without a token is refused")
def step_no_token_done(context) -> None:
    response = _complete(context, "local:a", with_token=False)
    assert response["statusCode"] == 409, response
    assert _item(context)["status"] == "claimed"


@then("renewing without a token is rejected as a bad request")
def step_no_token_renew(context) -> None:
    response = _call(
        context,
        "PUT",
        f"/jobs/{CONTENT_HASH}/claim",
        {"claim_owner": "local:a", "renew": True},
    )
    assert response["statusCode"] == 400, response


@then("the second arming is accepted without starting another timer")
def step_second_arm(context) -> None:
    assert context.arm_error is None, context.arm_error
    names = {c.kwargs["name"] for c in context.arm_sfn.start_execution.call_args_list}
    assert len(names) == 1, names
