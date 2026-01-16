from __future__ import annotations

from typing import Any

from ..config import get_provider_config
from ..errors import CompileError
from .dry_run import DryRunSFXProvider
from .elevenlabs_sfx import ElevenLabsSFXProvider
from .providers import SFXProvider


def get_sfx_provider(name: str, *, config: dict[str, Any]) -> SFXProvider:
    if name == "dry-run":
        return DryRunSFXProvider()
    if name == "elevenlabs":
        cfg = get_provider_config(config, "elevenlabs")
        return ElevenLabsSFXProvider(
            api_key=str(cfg.get("api_key", "")),
            base_url=str(cfg.get("base_url", "https://api.elevenlabs.io")),
            model_id=str(cfg.get("sfx_model_id", "eleven_text_to_sound_v2")),
            prompt_influence=float(cfg["sfx_prompt_influence"])
            if "sfx_prompt_influence" in cfg
            else None,
            loop=bool(cfg["sfx_loop"]) if "sfx_loop" in cfg else None,
        )
    raise CompileError(f'Unknown SFX provider "{name}". Currently supported: dry-run, elevenlabs')
