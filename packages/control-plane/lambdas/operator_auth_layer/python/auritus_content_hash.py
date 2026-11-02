"""Canonical Auritus content hash, shared by the API and operator scripts.

The content hash identifies a narration job: the SHA-256 of the normalized
text, the resolved voice ID, and the TTS backend joined by NUL characters.
The browser embed computes the same value, so every rule here must match
``embed/src/generator/hash.ts`` and ``resolveVoiceId`` in
``embed/src/index.ts`` exactly.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from typing import Any

WHITESPACE_RUN = re.compile(
    "[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+"
)
LONE_SURROGATE = re.compile("[\ud800-\udfff]")
DEFAULT_TTS_BACKEND = "kokoro"


def normalize_text(text: str) -> str:
    """Normalize TTS text exactly as the embed does before hashing.

    Replaces lone surrogates with U+FFFD (as the browser's UTF-8 encoder
    does), applies Unicode NFC, collapses each run of the characters
    JavaScript's ``\\s`` matches into one space, and trims.

    :param text: Raw TTS text.
    :returns: The normalized text.
    """
    text = LONE_SURROGATE.sub("\ufffd", text)
    return WHITESPACE_RUN.sub(" ", unicodedata.normalize("NFC", text)).strip(" ")


def resolve_voice_id(raw_voice: str | None, tts_backend: str) -> str:
    """Resolve the voice ID that is hashed and rendered for a backend.

    A missing or ``"default"`` voice becomes the backend's default, and
    Qwen's legacy ``"Chelsie"`` becomes ``"Ryan"``.

    :param raw_voice: The requested voice, if any.
    :param tts_backend: The TTS backend name.
    :returns: The resolved voice ID.
    """
    backend = (tts_backend or DEFAULT_TTS_BACKEND).strip().lower()
    unset = not raw_voice or raw_voice == "default"
    if backend == "kokoro":
        return "af_heart" if unset else raw_voice
    if backend == "qwen":
        return "Ryan" if unset or raw_voice == "Chelsie" else raw_voice
    if backend in ("fish", "chatterbox"):
        return "narrator" if unset else raw_voice
    return raw_voice or "default"


def content_hash(text: str, raw_voice: str | None, tts_backend: str | None) -> str:
    """Compute the canonical content hash for a narration request.

    :param text: TTS text, normalized or not.
    :param raw_voice: The requested voice, resolved with
        :func:`resolve_voice_id`.
    :param tts_backend: The TTS backend; defaults to ``kokoro`` when empty.
    :returns: Lower-case hex SHA-256.
    """
    backend = tts_backend or DEFAULT_TTS_BACKEND
    voice_id = resolve_voice_id(raw_voice, backend)
    payload = f"{normalize_text(text)}\0{voice_id}\0{backend}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# Render options that change the rendered pixels or timing. Anything else a
# job may carry (worker count, encoder paths) only changes how the work runs,
# so it is not part of the job's identity.
VIDEO_OUTPUT_OPTIONS = (
    "title",
    "subtitle",
    "fps",
    "width",
    "height",
    "durationFrames",
    "startFrame",
    "endFrame",
    "deviceScaleFactor",
)


def video_content_hash(
    script: dict[str, Any],
    timeline: dict[str, Any] | None,
    audio_sha256: str | None,
    options: dict[str, Any] | None,
) -> str:
    """Compute the content hash of a video render job.

    The hash covers everything that decides the output: the script, the
    timeline, the narration audio (by its own SHA-256) and the options that
    affect the picture. Equal inputs always give the same job, so submitting
    them twice reuses the first. The hashed form is canonical JSON with
    sorted keys and a ``kind`` tag, so it can never equal a speech job's hash.

    :param script: The script document to render.
    :param timeline: The timeline document, if any.
    :param audio_sha256: SHA-256 of the narration audio, if any.
    :param options: Render options; only :data:`VIDEO_OUTPUT_OPTIONS` count.
    :returns: Lower-case hex SHA-256.
    """
    chosen = {
        key: (options or {})[key]
        for key in VIDEO_OUTPUT_OPTIONS
        if (options or {}).get(key) is not None
    }
    payload = json.dumps(
        {
            "kind": "video",
            "version": 1,
            "script": script,
            "timeline": timeline,
            "audio": audio_sha256,
            "options": chosen,
        },
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
