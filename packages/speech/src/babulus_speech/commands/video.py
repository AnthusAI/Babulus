"""``babulus video``: submit render jobs, follow them, and fetch the result.

A video job costs nothing to run and waits for a local worker (``babulus
worker``) to claim it. Cloud rendering is not enabled for video.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import httpx
import typer

from babulus_speech.api import (
    AuritusApiError,
    AuritusClient,
    AuritusSessionExpiredError,
)
from babulus_speech.cli_output import fail, succeed
from babulus_speech.config import load_config
from babulus_speech.worker import video as video_mod

app = typer.Typer(help="Submit and follow video render jobs.")

API_ERROR_FIXES = {
    "operator_auth_required": "Run `babulus login`.",
    "script_required": "Pass --script with a script.json produced by `babulus generate`.",
    "video_input_too_large": (
        "The script and timeline must be under 300 KB together; render a shorter "
        "section or remove unused scenes."
    ),
    "audio_not_uploaded": "Run the submit again; the narration upload did not finish.",
    "job_not_found": "Check the hash with `babulus job list`.",
}


def _read_json(path: Path, label: str, json_output: bool) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(
            f"{label} not found: {path}",
            f"Check the path to the {label} file.",
            json_output=json_output,
        )
    except json.JSONDecodeError as exc:
        fail(
            f"{label} is not valid JSON: {exc}",
            f"Regenerate it with `babulus generate`, or fix {path}.",
            json_output=json_output,
        )
    if not isinstance(value, dict):
        fail(
            f"{label} must be a JSON object.",
            "Regenerate it with `babulus generate`.",
            json_output=json_output,
        )
    return value


def _api_failure(exc: AuritusApiError, json_output: bool) -> None:
    """Turn an API error into an Error and a Fix."""
    if isinstance(exc, AuritusSessionExpiredError):
        fail(str(exc), "Run `babulus login`.", json_output=json_output)
    text = str(exc)
    for code, fix in API_ERROR_FIXES.items():
        if code in text:
            fail(text, fix, json_output=json_output)
    fail(
        text,
        "Check `babulus config show` for the API address and try again.",
        json_output=json_output,
    )


def _upload_audio(client: AuritusClient, audio: Path) -> str:
    """Put the narration audio in the content store; return its SHA-256."""
    data = audio.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    ticket = client.store_upload_url(digest)
    if not ticket.get("exists"):
        response = httpx.put(ticket["upload_url"], content=data, timeout=600.0)
        response.raise_for_status()
    return digest


@app.command("submit")
def submit(
    script: Path = typer.Option(..., "--script", help="script.json to render."),
    timeline: Path = typer.Option(None, "--timeline", help="timeline.json."),
    audio: Path = typer.Option(None, "--audio", help="Narration audio file."),
    name: str = typer.Option("", "--name", help="A label for the job."),
    fps: int = typer.Option(None, "--fps", help="Frames per second."),
    width: int = typer.Option(None, "--width", help="Frame width in pixels."),
    height: int = typer.Option(None, "--height", help="Frame height in pixels."),
    duration_frames: int = typer.Option(
        None, "--duration-frames", help="Number of frames to render."
    ),
    json_output: bool = typer.Option(False, "--json", help="Print one JSON object."),
) -> None:
    """Submit a video render job; it waits for a local worker."""
    script_doc = _read_json(script, "script", json_output)
    timeline_doc = _read_json(timeline, "timeline", json_output) if timeline else None
    options = {
        key: value
        for key, value in (
            ("fps", fps),
            ("width", width),
            ("height", height),
            ("durationFrames", duration_frames),
        )
        if value is not None
    }
    if audio is not None and not audio.is_file():
        fail(
            f"audio not found: {audio}",
            "Check the path to the narration audio file.",
            json_output=json_output,
        )
    try:
        client = AuritusClient()
        audio_sha256 = _upload_audio(client, audio) if audio else None
        result = client.create_video_job(
            script=script_doc,
            timeline=timeline_doc,
            audio_sha256=audio_sha256,
            options=options,
            name=name,
        )
    except AuritusApiError as exc:
        _api_failure(exc, json_output)
    except httpx.HTTPError as exc:
        fail(
            f"Upload failed: {exc}",
            "Check your connection and run the submit again.",
            json_output=json_output,
        )
    reason = result.get("waiting_message")
    human = f"{result['content_hash']}\nstatus={result.get('status')}"
    if result.get("existing"):
        human += "\n(an identical job already existed)"
    if reason:
        human += f"\n{reason}"
    succeed(
        {
            "content_hash": result["content_hash"],
            "kind": "video",
            "status": result.get("status"),
            "existing": bool(result.get("existing")),
            "waiting_reason": result.get("waiting_reason"),
            "waiting_message": reason,
        },
        json_output=json_output,
        human=human,
    )


@app.command("status")
def status(
    content_hash: str = typer.Argument(..., help="The job's content hash."),
    json_output: bool = typer.Option(False, "--json", help="Print one JSON object."),
) -> None:
    """Show a video job's state and, while it waits, why."""
    try:
        job = AuritusClient().get_admin_job(content_hash)
    except AuritusApiError as exc:
        _api_failure(exc, json_output)
    wanted = (
        "content_hash",
        "kind",
        "status",
        "waiting_reason",
        "waiting_message",
        "claimed_by",
        "error_message",
        "output_url",
    )
    data = {key: job.get(key) for key in wanted}
    lines = [f"{key}={value}" for key, value in data.items() if value is not None]
    succeed(data, json_output=json_output, human="\n".join(lines))


@app.command("get")
def get(
    content_hash: str = typer.Argument(..., help="The job's content hash."),
    out: Path = typer.Option(..., "--out", help="Where to write the MP4."),
    json_output: bool = typer.Option(False, "--json", help="Print one JSON object."),
) -> None:
    """Download a finished video."""
    try:
        job = AuritusClient().get_admin_job(content_hash)
    except AuritusApiError as exc:
        _api_failure(exc, json_output)
    if job.get("status") != "done" or not job.get("output_url"):
        fail(
            f"The job is {job.get('status')}, not done.",
            f"Check progress with `babulus video status {content_hash}`; "
            "a job waits until `babulus worker` claims it.",
            json_output=json_output,
            status=job.get("status"),
        )
    response = httpx.get(job["output_url"], timeout=600.0)
    response.raise_for_status()
    out.write_bytes(response.content)
    succeed(
        {
            "content_hash": content_hash,
            "path": str(out),
            "bytes": len(response.content),
        },
        json_output=json_output,
        human=f"wrote {out}",
    )


@app.command("check")
def check(
    json_output: bool = typer.Option(False, "--json", help="Print one JSON object."),
) -> None:
    """Check that this machine can render video (Node, Chromium, ffmpeg)."""
    try:
        root = video_mod.find_video_root(load_config()["worker"].get("video_root"))
        toolchain = video_mod.check_toolchain(root)
    except video_mod.VideoSetupError as exc:
        fail(str(exc), exc.fix, json_output=json_output)
    succeed(
        {
            "root": str(toolchain.root),
            "node": toolchain.node,
            "ffmpeg": toolchain.ffmpeg,
        },
        json_output=json_output,
        human=f"Video rendering is ready ({toolchain.root}).",
    )
