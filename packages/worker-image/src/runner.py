"""AWS Batch GPU worker entrypoint."""

from __future__ import annotations

import os
import sys
import threading
import traceback
from typing import Any

import httpx
from babulus_speech.tts import get_backend


def _require_env(primary: str, *aliases: str) -> str:
    for key in (primary, *aliases):
        value = os.environ.get(key, "").strip()
        if value:
            return value
    names = ", ".join((primary, *aliases))
    raise KeyError(f"Missing required environment variable (one of): {names}")


def _auth_headers(bearer: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {bearer}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


RUNTIME_PACKAGES = {
    "kokoro": ("kokoro", ["kokoro>=0.9.0", "torch", "soundfile"]),
    "qwen": ("qwen_tts", ["qwen-tts", "torch", "soundfile"]),
    "higgs": (
        "transformers",
        ["transformers>=5.5.0", "torch", "torchaudio", "soundfile"],
    ),
    "fish": (
        "fish_speech",
        ["fish-speech", "torch", "torchaudio", "soundfile", "huggingface-hub"],
    ),
    "coqui": ("TTS", ["TTS", "torch", "soundfile"]),
    "bark": ("transformers", ["transformers", "torch", "soundfile"]),
    # Previously missing entirely: chatterbox.py's _generate_torch imported
    # `chatterbox.tts` with no install path at all, so it always hit
    # ImportError on Batch and silently produced a fake 440Hz stub tone
    # instead of real audio -- confirmed in production (auritus-<pending>).
    "chatterbox": (
        "chatterbox",
        ["chatterbox-tts", "torch", "torchaudio", "soundfile"],
    ),
    # Also previously missing: f5.py's _generate_torch has no fallback at
    # all, so a missing install failed the job loudly (better than a fake
    # tone, but still non-functional).
    "f5": ("f5_tts", ["f5-tts", "torch", "torchaudio", "soundfile"]),
}


def _install_backend(name: str) -> None:
    """Install the native TTS package if it is not already importable.

    The worker image always ships the ``babulus_speech.tts.<name>`` wrappers, so
    importing one is not evidence that the synthesizer is installed.
    """
    import importlib
    import subprocess

    spec = RUNTIME_PACKAGES.get(name)
    if spec is None:
        return
    module_name, packages = spec
    try:
        importlib.import_module(module_name)
    except ImportError:
        print(f"Installing TTS backend: {name}...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", *packages],
            check=True,
        )


def redeem_job_token(
    api_url: str, job_hash: str, job_token: str
) -> tuple[str, dict[str, Any]] | None:
    """Exchange the single-job token for a worker-scoped bearer and optional job payload.

    :returns: Tuple of (bearer token, job fields such as text and voice_id), or
        ``None`` when the API no longer recognizes the token because the job
        finished and its token was revoked.
    """
    response = httpx.post(
        f"{api_url}/jobs/{job_hash}/redeem",
        headers=_auth_headers(job_token),
        json={"job_token": job_token},
        timeout=30.0,
    )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    body = response.json()
    bearer = str(body.get("access_token") or body.get("bearer") or job_token)
    job = body.get("job") if isinstance(body.get("job"), dict) else body
    return bearer, job


def mark_failed(
    api_url: str,
    job_hash: str,
    headers: dict[str, str],
    *,
    owner: str,
    reason: str,
    claim_token: str | None = None,
) -> None:
    """Best-effort failure notification for operators and Step Functions."""
    try:
        httpx.put(
            f"{api_url}/jobs/{job_hash}/failed",
            headers=headers,
            json={"owner": owner, "reason": reason, "claim_token": claim_token},
            timeout=30.0,
        )
    except httpx.HTTPError:
        pass


def take_claim(
    api_url: str,
    job_hash: str,
    headers: dict[str, str],
    *,
    owner: str,
    claim_token: str | None,
) -> tuple[bool, str | None]:
    """Take hold of the job; return whether it is held and the fencing token.

    When the fallback gate reserved the job for this run, its token arrives
    in the environment and is renewed under this run's owner id. Without one
    (the run was started by hand) the job is claimed the ordinary way, which
    succeeds only if no live claim exists.
    """
    body: dict[str, Any] = {"claim_owner": owner}
    if claim_token:
        body.update({"renew": True, "claim_token": claim_token})
    claim = httpx.put(
        f"{api_url}/jobs/{job_hash}/claim",
        headers=headers,
        json=body,
        timeout=30.0,
    )
    if claim.status_code >= 400:
        print(f"claim failed: {claim.status_code} {claim.text}", file=sys.stderr)
        return False, None
    held = claim.json() if claim.content else {}
    return True, str(held.get("claim_token") or claim_token or "") or None


