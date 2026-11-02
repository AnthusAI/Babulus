"""Local worker daemon that claims jobs and runs TTS on local GPU hardware."""

from __future__ import annotations

import hashlib
import json
import socket
import tempfile
import threading
import time
import uuid
from collections.abc import Callable
from pathlib import Path
from typing import Any

import httpx
import typer

from babulus_speech.api import (
    AuritusApiError,
    AuritusClient,
    AuritusSessionExpiredError,
)
from babulus_speech.auth import maybe_warn_near_expiry, notify_session_state
from babulus_speech.config import load_config
from babulus_speech.tts import get_backend
from babulus_speech.worker import video as video_mod


def _heartbeat_loop(
    client: AuritusClient,
    content_hash: str,
    owner: str,
    claim_token: str | None,
    claim_seconds: int,
    stop: threading.Event,
    lost: threading.Event,
    interval: float,
) -> None:
    """Renew the claim until ``stop``; set ``lost`` if it was taken away.

    A refused renewal (409) means another worker holds the job or it was
    requeued; the work in flight must then write nothing. Any other failure
    (a dropped connection, a timeout, a server error) is retried at the next
    beat, because the claim is still good until it lapses.
    """
    if claim_token is None:
        return
    while not stop.wait(interval):
        try:
            client.renew_claim(content_hash, owner, claim_token, claim_seconds)
        except AuritusApiError as exc:
            if exc.status_code == 409:
                lost.set()
                return
        except Exception:  # noqa: BLE001 - a network blip must not stop the beat
            continue


def worker_voices_dir(worker_cfg: dict[str, Any], *, cwd: Path | None = None) -> Path:
    """The reference-voice folder the local worker reads cloned voices from.

    The ``[worker] voices_dir`` setting, resolved against ``cwd``; when unset,
    ``voices`` in the directory the worker was started from (the repository's
    ``voices/`` when run from its root). The library itself never guesses:
    this is the worker command's documented default, and it is logged.

    :param worker_cfg: The ``[worker]`` config section.
    :param cwd: Directory relative paths resolve against (default: cwd).
    :returns: Absolute folder path.
    """
    base = cwd if cwd is not None else Path.cwd()
    return base / Path(str(worker_cfg.get("voices_dir") or "voices")).expanduser()


def make_emitter(json_output: bool) -> Callable[[dict[str, Any]], None]:
    """Return a function that reports worker events, as NDJSON or plain lines."""

    def emit(event: dict[str, Any]) -> None:
        if json_output:
            typer.echo(json.dumps(event, separators=(",", ":")))
            return
        name = event.get("event")
        if name == "log":
            typer.echo(f"  {event.get('line')}")
        elif name == "progress":
            total = event.get("total")
            of = f" of {total}" if total else ""
            typer.echo(f"  rendered {event.get('frames')}{of} frames")
        elif name == "message":
            typer.echo(str(event.get("text")))
        elif name == "done":
            typer.echo(f"Completed {event.get('content_hash')}")

    return emit


def _resolve_video(
    video: bool | None,
    worker_cfg: dict[str, Any],
    emit: Callable[[dict[str, Any]], None],
    check: Callable[[], video_mod.VideoToolchain] | None,
) -> video_mod.VideoToolchain | None:
    """Decide whether this worker takes video jobs.

    ``video=None`` means "if the machine is set up for it": a missing Node or
    Chromium is reported with its fix and the worker carries on with speech
    only, leaving video jobs waiting. ``video=True`` makes the setup mandatory.
    """
    if video is False:
        return None
    try:
        if check is not None:
            return check()
        root = video_mod.find_video_root(worker_cfg.get("video_root"))
        return video_mod.check_toolchain(root)
    except video_mod.VideoSetupError as exc:
        if video is True:
            typer.secho(f"{exc}\nFix: {exc.fix}", fg=typer.colors.RED, err=True)
            raise SystemExit(1) from exc
        emit(
            {
                "event": "message",
                "text": f"Video jobs will wait: {exc}\nFix: {exc.fix}",
                "fix": exc.fix,
            }
        )
        return None


