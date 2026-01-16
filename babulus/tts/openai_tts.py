from __future__ import annotations

import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from ..errors import CompileError
from .providers import TTSSegment, TTSProvider, TTSRequest


def _wav_duration_sec(path: Path) -> float:
    """Calculate WAV duration, handling OpenAI's streaming WAV format with ff ff ff ff size."""
    with wave.open(str(path), "rb") as wf:
        sample_rate = wf.getframerate()
        num_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()

        # OpenAI returns WAV files with ff ff ff ff as the chunk size (streaming format)
        # We need to calculate from actual file size instead
        file_size = path.stat().st_size

        # WAV header is typically 44 bytes, but let's find the data chunk
        # Format: RIFF header (12 bytes) + fmt chunk (24 bytes) + data chunk header (8 bytes)
        header_size = 44

        # Calculate number of audio bytes
        audio_bytes = file_size - header_size

        # Calculate frames: bytes / (channels * bytes_per_sample)
        bytes_per_frame = num_channels * sample_width
        frames = audio_bytes / bytes_per_frame

        return frames / float(sample_rate)


@dataclass(frozen=True)
class OpenAITTSProvider(TTSProvider):
    name: str = "openai"
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1/audio/speech"
    default_model: str = "gpt-4o-mini-tts"
    default_voice: str = "alloy"

    def synthesize(self, req: TTSRequest, out_path: str | Path) -> TTSSegment:
        if not self.api_key:
            raise CompileError("OpenAI TTS requires providers.openai.api_key in config")
        model = req.model or self.default_model
        voice = req.voice or self.default_voice

        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        payload: dict[str, Any] = {
            "model": model,
            "voice": voice,
            "input": req.text,
            "response_format": "wav",
        }
        r = requests.post(
            self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            json=payload,
            timeout=120,
        )
        if r.status_code >= 400:
            raise CompileError(f"OpenAI TTS failed ({r.status_code}): {r.text[:400]}")

        # Validate that we received audio data
        if len(r.content) < 100:
            raise CompileError(f"OpenAI TTS returned suspiciously short response ({len(r.content)} bytes): {r.content[:100]}")

        # Check for RIFF header
        if not r.content.startswith(b'RIFF'):
            # Try to parse as JSON error
            try:
                import json
                error_data = json.loads(r.content.decode('utf-8'))
                raise CompileError(f"OpenAI TTS returned error: {error_data}")
            except (json.JSONDecodeError, UnicodeDecodeError):
                raise CompileError(f"OpenAI TTS returned invalid WAV (first 100 bytes): {r.content[:100]}")

        out.write_bytes(r.content)
        return TTSSegment(path=str(out), durationSec=_wav_duration_sec(out))

