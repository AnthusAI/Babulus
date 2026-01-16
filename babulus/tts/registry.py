from __future__ import annotations

from typing import Any

from ..config import get_provider_config
from ..errors import CompileError
from .dry_run import DryRunProvider
from .elevenlabs_tts import ElevenLabsTTSProvider
from .openai_tts import OpenAITTSProvider
from .polly_tts import PollyTTSProvider
from .azure_tts import AzureSpeechTTSProvider
from .providers import TTSProvider


def get_provider(name: str, *, config: dict[str, Any]) -> TTSProvider:
    if name == "dry-run":
        cfg = get_provider_config(config, "dry-run")
        wpm = cfg.get("wpm", 165.0)
        try:
            wpm = float(wpm)
        except Exception as e:  # noqa: BLE001
            raise CompileError("providers.dry-run.wpm must be a number") from e
        return DryRunProvider(wpm=wpm)
    if name == "openai":
        cfg = get_provider_config(config, "openai")
        return OpenAITTSProvider(
            api_key=str(cfg.get("api_key", "")),
            base_url=str(cfg.get("base_url", "https://api.openai.com/v1/audio/speech")),
            default_model=str(cfg.get("model", "gpt-4o-mini-tts")),
            default_voice=str(cfg.get("voice", "alloy")),
        )
    if name == "elevenlabs":
        cfg = get_provider_config(config, "elevenlabs")
        voice_settings = cfg.get("voice_settings")
        if voice_settings is not None and not isinstance(voice_settings, dict):
            raise CompileError("providers.elevenlabs.voice_settings must be a mapping")
        pdl = cfg.get("pronunciation_dictionary_locators")
        if pdl is not None and not isinstance(pdl, list):
            raise CompileError("providers.elevenlabs.pronunciation_dictionary_locators must be a list")
        if isinstance(pdl, list):
            for i, item in enumerate(pdl):
                if not isinstance(item, dict):
                    raise CompileError(
                        f"providers.elevenlabs.pronunciation_dictionary_locators[{i}] must be a mapping"
                    )
        return ElevenLabsTTSProvider(
            api_key=str(cfg.get("api_key", "")),
            voice_id=str(cfg.get("voice_id", "")),
            model_id=str(cfg.get("model_id", "eleven_multilingual_v2")),
            base_url=str(cfg.get("base_url", "https://api.elevenlabs.io")),
            voice_settings=voice_settings,
            output_format=str(cfg.get("output_format", "")) or None,
            pronunciation_dictionary_locators=pdl,
        )
    if name == "aws-polly" or name == "aws":
        cfg = get_provider_config(config, "aws_polly")
        return PollyTTSProvider(
            region=str(cfg.get("region", "us-east-1")),
            voice_id=str(cfg.get("voice_id", "Joanna")),
            engine=str(cfg.get("engine", "standard")),
            language_code=str(cfg["language_code"]) if "language_code" in cfg else None,
        )
    if name == "azure-speech" or name == "azure":
        cfg = get_provider_config(config, "azure_speech")
        return AzureSpeechTTSProvider(
            api_key=str(cfg.get("api_key", "")),
            region=str(cfg.get("region", "")),
            voice_name=str(cfg.get("voice", "en-US-JennyNeural")),
        )
    raise CompileError(
        f'Unknown TTS provider "{name}". Currently supported: dry-run, elevenlabs, openai, aws-polly (or aws), azure-speech (or azure)'
    )