def _run_video_job(
    client: AuritusClient,
    content_hash: str,
    owner: str,
    claim_token: str | None,
    claim_timeout: int,
    heartbeat_interval: float,
    toolchain: video_mod.VideoToolchain,
    emit: Callable[[dict[str, Any]], None],
    runner: video_mod.Runner,
) -> None:
    """Render one claimed video job and record the result, fenced by its claim."""
    stop = threading.Event()
    lost = threading.Event()
    beat = threading.Thread(
        target=_heartbeat_loop,
        args=(
            client,
            content_hash,
            owner,
            claim_token,
            claim_timeout,
            stop,
            lost,
            heartbeat_interval,
        ),
        daemon=True,
    )
    beat.start()
    output: Path | None = None
    failure: str | None = None
    try:
        with tempfile.TemporaryDirectory(prefix="babulus-video-") as tmp:
            workdir = Path(tmp)
            try:
                job_input = client.get_job_input(content_hash)
                audio_path = _fetch_audio(job_input, workdir)
                emit({"event": "message", "text": f"Rendering {content_hash[:16]}"})
                output = video_mod.render_job(
                    job_input,
                    audio_path,
                    workdir / "render",
                    toolchain,
                    emit=emit,
                    runner=runner,
                )
                data = output.read_bytes()
            except (
                Exception
            ) as exc:  # noqa: BLE001 - any failure must release the claim
                failure = f"{type(exc).__name__}: {exc}"[:500]
                data = b""
    finally:
        stop.set()
        beat.join(timeout=1.0)

    if lost.is_set():
        emit(
            {
                "event": "message",
                "text": f"Claim on {content_hash[:16]} was lost; discarding the result.",
            }
        )
        return
    try:
        if failure is not None:
            emit({"event": "message", "text": f"Render failed: {failure}"})
            client.mark_failed(
                content_hash, reason=failure, owner=owner, claim_token=claim_token
            )
            return
        upload = client.presign_upload(content_hash, claim_token)
        put = httpx.put(upload["upload_url"], content=data, timeout=600.0)
        put.raise_for_status()
        client.mark_done(
            content_hash,
            audio_key=upload["output_key"],
            owner=owner,
            claim_token=claim_token,
        )
        emit({"event": "done", "content_hash": content_hash, "kind": "video"})
    except AuritusApiError as exc:
        if exc.status_code != 409:
            emit({"event": "message", "text": f"Could not record the result: {exc}"})
            return
        emit(
            {
                "event": "message",
                "text": f"Claim on {content_hash[:16]} was lost; result not recorded.",
            }
        )


def _fetch_audio(job_input: dict[str, Any], workdir: Path) -> Path | None:
    """Download a video job's narration audio and verify its SHA-256."""
    url = job_input.get("audio_url")
    if not url:
        return None
    response = httpx.get(url, timeout=300.0)
    response.raise_for_status()
    digest = hashlib.sha256(response.content).hexdigest()
    if digest != job_input.get("audio_sha256"):
        raise ValueError("downloaded audio does not match its SHA-256")
    path = workdir / "narration.wav"
    path.write_bytes(response.content)
    return path


