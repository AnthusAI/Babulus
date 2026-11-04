"""Steps for claim fencing and the fallback gate, with all AWS mocked."""

from __future__ import annotations

import importlib.util
import time as real_time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import boto3
from behave import given, then, when
from botocore.exceptions import ClientError
from support.fallback_machine import (
    FakeClock,
    run_machine,
    synthesize_fallback_definition,
)
from support.operator_tokens import operator_headers
from support.router_harness import RouterHarness, start_router
from support.spend_guards import install_guards, load_gate

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
    gate = load_gate()
    gate.time = _fake_time(clock)
    context.guards = install_guards(context, gate, router)
    router.router.FALLBACK_STATE_MACHINE_ARN = (
        "arn:aws:states:us-east-1:111122223333:stateMachine:spec"
    )
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
    if getattr(context, "batch_refuses", False):
        raise RuntimeError("Batch queue is disabled")
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


def _dynamo_update(context, params: dict) -> None:
    params = {**params, "TableName": _router(context).router.JOBS_TABLE}
    boto3.client("dynamodb", region_name="us-east-1").update_item(**params)


def _run_timer(context, start_at: str | None = None) -> None:
    context.timer_result = run_machine(
        context.definition,
        dict(context.timer_input),
        clock=context.clock,
        gate=lambda payload: _gate(context, payload),
        submit=lambda env: _submit(context, env),
        start_at=start_at,
        dynamo=lambda params: _dynamo_update(context, params),
        finish=lambda payload: context.finisher.handler(payload, None),
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
    assert len(context.batch_submissions) == count, (
        context.batch_submissions,
        context.timer_result.data,
    )


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
    assert _item(context)["status"] != "done", _item(context)


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


def _router(context):
    return context.fencing_router


def _new_site(context, quota: int, usage_day: str, usage: int) -> None:
    context.fencing_router.sites_table.put_item(
        Item={
            "site_id": "site-fencing",
            "site_key": SITE_KEY,
            "allowed_origins": ["https://example.com"],
            "daily_quota": quota,
            "daily_usage": usage,
            "usage_day": usage_day,
            "disabled": False,
        }
    )


def _create_text(context, text: str) -> dict:
    return context.fencing_router.call(
        "POST",
        "/jobs",
        headers={"x-auritus-site-key": SITE_KEY, "origin": "https://example.com"},
        body={"text": text},
    )


@given("a site with a daily quota of {quota:d} and nothing used today")
def step_site_fresh(context, quota: int) -> None:
    _new_site(context, quota, datetime.now(timezone.utc).strftime("%Y-%m-%d"), 0)


@given("a site whose usage is recorded for a later day than the router's clock")
def step_site_future(context) -> None:
    _new_site(context, 2, "2999-01-01", 2)


@when("the site creates {count:d} different jobs at the same time")
def step_concurrent(context, count: int) -> None:
    from concurrent.futures import ThreadPoolExecutor
    from threading import Lock

    # Real DynamoDB applies each conditional write to one item atomically. The
    # in-memory fake doesn't when called from threads, so serialize the calls
    # to the sites table to give it the same guarantee.
    sites = context.fencing_router.router._sites
    update_item = sites.update_item
    lock = Lock()

    def serialized_update_item(**kwargs):
        with lock:
            return update_item(**kwargs)

    sites.update_item = serialized_update_item
    context.add_cleanup(setattr, sites, "update_item", update_item)

    with ThreadPoolExecutor(max_workers=count) as pool:
        context.concurrent = list(
            pool.map(
                lambda n: _create_text(context, f"Concurrent paragraph {n}."),
                range(count),
            )
        )


@then(
    'exactly {created:d} of those jobs are created and {refused:d} are refused with "{error}"'
)
def step_concurrent_result(context, created: int, refused: int, error: str) -> None:
    statuses = [r["statusCode"] for r in context.concurrent]
    assert statuses.count(201) == created, statuses
    assert statuses.count(403) == refused, statuses
    assert all(
        _body(r) == {"error": error}
        for r in context.concurrent
        if r["statusCode"] == 403
    )


@given("starting the fallback timer fails")
def step_timer_start_fails(context) -> None:
    context.fencing_router.router._sfn.start_execution.side_effect = ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "slow down"}},
        "StartExecution",
    )


@when("the site creates a job and the router fails")
def step_create_fails(context) -> None:
    context.router_error = None
    try:
        context.router_response = _create_text(context, "A narrated paragraph.")
    except ClientError as exc:
        context.router_error = exc
    assert context.router_error is not None, context.router_response


@then("no job was stored")
def step_no_job(context) -> None:
    assert context.fencing_router.jobs_table.scan()["Items"] == []


@given("AWS Batch refuses the submission")
def step_batch_refuses(context) -> None:
    context.batch_refuses = True


@then('the job is failed with reason "{reason}"')
def step_failed_reason(context, reason: str) -> None:
    item = _item(context)
    assert item["status"] == "failed", item
    assert item["error_message"] == reason, item
    assert "claim_token" not in item, item
