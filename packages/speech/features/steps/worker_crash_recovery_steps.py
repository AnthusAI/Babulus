"""Behave steps for local worker crash recovery specs."""

from __future__ import annotations

import time
from unittest.mock import MagicMock, patch

from behave import given, then, when

from babulus_speech.api import AuritusApiError
from babulus_speech.worker import daemon

_CONTENT_HASH = "worker-crash-hash-001"


@given("a claimable job that a local worker will claim")
def step_claimable_job(context) -> None:
    context.mock_client = MagicMock()
    context.mock_client.list_claimable.return_value = [
        {
            "content_hash": _CONTENT_HASH,
            "text": "Some article text.",
            "tts_backend": "kokoro",
            "voice_id": "default",
            "name": "Some Article",
            "byline": "",
        }
    ]
    context.mock_client.claim_job.return_value = {"status": "claimed"}
    context.mock_backend = MagicMock()


@given("the worker's TTS backend raises an exception during generation")
def step_backend_raises(context) -> None:
    context.mock_backend.generate.side_effect = ModuleNotFoundError(
        "No module named 'misaki'"
    )


@given("the worker's TTS backend generates audio successfully")
def step_backend_succeeds(context) -> None:
    context.mock_backend.generate.return_value = b"fake-audio-bytes"
    context.mock_client.presign_upload.return_value = {
        "upload_url": "https://uploads.example.com/audio/worker-crash-hash-001.wav",
        "audio_key": "audio/worker-crash-hash-001.wav",
    }


@when("the worker runs a single poll cycle")
def step_run_worker_once(context) -> None:
    mock_config = {
        "worker": {
            "poll_interval": 1,
            "claim_timeout": 30,
            "tts_backend": "kokoro",
            "voices_dir": getattr(context, "worker_voices_dir", None),
            "heartbeat_interval": getattr(context, "heartbeat_interval", None),
        }
    }
    mock_put_response = MagicMock()
    mock_put_response.raise_for_status.return_value = None

    context.worker_crashed = False
    with (
        patch.object(daemon, "load_config", return_value=mock_config),
        patch.object(daemon, "AuritusClient", return_value=context.mock_client),
        patch.object(daemon, "get_backend", return_value=context.mock_backend),
        patch.object(daemon, "maybe_warn_near_expiry", return_value=False),
        patch.object(daemon.httpx, "put", return_value=mock_put_response),
    ):
        try:
            daemon.run_worker(once=True)
        except Exception:  # noqa: BLE001 - recording the crash IS the assertion
            context.worker_crashed = True


@then("the job is marked failed with the worker as owner")
def step_job_marked_failed(context) -> None:
    assert context.mock_client.mark_failed.called, "mark_failed was never called"
    args, kwargs = context.mock_client.mark_failed.call_args
    assert args[0] == _CONTENT_HASH
    assert kwargs.get("owner", "").startswith("local:")
    assert kwargs.get("reason")
    assert not context.mock_client.mark_done.called


@then("the job is marked done")
def step_job_marked_done(context) -> None:
    assert context.mock_client.mark_done.called, "mark_done was never called"
    args, kwargs = context.mock_client.mark_done.call_args
    assert args[0] == _CONTENT_HASH
    assert not context.mock_client.mark_failed.called


@then("the worker does not crash")
def step_worker_did_not_crash(context) -> None:
    assert not context.worker_crashed, "run_worker raised instead of recovering"


@given('a claimable job that a local worker will claim with claim token "{token}"')
def step_claimable_job_with_token(context, token: str) -> None:
    step_claimable_job(context)
    context.mock_client.claim_job.return_value = {
        "status": "claimed",
        "claim_token": token,
    }
    context.mock_client.presign_upload.return_value = {
        "upload_url": "https://uploads.example.com/audio/worker-crash-hash-001.wav",
        "audio_key": "audio/worker-crash-hash-001.wav",
    }
    context.heartbeat_interval = 0.05


@given("the worker's TTS backend takes a while to generate audio")
def step_backend_slow(context) -> None:
    def generate(_text, _meta):
        time.sleep(0.4)
        return b"fake-audio-bytes"

    context.mock_backend.generate.side_effect = generate


@given("the API refuses the claim renewal because the claim was lost")
def step_renewal_refused(context) -> None:
    context.mock_client.renew_claim.side_effect = AuritusApiError(
        "PUT claim failed: 409 claim_lost", status_code=409
    )


@then('every call for the job carried claim token "{token}"')
def step_calls_carry_token(context, token: str) -> None:
    assert context.mock_client.presign_upload.call_args.args[1] == token
    assert context.mock_client.mark_done.call_args.kwargs["claim_token"] == token


@then('the claim was renewed at least once with claim token "{token}"')
def step_claim_renewed(context, token: str) -> None:
    calls = context.mock_client.renew_claim.call_args_list
    assert calls, "the claim was never renewed"
    assert all(call.args[2] == token for call in calls), calls


@then("the worker uploaded nothing and recorded no result")
def step_nothing_written(context) -> None:
    assert not context.mock_client.presign_upload.called
    assert not context.mock_client.mark_done.called
    assert not context.mock_client.mark_failed.called
