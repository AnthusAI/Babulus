from __future__ import annotations

from typing import Any

from ..config import get_provider_config
from ..errors import CompileError
from .dry_run import DryRunMusicProvider
from .elevenlabs_music import ElevenLabsMusicProvider
from .providers import MusicProvider


def get_music_provider(name: str, *, config: dict[str, Any]) -> MusicProvider:
    if name == "dry-run":
        return DryRunMusicProvider()
    if name == "elevenlabs":
        cfg = get_provider_config(config, "elevenlabs")
        return ElevenLabsMusicProvider(
            api_key=str(cfg.get("api_key") or ""),
            base_url=str(cfg.get("base_url", "https://api.elevenlabs.io")),
            model_id=str(cfg.get("music_model_id", "music_v1")),
        )
    raise CompileError(f'Unknown music provider "{name}". Currently supported: dry-run, elevenlabs')