def run_worker(
    *,
    once: bool = False,
    video: bool | None = None,
    json_output: bool = False,
    video_check: Callable[[], video_mod.VideoToolchain] | None = None,
    video_runner: video_mod.Runner = video_mod.subprocess_runner,
) -> None:
    """Poll claimable jobs, speech and video, and process them locally.

    :param once: If True, exit after processing zero or one job.
    :param video: ``True`` requires the video toolchain, ``False`` ignores
        video jobs, ``None`` (default) takes video jobs when it is set up.
    :param json_output: Report events as one JSON object per line.
    :param video_check: Replaces the toolchain check (tests).
    :param video_runner: Replaces the toolchain subprocess (tests).
    """
    emit = make_emitter(json_output)
    cfg = load_config()
    worker_cfg = cfg["worker"]
    poll_interval = int(worker_cfg["poll_interval"])
    claim_timeout = int(worker_cfg["claim_timeout"])
    tts_backend_name = str(worker_cfg["tts_backend"])
    # Renew well inside the claim window; ``heartbeat_interval`` overrides it.
    heartbeat_interval = float(
        worker_cfg.get("heartbeat_interval")
        or max(5, min(poll_interval, claim_timeout // 3))
    )
    owner = f"local:{socket.gethostname()}:{uuid.uuid4().hex[:8]}"
    voices_dir = worker_voices_dir(worker_cfg)
    emit(
        {
            "event": "message",
            "text": (
                f"Worker starting as {owner} backend={tts_backend_name} "
                f"poll={poll_interval}s claim_timeout={claim_timeout}s "
                f"voices={voices_dir}"
            ),
        }
    )

    try:
        client = AuritusClient()
    except AuritusApiError as exc:
        typer.secho(str(exc), fg=typer.colors.RED, err=True)
        raise SystemExit(1) from exc

    backend = get_backend(tts_backend_name)
    toolchain = _resolve_video(video, worker_cfg, emit, video_check)

    while True:
        maybe_warn_near_expiry(owner)
        try:
            jobs = client.list_claimable()
            emit({"event": "message", "text": f"Found {len(jobs)} claimable jobs"})
        except AuritusSessionExpiredError as exc:
            typer.secho(
                f"Session expired: {exc}",
                fg=typer.colors.RED,
                err=True,
            )
            notify_session_state("expired", owner)
            raise SystemExit(2) from exc
        except AuritusApiError as exc:
            typer.secho(
                f"list_claimable failed: {exc}",
                fg=typer.colors.YELLOW,
                err=True,
            )
            if once is True:
                return
            time.sleep(poll_interval)
            continue

        processed = False
        for job in jobs:
            content_hash = job.get("content_hash") or job.get("pk")
            if not content_hash:
                continue
            job_kind = job.get("kind") or "speech"
            if job_kind == "video" and toolchain is None:
                continue
            try:
                claim = client.claim_job(content_hash, owner, claim_timeout)
            except AuritusApiError:
                typer.echo(f"Claim failed for {content_hash[:16]}", err=True)
                continue
            if (
                claim.get("status") not in {"claimed", "ok"}
                and claim.get("claim_owner") != owner
            ):
                continue
            emit({"event": "message", "text": f"Claimed {content_hash[:16]}"})
            claim_token = claim.get("claim_token")
            if job_kind == "video":
                assert toolchain is not None
                _run_video_job(
                    client,
                    content_hash,
                    owner,
                    claim_token,
                    claim_timeout,
                    heartbeat_interval,
                    toolchain,
                    emit,
                    video_runner,
                )
                processed = True
                if once is True:
                    return
                continue
            text = job.get("text") or ""
            job_backend = job.get("tts_backend") or tts_backend_name
            meta = {
                "voice_id": job.get("voice_id") or "default",
                "name": job.get("name") or "",
                "byline": job.get("byline") or "",
                "voices_dir": voices_dir,
            }
            emit(
                {
                    "event": "message",
                    "text": (
                        f"Generating audio for {content_hash[:16]} "
                        f"backend={job_backend}"
                    ),
                }
            )
            stop = threading.Event()
            lost = threading.Event()
            heartbeat: threading.Thread | None = None
            generation_exc: Exception | None = None
            try:
                backend = get_backend(job_backend)
                heartbeat = threading.Thread(
                    target=_heartbeat_loop,
                    args=(
                        client,
                        content_hash,
                        owner,
                        claim_token,
                        claim_timeout,
                        stop,
                        lost,
                        heartbeat_interval,
                    ),
                    daemon=True,
                )
                heartbeat.start()
                audio_bytes = backend.generate(text, meta)
            except Exception as exc:
                # Caught broadly and deliberately: TTS backends commonly crash
                # the process from missing optional dependencies (misaki,
                # num2words, phonemizer-fork, spacy, espeakng-loader, ...),
                # and none of those are worth enumerating individually --
                # every one of them must leave the job releasable rather than
                # stuck in "claimed" forever, since GET /jobs/claimable
                # excludes anything not pending.
                generation_exc = exc
            finally:
                stop.set()
                if heartbeat is not None:
                    heartbeat.join(timeout=1.0)

            if lost.is_set():
                typer.secho(
                    f"Claim on {content_hash[:16]} was lost; discarding the result.",
                    fg=typer.colors.YELLOW,
                    err=True,
                )
                processed = True
                if once is True:
                    return
                continue

            if generation_exc is not None:
                typer.secho(
                    f"Generation failed for {content_hash[:16]}: {generation_exc}",
                    fg=typer.colors.RED,
                    err=True,
                )
                try:
                    client.mark_failed(
                        content_hash,
                        reason=str(generation_exc)[:500],
                        owner=owner,
                        claim_token=claim_token,
                    )
                except AuritusApiError as mark_exc:
                    typer.secho(
                        f"Failed to release claim for {content_hash[:16]} "
                        f"after generation failure (job left claimed): {mark_exc}",
                        fg=typer.colors.RED,
                        err=True,
                    )
                processed = True
                if once is True:
                    return
                continue

            try:
                upload = client.presign_upload(content_hash, claim_token)
                upload_url = upload["upload_url"]
                audio_key = upload["audio_key"]
                put = httpx.put(
                    upload_url,
                    content=audio_bytes,
                    timeout=120.0,
                )
                put.raise_for_status()
                client.mark_done(
                    content_hash,
                    audio_key=audio_key,
                    owner=owner,
                    claim_token=claim_token,
                )
            except AuritusApiError as exc:
                if exc.status_code != 409:
                    raise
                typer.secho(
                    f"Claim on {content_hash[:16]} was lost; result not recorded.",
                    fg=typer.colors.YELLOW,
                    err=True,
                )
            else:
                emit({"event": "done", "content_hash": content_hash, "kind": "speech"})
            processed = True
            if once is True:
                return

        if once is True:
            if not processed:
                emit({"event": "message", "text": "No claimable jobs."})
            return
        time.sleep(poll_interval)
