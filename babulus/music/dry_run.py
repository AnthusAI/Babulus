from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ..sfx.dry_run import write_silence_wav
from .providers import MusicProvider, MusicRequest, MusicVariant


@dataclass(frozen=True)
class DryRunMusicProvider(MusicProvider):
    name: str = "dry-run"

    def generate(self, req: MusicRequest, out_path: str | Path) -> MusicVariant:
        dur = float(req.duration_seconds)
        write_silence_wav(out_path, duration_sec=dur, sample_rate_hz=req.sample_rate_hz)
        return MusicVariant(path=str(out_path), durationSec=dur, seed=req.seed)

