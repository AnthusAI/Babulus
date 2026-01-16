from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import requests

from ..errors import CompileError
from ..media import probe_duration_sec
from .providers import MusicProvider, MusicRequest, MusicVariant


@dataclass(frozen=True)
class ElevenLabsMusicProvider(MusicProvider):
    name: str = "elevenlabs"
    api_key: str | None = None
    base_url: str = "https://api.elevenlabs.io"
    model_id: str = "music_v1"

    def generate(self, req: MusicRequest, out_path: str | Path) -> MusicVariant:
        if not self.api_key:
            raise CompileError("ElevenLabs music requires providers.elevenlabs.api_key in config")
        outp = Path(out_path)
        outp.parent.mkdir(parents=True, exist_ok=True)

        ms = int(round(float(req.duration_seconds) * 1000))
        if ms < 3000 or ms > 600000:
            raise CompileError("ElevenLabs music duration_seconds must be between 3 and 600 seconds")

        payload: dict[str, object] = {
            "prompt": req.prompt,
            "music_length_ms": ms,
            "model_id": req.model_id or self.model_id,
        }
        if req.seed is not None:
            payload["seed"] = int(req.seed)
        if req.force_instrumental is not None:
            payload["force_instrumental"] = bool(req.force_instrumental)

        r = requests.post(
            f"{self.base_url}/v1/music",
            headers={
                "xi-api-key": self.api_key,
                "accept": "audio/*",
                "content-type": "application/json",
            },
            json=payload,
            timeout=180,
        )
        if r.status_code >= 400:
            raise CompileError(f"ElevenLabs music failed ({r.status_code}): {r.text[:500]}")

        outp.write_bytes(r.content)
        dur = probe_duration_sec(outp)
        return MusicVariant(path=str(outp), durationSec=float(dur), seed=req.seed)

