"""Steps for video jobs in the job API, with all AWS mocked."""

from __future__ import annotations

import hashlib
import json

import boto3
from behave import given, then, when
from support.fallback_machine import run_machine
from support.operator_tokens import operator_headers
from support.router_harness import RouterHarness

SITE_KEY = "video-spec-site-key"


def _router(context) -> RouterHarness:
    return context.fencing_router


def _script(name: str) -> dict:
    return {"id": name, "fps": 30, "scenes": [{"id": "one", "text": name}]}


def _create(context, *, headers=None, **fields) -> dict:
    body = {"kind": "video", "script": _script("intro"), **fields}
    response = _router(context).call(
        "POST", "/jobs", headers=headers or operator_headers(), body=body
    )
    context.video_responses = getattr(context, "video_responses", []) + [response]
    return response


def _body(response: dict) -> dict:
    return json.loads(response["body"])


def _video_items(context) -> list[dict]:
    items = _router(context).jobs_table.scan()["Items"]
    return [item for item in items if item.get("kind") == "video"]


def _the_video(context) -> dict:
    items = _video_items(context)
    assert len(items) == 1, items
    return items[0]


def _call_job(context, method: str, suffix: str, body: dict | None = None) -> dict:
    content_hash = _the_video(context)["content_hash"]
    return _router(context).call(
        method,
        f"/jobs/{content_hash}{suffix}",
        headers=operator_headers(),
        body=body,
        path_parameters={"hash": content_hash},
    )


@given("a stored job with no kind")
def step_legacy_job(context) -> None:
    _router(context).jobs_table.put_item(
        Item={
            "content_hash": "legacy-speech-job",
            "status": "pending",
            "text": "Older narration.",
            "tts_backend": "kokoro",
            "created_at": "2026-01-01T00:00:00Z",
        }
    )


@when("the operator lists the claimable jobs")
def step_list_claimable(context) -> None:
    response = _router(context).call(
        "GET", "/jobs/claimable", headers=operator_headers()
    )
    assert response["statusCode"] == 200, response
    context.claimable = {job["content_hash"]: job for job in _body(response)["jobs"]}


@then('the claimable job "{content_hash}" has kind "{kind}"')
def step_claimable_kind(context, content_hash: str, kind: str) -> None:
    assert context.claimable[content_hash]["kind"] == kind, context.claimable


@given("a site that may create speech jobs")
def step_speech_site(context) -> None:
    _router(context).register_site(SITE_KEY)


@when("the site creates a speech job")
def step_site_creates_speech(context) -> None:
    context.speech_response = _router(context).call(
        "POST",
        "/jobs",
        headers={"x-auritus-site-key": SITE_KEY, "origin": "https://example.com"},
        body={"text": "A narrated paragraph."},
    )
    assert context.speech_response["statusCode"] == 201, context.speech_response


@then('the stored job has kind "{kind}"')
def step_stored_kind(context, kind: str) -> None:
    content_hash = _body(context.speech_response)["content_hash"]
    item = _router(context).jobs_table.get_item(Key={"content_hash": content_hash})
    assert item["Item"]["kind"] == kind, item


@given('the operator created a video job for script "{name}"')
@when('the operator creates a video job for script "{name}"')
def step_operator_creates(context, name: str) -> None:
    _create(context, script=_script(name))


@when('the operator creates a video job for script "{name}" at {fps:d} fps')
def step_creates_at_fps(context, name: str, fps: int) -> None:
    _create(context, script=_script(name), options={"fps": fps})


@when(
    'the operator creates a video job for script "{name}" at {fps:d} fps '
    "using {workers:d} workers"
)
def step_creates_workers(context, name: str, fps: int, workers: int) -> None:
    _create(context, script=_script(name), options={"fps": fps, "workers": workers})


@when("a site key holder creates a video job")
def step_site_key_creates(context) -> None:
    _router(context).register_site(SITE_KEY)
    _create(context, headers={"x-auritus-site-key": SITE_KEY})


@when("the operator creates a video job with no script")
def step_no_script(context) -> None:
    response = _router(context).call(
        "POST", "/jobs", headers=operator_headers(), body={"kind": "video"}
    )
    context.video_responses = [response]


@when('the operator creates a video job with an unknown option "{name}"')
def step_unknown_option(context, name: str) -> None:
    _create(context, options={name: 1})


@when("the operator creates a video job with audio that was never uploaded")
def step_audio_missing(context) -> None:
    _create(context, audio_sha256="a" * 64)


@when("the operator creates a video job with a malformed audio hash")
def step_audio_malformed(context) -> None:
    _create(context, audio_sha256="not-a-hash")


@when("the operator uploads narration audio to the content store")
def step_upload_audio(context) -> None:
    data = b"RIFF....narration"
    context.audio_sha256 = hashlib.sha256(data).hexdigest()
    ticket = _router(context).call(
        "POST",
        f"/store/{context.audio_sha256}/presign-upload",
        headers=operator_headers(),
        body={},
    )
    assert _body(ticket)["exists"] is False, ticket
    # Stand in for the client's PUT to the presigned URL.
    boto3.client("s3", region_name="us-east-1").put_object(
        Bucket=_router(context).router.AUDIO_BUCKET,
        Key=f"store/{context.audio_sha256}",
        Body=data,
    )


