from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol


@dataclass(frozen=True)
class SFXRequest:
    prompt: str
    durationSec: float | None = None
    format: str = "wav"
    sample_rate_hz: int = 44100
    seed: int | None = None
    extra: dict[str, Any] | None = None


@dataclass(frozen=True)
class SFXVariant:
    path: str
    durationSec: float
    seed: int | None = None


class SFXProvider(Protocol):
    name: str

    def generate(self, req: SFXRequest, out_path: str | Path) -> SFXVariant: ...

