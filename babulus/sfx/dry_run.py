from __future__ import annotations

import math
import random
import wave
from dataclasses import dataclass
from pathlib import Path

from .providers import SFXProvider, SFXRequest, SFXVariant


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
class DryRunSFXProvider(SFXProvider):
    name: str = "dry-run"

    def generate(self, req: SFXRequest, out_path: str | Path) -> SFXVariant:
        # Keep SFX short by default; allow explicit duration override.
        dur = float(req.durationSec) if req.durationSec is not None else 0.4
        write_silence_wav(out_path, duration_sec=dur, sample_rate_hz=req.sample_rate_hz)
        return SFXVariant(path=str(out_path), durationSec=dur, seed=req.seed)

