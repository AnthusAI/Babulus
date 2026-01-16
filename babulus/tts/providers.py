from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol


@dataclass(frozen=True)
class TTSRequest:
    text: str
    voice: str | None = None
    model: str | None = None
    format: str = "wav"
    sample_rate_hz: int = 44100
    extra: dict[str, Any] | None = None


@dataclass(frozen=True)
class TTSSegment:
    path: str
    durationSec: float


class TTSProvider(Protocol):
    name: str

    def synthesize(self, req: TTSRequest, out_path: str | Path) -> TTSSegment: ...

