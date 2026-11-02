"""Steps for publishing cloned voices to the content store."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import boto3
import httpx
from behave import given, then, when
from support.operator_tokens import operator_headers
from typer.testing import CliRunner

from babulus_speech.cli import app
from babulus_speech.commands import voice as voice_cmd

SITE_KEY = "voice-spec-site-key"
RECORDING = b"RIFF-reference-recording"
TRANSCRIPT = b"What the reference recording says."


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _router(context):
    return context.fencing_router


def _body(response: dict) -> dict:
    return json.loads(response["body"])


def _put(context, data: bytes) -> str:
    digest = _sha(data)
    boto3.client("s3", region_name="us-east-1").put_object(
        Bucket=_router(context).router.AUDIO_BUCKET, Key=f"store/{digest}", Body=data
    )
    return digest


def _manifest(voice: str, files: dict[str, str]) -> bytes:
    return json.dumps(
        {"version": 1, "voice_id": voice, "files": files},
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


@given('the voice "{voice}" is uploaded with its manifest last')
def step_uploaded(context, voice: str) -> None:
    files = {
        f"{voice}.wav": _put(context, RECORDING),
        f"{voice}.txt": _put(context, TRANSCRIPT),
    }
    context.manifest_sha = _put(context, _manifest(voice, files))
    context.voice_files = files


@given('the voice "{voice}" is uploaded without its transcript file')
def step_uploaded_partial(context, voice: str) -> None:
    files = {
        f"{voice}.wav": _put(context, RECORDING),
        f"{voice}.txt": _sha(TRANSCRIPT),  # named, never uploaded
    }
    context.manifest_sha = _put(context, _manifest(voice, files))


def _publish(context, voice: str, manifest_sha: str, headers=None) -> None:
    context.publish_response = _router(context).call(
        "POST",
        f"/voices/{voice}/publish",
        headers=headers or operator_headers(),
        body={"manifest_sha256": manifest_sha},
    )


@when('the operator publishes the voice "{voice}"')
def step_publish(context, voice: str) -> None:
    _publish(context, voice, context.manifest_sha)


@when("the operator publishes a manifest that was never uploaded")
def step_publish_missing(context) -> None:
    _publish(context, "serious", "b" * 64)


@when('the operator publishes the voice "{voice}" under the hash of other bytes')
def step_publish_wrong_hash(context, voice: str) -> None:
    other = _put(context, b"something else entirely")
    # Store the real manifest bytes under another object's key.
    boto3.client("s3", region_name="us-east-1").put_object(
        Bucket=_router(context).router.AUDIO_BUCKET,
        Key=f"store/{other}",
        Body=_manifest(voice, context.voice_files),
    )
    _publish(context, voice, other)


@when("a site key holder publishes a voice")
def step_site_key_publishes(context) -> None:
    _router(context).register_site(SITE_KEY)
    _publish(context, "serious", "c" * 64, headers={"x-auritus-site-key": SITE_KEY})


@then("the publish succeeds")
def step_publish_ok(context) -> None:
    assert context.publish_response["statusCode"] == 200, context.publish_response
    assert _body(context.publish_response)["manifest_sha256"] == context.manifest_sha


@then('the publish is refused with error "{error}"')
def step_publish_refused(context, error: str) -> None:
    assert context.publish_response["statusCode"] == 400, context.publish_response
    assert _body(context.publish_response) == {"error": error}


@then("the publish is refused with status {status:d}")
def step_publish_status(context, status: int) -> None:
    assert context.publish_response["statusCode"] == status, context.publish_response


def _create_voice_job(context, voice: str, backend: str) -> str:
    _router(context).register_site(SITE_KEY)
    response = _router(context).call(
        "POST",
        "/jobs",
        headers={"x-auritus-site-key": SITE_KEY, "origin": "https://example.com"},
        body={
            "text": "A narrated paragraph.",
            "voice_id": voice,
            "tts_backend": backend,
        },
    )
    assert response["statusCode"] == 201, response
    context.voice_job = _body(response)["content_hash"]
    return context.voice_job


@then(
    'a speech job for voice "{voice}" on backend "{backend}" carries the published voice'
)
def step_job_carries(context, voice: str, backend: str) -> None:
    content_hash = _create_voice_job(context, voice, backend)
    item = _router(context).jobs_table.get_item(Key={"content_hash": content_hash})[
        "Item"
    ]
    assert item["voice_manifest"] == context.manifest_sha, item


@then(
    'a speech job for voice "{voice}" on backend "{backend}" carries no published voice'
)
def step_job_carries_none(context, voice: str, backend: str) -> None:
    content_hash = _create_voice_job(context, voice, backend)
    item = _router(context).jobs_table.get_item(Key={"content_hash": content_hash})[
        "Item"
    ]
    assert "voice_manifest" not in item, item
    pointer = boto3.client("s3", region_name="us-east-1").list_objects_v2(
        Bucket=_router(context).router.AUDIO_BUCKET, Prefix="voices/"
    )
    assert pointer.get("KeyCount", 0) == 0, pointer


@then("redeeming that job's token lists the voice files with download links")
def step_redeem(context) -> None:
    item = _router(context).jobs_table.get_item(
        Key={"content_hash": context.voice_job}
    )["Item"]
    response = _router(context).call(
        "POST",
        f"/jobs/{context.voice_job}/redeem",
        headers={},
        body={"job_token": item["job_token"]},
        path_parameters={"hash": context.voice_job},
    )
    files = _body(response)["voice_files"]
    assert [f["name"] for f in files] == ["serious.txt", "serious.wav"], files
    assert all(f["url"].startswith("https://") and f["sha256"] for f in files), files


# ---- Batch worker --------------------------------------------------------------


@given('the API lists the published files of the voice "{voice}" for the job')
def step_api_lists_files(context, voice: str) -> None:
    inner = context.worker_responder
    context.downloads = {
        f"https://store.test/{voice}.wav": RECORDING,
        f"https://store.test/{voice}.txt": TRANSCRIPT,
    }
    files = [
        {
            "name": f"{voice}.wav",
            "sha256": _sha(RECORDING),
            "url": f"https://store.test/{voice}.wav",
        },
        {
            "name": f"{voice}.txt",
            "sha256": _sha(TRANSCRIPT),
            "url": f"https://store.test/{voice}.txt",
        },
    ]

    def respond(method: str, url: str, **kwargs) -> httpx.Response:
        if url in context.downloads:
            context.worker_requests.append((method, url, None))
            return httpx.Response(
                200, content=context.downloads[url], request=httpx.Request(method, url)
            )
        response = inner(method, url, **kwargs)
        if url.endswith("/redeem"):
            body = response.json()
            # The spec API nests the job; the real one is flat.
            (body["job"] if isinstance(body.get("job"), dict) else body)[
                "voice_files"
            ] = files
            return httpx.Response(200, json=body, request=response.request)
        return response

    context.worker_responder = respond


@given("a downloaded voice file has been altered")
def step_altered(context) -> None:
    for url in list(context.downloads):
        if url.endswith(".wav"):
            context.downloads[url] = b"not the recording"


@then('the stubbed model spoke with a reference recording named "{name}"')
def step_spoke_named(context, name: str) -> None:
    assert [Path(p).name for p in context.spoken_references] == [
        name
    ], context.spoken_references


@then('the Batch worker marks the job failed with a reason containing "{text}"')
def step_batch_failed_text(context, text: str) -> None:
    failed = [b for m, u, b in context.worker_requests if u.endswith("/failed")]
    assert len(failed) == 1, context.worker_requests
    assert text in failed[0]["reason"], failed[0]["reason"]


# ---- command line ---------------------------------------------------------------


@given("the content store accepts uploads")
def step_store_accepts(context) -> None:
    context.store_events = []
    client = MagicMock()
    client.store_upload_url.side_effect = lambda sha: {
        "exists": False,
        "upload_url": f"https://store.test/{sha}",
    }
    client.publish_voice.side_effect = lambda voice, sha: context.store_events.append(
        ("publish", sha)
    )
    context.voice_client = client


@given('the transcript of "{voice}" is removed')
def step_remove_transcript(context, voice: str) -> None:
    (Path(context.voices_dir) / f"{voice}.txt").unlink()


def _publish_cli(context, voice: str, *extra: str) -> None:
    client = getattr(context, "voice_client", None) or MagicMock()
    events = getattr(context, "store_events", [])
    context.store_events = events

    def record_put(url, content=None, timeout=None):
        events.append(("upload", url.rsplit("/", 1)[1], content))
        response = MagicMock()
        response.raise_for_status.return_value = None
        return response

    with (
        patch.object(voice_cmd, "AuritusClient", return_value=client),
        patch.object(voice_cmd.httpx, "put", side_effect=record_put),
    ):
        context.result = CliRunner().invoke(
            app,
            [
                "voice",
                "publish",
                voice,
                "--voices-dir",
                str(context.voices_dir),
                *extra,
            ],
        )


@when('the user publishes the voice "{voice}" from that folder with --json')
def step_cli_publish_json(context, voice: str) -> None:
    _publish_cli(context, voice, "--json")


@when('the user publishes the voice "{voice}" from that folder')
def step_cli_publish(context, voice: str) -> None:
    _publish_cli(context, voice)


@then("the recording and transcript were uploaded before the manifest")
def step_order(context) -> None:
    uploads = [e for e in context.store_events if e[0] == "upload"]
    assert len(uploads) == 3, context.store_events
    manifest = json.loads(uploads[-1][2])
    assert manifest["voice_id"] == "serious", manifest
    assert set(uploads[0][1:2] + uploads[1][1:2]) == set(manifest["files"].values())
    context.manifest_upload_sha = uploads[-1][1]


@then("the voice was published under the manifest's hash")
def step_published_hash(context) -> None:
    published = [e for e in context.store_events if e[0] == "publish"]
    assert published == [("publish", context.manifest_upload_sha)], published
    assert context.store_events[-1][0] == "publish", "publish must come last"
