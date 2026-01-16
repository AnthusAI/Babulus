from __future__ import annotations

import math
import wave
from dataclasses import dataclass
from pathlib import Path

from .providers import TTSSegment, TTSProvider, TTSRequest


def estimate_duration_sec(text: str, *, wpm: float = 165.0) -> float:
    words = [w for w in text.strip().split() if w]
    if not words:
        return 0.0
    return max(0.25, (len(words) / wpm) * 60.0)


def write_silence_wav(path: str | Path, *, duration_sec: float, sample_rate_hz: int = 44100) -> None:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    frames = int(math.ceil(duration_sec * sample_rate_hz))
    with wave.open(str(out), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit PCM
        wf.setframerate(sample_rate_hz)
        wf.writeframes(b"\x00\x00" * frames)


@dataclass(frozen=True)
class DryRunProvider(TTSProvider):
    name: str = "dry-run"
    wpm: float = 165.0

    def synthesize(self, req: TTSRequest, out_path: str | Path) -> TTSSegment:
        duration = estimate_duration_sec(req.text, wpm=self.wpm)
        write_silence_wav(out_path, duration_sec=duration, sample_rate_hz=req.sample_rate_hz)
        return TTSSegment(path=str(out_path), durationSec=duration)

