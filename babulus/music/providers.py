from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol


@dataclass(frozen=True)
class MusicRequest:
    prompt: str
    duration_seconds: float
    sample_rate_hz: int = 44100
    seed: int | None = None
    model_id: str | None = None
    force_instrumental: bool | None = None
    extra: dict[str, Any] = None  # type: ignore[assignment]


@dataclass(frozen=True)
class MusicVariant:
    path: str
    durationSec: float
    seed: int | None = None


class MusicProvider(Protocol):
    name: str

    def generate(self, req: MusicRequest, out_path: str | Path) -> MusicVariant: ...

