from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from .errors import CompileError, ParseError


def _load_yaml_file(path: Path) -> dict[str, Any]:
    """
    Load config using dotyaml when available, otherwise fall back to PyYAML.

    dotyaml provides env-var overrides and optional .env loading.
    We primarily use it as a structured YAML loader returning a dict.
    """
    try:
        from dotyaml import ConfigLoader  # type: ignore

        loader = ConfigLoader(prefix="BABULUS")
        obj = loader.load_from_yaml(str(path))
    except Exception as e:  # noqa: BLE001
        # dotyaml is optional at runtime (it requires Python >= 3.11).
        # If it's not installed, fall back to plain YAML parsing.
        try:
            import yaml  # type: ignore

            obj = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as e2:  # noqa: BLE001
            raise ParseError(f"Invalid config: {path}") from e2
    if obj is None:
        return {}
    if not isinstance(obj, dict):
        raise ParseError(f"Config must be a mapping: {path}")
    return obj


def find_config_path(project_dir: str | Path | None = None, dsl_path: Path | None = None) -> Path | None:
    """
    Search order:
      - if BABULUS_PATH is set: use that (file) or that/config.yml (dir)
      - if dsl_path provided: walk up from DSL looking for .babulus/config.yml
      - if project_dir provided: use project_dir/.babulus/config.yml
      - ./.babulus/config.yml (current directory)
      - ~/.babulus/config.yml
    """
    override = os.getenv("BABULUS_PATH")
    if override:
        p = Path(override).expanduser()
        if p.is_dir():
            p = p / "config.yml"
        if p.exists():
            return p
        raise ParseError(f"BABULUS_PATH is set but config not found: {p}")

    # NEW: If DSL path provided, walk up from DSL location
    if dsl_path:
        project_root = find_project_root(dsl_path)
        local = project_root / ".babulus" / "config.yml"
        if local.exists():
            return local

    # If project_dir provided, use it
    if project_dir:
        project_root = Path(project_dir)
        local = project_root / ".babulus" / "config.yml"
        if local.exists():
            return local

    # Fall back to current directory
    project_root = Path.cwd()
    local = project_root / ".babulus" / "config.yml"
    if local.exists():
        return local

    # Fall back to home directory
    home = Path.home() / ".babulus" / "config.yml"
    if home.exists():
        return home
    return None


def find_project_root(dsl_path: Path) -> Path:
    """
    Find project root by walking up from DSL location looking for:
    1. .babulus/ directory
    2. .git/ directory
    3. Otherwise return DSL's parent directory

    Args:
        dsl_path: Absolute path to DSL file

    Returns:
        Absolute path to project root
    """
    current = dsl_path.parent.resolve()

    # Walk up looking for .babulus/ or .git/
    while current != current.parent:
        if (current / ".babulus").exists():
            return current
        if (current / ".git").exists():
            return current
        current = current.parent

    # Fall back to DSL's parent directory
    return dsl_path.parent.resolve()


def load_config(project_dir: str | Path | None = None, dsl_path: Path | None = None) -> dict[str, Any]:
    path = find_config_path(project_dir, dsl_path)
    if path is None:
        return {}
    return _load_yaml_file(path)


def get_provider_config(config: dict[str, Any], provider: str) -> dict[str, Any]:
    providers = config.get("providers") or {}
    if not isinstance(providers, dict):
        raise ParseError("config.providers must be a mapping")
    cfg = providers.get(provider) or {}
    if not isinstance(cfg, dict):
        raise ParseError(f"config.providers.{provider} must be a mapping")
    return cfg


def get_default_provider(config: dict[str, Any]) -> str | None:
    tts = config.get("tts") or {}
    if not isinstance(tts, dict):
        raise ParseError("config.tts must be a mapping")
    p = tts.get("default_provider")
    if p is None:
        return None
    if not isinstance(p, str):
        raise ParseError("config.tts.default_provider must be a string")
    return p


def get_default_sfx_provider(config: dict[str, Any]) -> str | None:
    audio = config.get("audio") or {}
    if not isinstance(audio, dict):
        raise ParseError("config.audio must be a mapping")
    p = audio.get("default_sfx_provider")
    if p is None:
        return None
    if not isinstance(p, str):
        raise ParseError("config.audio.default_sfx_provider must be a string")
    return p


def get_default_music_provider(config: dict[str, Any]) -> str | None:
    audio = config.get("audio") or {}
    if not isinstance(audio, dict):
        raise ParseError("config.audio must be a mapping")
    p = audio.get("default_music_provider")
    if p is None:
        return None
    if not isinstance(p, str):
        raise ParseError("config.audio.default_music_provider must be a string")
    return p
