from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from ..errors import CompileError
from ..media import probe_duration_sec
from .providers import SFXProvider, SFXRequest, SFXVariant


@dataclass(frozen=True)
class ElevenLabsSFXProvider(SFXProvider):
    name: str = "elevenlabs"
    api_key: str = ""
    base_url: str = "https://api.elevenlabs.io"
    model_id: str = "eleven_text_to_sound_v2"
    prompt_influence: float | None = None
    loop: bool | None = None

    def generate(self, req: SFXRequest, out_path: str | Path) -> SFXVariant:
        if not self.api_key:
            raise CompileError("ElevenLabs SFX requires providers.elevenlabs.api_key in config")
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        payload: dict[str, Any] = {
            "text": req.prompt,
            "model_id": self.model_id,
            "duration_seconds": req.durationSec,
        }
        if self.prompt_influence is not None:
            payload["prompt_influence"] = float(self.prompt_influence)
        if self.loop is not None:
            payload["loop"] = bool(self.loop)

        r = requests.post(
            f"{self.base_url}/v1/sound-generation",
            headers={"xi-api-key": self.api_key, "accept": "audio/mpeg"},
            json=payload,
            timeout=180,
        )
        if r.status_code >= 400:
            raise CompileError(f"ElevenLabs SFX failed ({r.status_code}): {r.text[:400]}")
        out.write_bytes(r.content)
        duration = probe_duration_sec(out) if req.durationSec is None else float(req.durationSec)
        return SFXVariant(path=str(out), durationSec=duration, seed=req.seed)
