from __future__ import annotations

import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from ..errors import CompileError
from ..media import audio_activity_ratio, is_audio_all_silence, probe_duration_sec
from .providers import TTSSegment, TTSProvider, TTSRequest


def _pcm_to_wav(pcm: bytes, *, sample_rate_hz: int, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if len(pcm) % 2 != 0:
        pcm = pcm[:-1]
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate_hz)
        wf.writeframes(pcm)


def _wav_duration_sec(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def _default_output_format(sample_rate_hz: int) -> str:
    # MP3 formats are broadly available; PCM tiers vary. Default to mp3.
    # Keep sample rate aligned with the enum in the OpenAPI.
    if sample_rate_hz in (22050, 24000, 44100):
        return f"mp3_{sample_rate_hz}_128"
    return "mp3_44100_128"


@dataclass(frozen=True)
class ElevenLabsTTSProvider(TTSProvider):
    name: str = "elevenlabs"
    api_key: str = ""
    voice_id: str = ""
    model_id: str = "eleven_multilingual_v2"
    base_url: str = "https://api.elevenlabs.io"
    voice_settings: dict[str, Any] | None = None
    output_format: str | None = None
    pronunciation_dictionary_locators: list[dict[str, Any]] | None = None

    def synthesize(self, req: TTSRequest, out_path: str | Path) -> TTSSegment:
        if not self.api_key:
            raise CompileError("ElevenLabs TTS requires providers.elevenlabs.api_key in config")
        voice_id = req.voice or self.voice_id
        if not voice_id:
            raise CompileError("ElevenLabs TTS requires providers.elevenlabs.voice_id (or request voice)")

        # Validate text is not empty
        if not req.text or not req.text.strip():
            raise CompileError(
                f"ElevenLabs TTS requires non-empty text. "
                f"Received: {req.text!r}\n\n"
                f"This usually means a voice segment has empty or whitespace-only text in your .babulus.yml file. "
                f"Check that all 'voice:' entries have actual text content."
            )

        # Log what we're about to synthesize
        import sys
        text_preview = repr(req.text)[:100]
        print(f"[ELEVENLABS] Synthesizing: text={text_preview} len={len(req.text)} out={out_path}", file=sys.stderr, flush=True)

        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        url = f"{self.base_url}/v1/text-to-speech/{voice_id}/stream"
        output_format = self.output_format or _default_output_format(req.sample_rate_hz)
        payload_base: dict[str, Any] = {
            "text": req.text,
            "model_id": req.model or self.model_id,
        }
        if self.voice_settings:
            payload_base["voice_settings"] = self.voice_settings
        extra = req.extra or {}
        locators = extra.get("pronunciation_dictionary_locators") or self.pronunciation_dictionary_locators

        def _post(payload: dict[str, Any]) -> bytes:
            r = requests.post(
                url,
                params={"output_format": output_format},
                headers={"xi-api-key": self.api_key, "accept": "audio/mpeg"},
                json=payload,
                timeout=120,
            )
            if r.status_code >= 400:
                # Enhanced error message with payload info
                text_preview = payload.get('text', '')[:200]
                raise CompileError(
                    f"ElevenLabs TTS failed ({r.status_code}): {r.text[:400]}\n\n"
                    f"Payload text was: {text_preview!r}\n"
                    f"Text length: {len(payload.get('text', ''))}\n"
                    f"Text repr: {repr(payload.get('text', ''))[:100]}"
                )
            return r.content

        payload = dict(payload_base)
        if locators is not None:
            payload["pronunciation_dictionary_locators"] = locators

        audio = _post(payload)

        if output_format.startswith("pcm_"):
            _pcm_to_wav(audio, sample_rate_hz=req.sample_rate_hz, out_path=out)
            return TTSSegment(path=str(out), durationSec=_wav_duration_sec(out))

        out.write_bytes(audio)
        duration = probe_duration_sec(out)
        probe_sec = min(3.0, max(0.25, duration))
        silent = is_audio_all_silence(out, seconds=probe_sec, sample_rate_hz=req.sample_rate_hz)
        activity = audio_activity_ratio(out, seconds=probe_sec, sample_rate_hz=req.sample_rate_hz)

        def _looks_bad() -> bool:
            # Treat "mostly silence" as suspicious even if not all-zero PCM.
            return silent or activity < 0.01

        if _looks_bad() and locators is not None:
            # If a pronunciation dictionary causes a silent response, retry once without it to isolate.
            payload = dict(payload_base)
            audio = _post(payload)
            out.write_bytes(audio)
            duration = probe_duration_sec(out)
            probe_sec = min(3.0, max(0.25, duration))
            silent = is_audio_all_silence(out, seconds=probe_sec, sample_rate_hz=req.sample_rate_hz)
            activity = audio_activity_ratio(out, seconds=probe_sec, sample_rate_hz=req.sample_rate_hz)

        if _looks_bad():
            raise CompileError(
                "ElevenLabs returned an unusable audio segment (silent/mostly silent). "
                f"activity_ratio={activity:.4f}"
            )

        return TTSSegment(path=str(out), durationSec=duration)