def _keep_claim(
    api_url: str,
    job_hash: str,
    headers: dict[str, str],
    *,
    owner: str,
    claim_token: str,
    stop: threading.Event,
    lost: threading.Event,
    interval: float,
) -> None:
    """Renew the claim until ``stop``; set ``lost`` if the claim is taken away."""
    while not stop.wait(interval):
        try:
            response = httpx.put(
                f"{api_url}/jobs/{job_hash}/claim",
                headers=headers,
                json={"claim_owner": owner, "renew": True, "claim_token": claim_token},
                timeout=30.0,
            )
        except httpx.HTTPError:
            continue
        if response.status_code == 409:
            lost.set()
            return


def main() -> int:
    """Redeem token, claim job, generate TTS, upload, and mark done or failed.

    Any exception after the claim, including ``BackendUnavailable`` from the
    speech backend, marks the job failed so it is never left claimed.

    :returns: ``0`` when the job is done or needs no work, ``1`` when it failed.
    """
    api_url = _require_env("API_URL", "AURITUS_API_ENDPOINT").rstrip("/")
    job_hash = _require_env("JOB_HASH", "AURITUS_CONTENT_HASH")
    job_token = _require_env("JOB_TOKEN", "AURITUS_JOB_TOKEN")
    default_backend = os.environ.get("TTS_BACKEND") or os.environ.get(
        "AURITUS_TTS_BACKEND", "kokoro"
    )
    owner = f"batch:{os.environ.get('AWS_BATCH_JOB_ID', 'unknown')}"

    redeemed = redeem_job_token(api_url, job_hash, job_token)
    if redeemed is None:
        print(
            f"job {job_hash}: worker token already revoked; the job is finished",
            file=sys.stderr,
        )
        return 0
    bearer, redeemed_job = redeemed
    headers = _auth_headers(bearer)

    job_body: dict[str, Any] = dict(redeemed_job)
    if not job_body.get("text"):
        job_response = httpx.get(
            f"{api_url}/jobs/{job_hash}",
            headers=headers,
            timeout=30.0,
        )
        job_response.raise_for_status()
        job_body = job_response.json()

    claimed, claim_token = take_claim(
        api_url,
        job_hash,
        headers,
        owner=owner,
        claim_token=os.environ.get("AURITUS_CLAIM_TOKEN", "").strip() or None,
    )
    if not claimed:
        return 0

    stop = threading.Event()
    lost = threading.Event()
    if claim_token:
        threading.Thread(
            target=_keep_claim,
            args=(api_url, job_hash, headers),
            kwargs={
                "owner": owner,
                "claim_token": claim_token,
                "stop": stop,
                "lost": lost,
                "interval": float(os.environ.get("CLAIM_RENEW_SECONDS", "120")),
            },
            daemon=True,
        ).start()

    try:
        backend_name = job_body.get("tts_backend") or default_backend
        _install_backend(backend_name)
        backend = get_backend(str(backend_name))
        audio = backend.generate(
            job_body.get("text") or "",
            {
                "voice_id": job_body.get("voice_id"),
                "name": job_body.get("name") or "",
                "byline": job_body.get("byline") or "",
            },
        )

        if lost.is_set():
            print(f"job {job_hash}: claim lost; discarding result", file=sys.stderr)
            return 0
        presign = httpx.post(
            f"{api_url}/jobs/{job_hash}/presign-upload",
            headers=headers,
            json={"claim_token": claim_token},
            timeout=30.0,
        )
        presign.raise_for_status()
        upload = presign.json()
        put = httpx.put(
            upload["upload_url"],
            content=audio,
            timeout=300.0,
        )
        put.raise_for_status()

        done = httpx.put(
            f"{api_url}/jobs/{job_hash}/done",
            headers=headers,
            json={
                "audio_key": upload["audio_key"],
                "owner": owner,
                "claim_token": claim_token,
            },
            timeout=30.0,
        )
        if done.status_code == 409:
            print(f"job {job_hash}: claim lost; result not recorded", file=sys.stderr)
            return 0
        done.raise_for_status()
        print(f"done {job_hash}")
        return 0
    except Exception as exc:
        reason = f"{type(exc).__name__}: {exc}"
        print(reason, file=sys.stderr)
        traceback.print_exc()
        mark_failed(
            api_url,
            job_hash,
            headers,
            owner=owner,
            reason=reason,
            claim_token=claim_token,
        )
        return 1
    finally:
        stop.set()


if __name__ == "__main__":
    raise SystemExit(main())
