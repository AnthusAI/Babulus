"""``babulus voice``: publish a cloned voice so every worker can use it.

A cloned voice is a reference recording and its transcript. Publishing puts
them in the content store, names them in a manifest, and only then makes the
voice visible, so a worker never sees half a voice. After publishing, a Batch
worker given a job for that voice downloads the same files a local worker
reads from its voices folder.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import httpx
import typer

from babulus_speech.api import (
    AuritusApiError,
    AuritusClient,
    AuritusSessionExpiredError,
)
from babulus_speech.cli_output import fail, succeed
from babulus_speech.tts.voices import (
    resolve_reference_audio,
    resolve_reference_text,
    voices_directory,
)

app = typer.Typer(help="Publish cloned voices for every worker to use.")


def _put_object(client: AuritusClient, data: bytes) -> str:
    """Upload bytes to the content store (once) and return their SHA-256."""
    digest = hashlib.sha256(data).hexdigest()
    ticket = client.store_upload_url(digest)
    if not ticket.get("exists"):
        response = httpx.put(ticket["upload_url"], content=data, timeout=600.0)
        response.raise_for_status()
    return digest


@app.command("publish")
def publish(
    voice_id: str = typer.Argument(..., help="The voice's name, e.g. serious."),
    voices_dir: Path = typer.Option(
        None, "--voices-dir", help="Folder holding <voice>.wav and <voice>.txt."
    ),
    json_output: bool = typer.Option(False, "--json", help="Print one JSON object."),
) -> None:
    """Upload a voice's recording and transcript, then publish it."""
    name = voice_id.strip().lower()
    folder = voices_directory(voices_dir)
    recording = resolve_reference_audio(name, voices_dir)
    if recording is None:
        fail(
            f"Voice {name!r} has no reference recording"
            + (f" in {folder}." if folder else " (no voices folder given)."),
            f"Put {name}.wav and {name}.txt in a folder and pass --voices-dir "
            "<folder> (or set AURITUS_VOICES).",
            json_output=json_output,
        )
    transcript = resolve_reference_text(name, voices_dir)
    if transcript is None:
        fail(
            f"Voice {name!r} has no transcript next to {recording.name}.",
            f"Write what the recording says in {name}.txt beside it.",
            json_output=json_output,
        )
    try:
        client = AuritusClient()
        files = {
            f"{name}{recording.suffix.lower()}": _put_object(
                client, recording.read_bytes()
            ),
            f"{name}.txt": _put_object(client, transcript.encode("utf-8")),
        }
        manifest = json.dumps(
            {"version": 1, "voice_id": name, "files": files},
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        # The manifest goes last; publishing only succeeds once everything it
        # names is in the store.
        manifest_sha = _put_object(client, manifest)
        client.publish_voice(name, manifest_sha)
    except AuritusSessionExpiredError as exc:
        fail(str(exc), "Run `babulus login`.", json_output=json_output)
    except AuritusApiError as exc:
        fail(
            str(exc),
            "Run the publish again; uploads that finished are not repeated.",
            json_output=json_output,
        )
    except httpx.HTTPError as exc:
        fail(
            f"Upload failed: {exc}",
            "Check your connection and run the publish again.",
            json_output=json_output,
        )
    succeed(
        {"voice_id": name, "manifest_sha256": manifest_sha, "files": sorted(files)},
        json_output=json_output,
        human=f"published {name} ({manifest_sha[:12]})",
    )