@when("the operator creates a video job that uses that audio")
def step_create_with_audio(context) -> None:
    _create(context, audio_sha256=context.audio_sha256)


@then("asking the store for that audio again reports that it exists")
def step_store_exists(context) -> None:
    ticket = _router(context).call(
        "POST",
        f"/store/{context.audio_sha256}/presign-upload",
        headers=operator_headers(),
        body={},
    )
    assert _body(ticket)["exists"] is True, ticket


@then('the video job is created as "{status}"')
def step_created_as(context, status: str) -> None:
    response = context.video_responses[-1]
    assert response["statusCode"] == 201, response
    assert _body(response)["status"] == status, response


@then("the video job says it is waiting for a local worker")
def step_says_waiting(context) -> None:
    assert _the_video(context)["waiting_reason"] == "waiting_for_local_worker"


@then("no fallback timer was started")
def step_no_timer(context) -> None:
    assert not _router(context).router._sfn.start_execution.called


@then("the video job has no job token")
def step_no_token(context) -> None:
    assert "job_token" not in _the_video(context)


@then('the job is visible to the operator as kind "{kind}" waiting for a local worker')
def step_visible(context, kind: str) -> None:
    body = _body(_call_job(context, "GET", ""))
    assert body["kind"] == kind, body
    assert body["waiting_reason"] == "waiting_for_local_worker", body
    assert "local worker" in body["waiting_message"], body


@then("the second submission reuses the first job")
def step_reuses(context) -> None:
    first, second = context.video_responses[-2:]
    assert first["statusCode"] == 201, first
    assert second["statusCode"] == 200, second
    assert _body(second)["existing"] is True, second
    assert _body(second)["content_hash"] == _body(first)["content_hash"]


@then("exactly {count:d} video job is stored")
@then("exactly {count:d} video jobs are stored")
def step_count(context, count: int) -> None:
    assert len(_video_items(context)) == count, _video_items(context)


@then("the request is refused with status {status:d}")
def step_refused_status(context, status: int) -> None:
    assert context.video_responses[-1]["statusCode"] == status, context.video_responses


@then('the request is refused with status {status:d} and error "{error}"')
def step_refused_error(context, status: int, error: str) -> None:
    response = context.video_responses[-1]
    assert response["statusCode"] == status, response
    assert _body(response) == {"error": error}, response


@when('local worker "{owner}" claims the video job')
@given('local worker "{owner}" claims the video job')
def step_claim_video(context, owner: str) -> None:
    response = _call_job(context, "PUT", "/claim", {"claim_owner": owner})
    assert response["statusCode"] == 200, response
    context.video_claim_token = _body(response)["claim_token"]


@then('the video job is "{status}"')
def step_video_status(context, status: str) -> None:
    assert _the_video(context)["status"] == status, _the_video(context)


@then("the video job no longer shows a waiting reason")
def step_no_waiting(context) -> None:
    assert "waiting_reason" not in _the_video(context), _the_video(context)


@when('local worker "{owner}" uploads and completes the video')
def step_uploads_video(context, owner: str) -> None:
    ticket = _call_job(
        context, "POST", "/presign-upload", {"claim_token": context.video_claim_token}
    )
    assert ticket["statusCode"] == 200, ticket
    context.video_ticket = _body(ticket)
    done = _call_job(
        context,
        "PUT",
        "/done",
        {
            "output_key": context.video_ticket["output_key"],
            "owner": owner,
            "claim_token": context.video_claim_token,
        },
    )
    assert done["statusCode"] == 200, done


@given('local worker "{owner}" fails the video job')
def step_fails_video(context, owner: str) -> None:
    response = _call_job(
        context,
        "PUT",
        "/failed",
        {"owner": owner, "reason": "spec", "claim_token": context.video_claim_token},
    )
    assert response["statusCode"] == 200, response


@when("the operator retries the video job")
def step_retry_video(context) -> None:
    content_hash = _the_video(context)["content_hash"]
    response = _router(context).call(
        "POST",
        f"/admin/jobs/{content_hash}/retry",
        headers=operator_headers(),
        body={},
        path_parameters={"hash": content_hash},
    )
    assert response["statusCode"] == 200, response


@then("the video was stored under a video key")
def step_video_key(context) -> None:
    item = _the_video(context)
    assert item["output_key"] == f"video/{item['content_hash']}.mp4", item
    assert context.video_ticket["content_type"] == "video/mp4"


@then("the video job was charged no platform cost")
def step_free(context) -> None:
    assert int(_the_video(context)["platform_cost_usd"]) == 0, _the_video(context)


@when("a fallback timer runs for the video job")
def step_timer_for_video(context) -> None:
    item = _the_video(context)
    context.timer_result = run_machine(
        context.definition,
        {
            "content_hash": item["content_hash"],
            "job_token": "no-token",
            "tts_backend": "kokoro",
        },
        clock=context.clock,
        gate=lambda payload: context.gate.handler(payload, None),
        submit=lambda env: context.batch_submissions.append(env),
    )


@then("the speech job armed a fallback timer")
def step_speech_armed(context) -> None:
    assert _router(context).router._sfn.start_execution.call_count == 1
