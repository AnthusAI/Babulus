"""Local worker daemon that claims jobs and runs TTS on local GPU hardware."""

from __future__ import annotations

import socket
import threading
import time
import uuid
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
    requeued; the work in flight must then write nothing. Network errors are
    retried at the next beat, because the claim is still good until it lapses.
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


def run_worker(*, once: bool = False) -> None:
    """Poll claimable jobs and process them locally.

    :param once: If True, exit after processing zero or one job.
    """
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
    typer.echo(
        f"Worker starting as {owner} backend={tts_backend_name} "
        f"poll={poll_interval}s claim_timeout={claim_timeout}s voices={voices_dir}"
    )

    try:
        client = AuritusClient()
    except AuritusApiError as exc:
        typer.secho(str(exc), fg=typer.colors.RED, err=True)
        raise SystemExit(1) from exc

    backend = get_backend(tts_backend_name)

    while True:
        maybe_warn_near_expiry(owner)
        try:
            jobs = client.list_claimable()
            typer.echo(f"Found {len(jobs)} claimable jobs")
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
            typer.echo(f"Claimed {content_hash[:16]}")
            claim_token = claim.get("claim_token")
            text = job.get("text") or ""
            job_backend = job.get("tts_backend") or tts_backend_name
            meta = {
                "voice_id": job.get("voice_id") or "default",
                "name": job.get("name") or "",
                "byline": job.get("byline") or "",
                "voices_dir": voices_dir,
            }
            typer.echo(
                f"Generating audio for {content_hash[:16]} backend={job_backend}"
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
                typer.secho(f"Completed {content_hash}", fg=typer.colors.GREEN)
            processed = True
            if once is True:
                return

        if once is True:
            if not processed:
                typer.echo("No claimable jobs.")
            return
        time.sleep(poll_interval)
