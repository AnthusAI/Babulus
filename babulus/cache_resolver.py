"""Cache resolution with environment-aware fallback logic.

This module provides utilities for finding cached audio files across multiple
environments. When a cache miss occurs in the current environment, it searches
through a fallback chain of other environments to find compatible cached audio.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable, Literal, Optional

# Environment fallback order: development → aws → azure → production → static
_ENV_FALLBACK_CHAIN = ["development", "aws", "azure", "production", "static"]


def get_current_environment() -> str:
    """Get current environment from BABULUS_ENV, default to 'development'."""
    return os.environ.get("BABULUS_ENV", "development")


def get_environment_fallback_chain(current_env: str) -> list[str]:
    """Get the fallback chain starting from current environment.

    Args:
        current_env: Current environment name

    Returns:
        List of environment names to search in order

    Example:
        get_environment_fallback_chain("development")
        # Returns: ["development", "aws", "azure", "production", "static"]

        get_environment_fallback_chain("production")
        # Returns: ["production", "static"]
    """
    if current_env not in _ENV_FALLBACK_CHAIN:
        # Unknown environment, search all
        return [current_env] + _ENV_FALLBACK_CHAIN

    start_idx = _ENV_FALLBACK_CHAIN.index(current_env)
    return _ENV_FALLBACK_CHAIN[start_idx:]


def resolve_env_cache_dir(out_dir: Path, env: str) -> Path:
    """Resolve the cache directory for a specific environment.

    Args:
        out_dir: Base output directory (e.g., .babulus/out/<video>)
        env: Environment name

    Returns:
        Path to environment-specific cache directory

    Example:
        resolve_env_cache_dir(Path(".babulus/out/intro"), "development")
        # Returns: Path(".babulus/out/intro/env/development")
    """
    return out_dir / "env" / env


def _load_manifest(manifest_path: Path) -> dict[str, Any]:
    """Load manifest file, return empty dict if not found or invalid."""
    try:
        if not manifest_path.exists():
            return {}
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {}
        return data
    except Exception:  # noqa: BLE001
        return {}


def _get_manifest_duration(
    manifest: dict[str, Any],
    section: str,
    path: Path,
    expected_key: str
) -> float | None:
    """Get cached duration from manifest if cache key matches.

    Args:
        manifest: Loaded manifest dict
        section: Section name ("segments", "sfx", "music")
        path: Path to audio file
        expected_key: Expected cache key hash

    Returns:
        Duration in seconds if found and valid, None otherwise
    """
    sec = manifest.get(section)
    if not isinstance(sec, dict):
        return None
    entry = sec.get(str(path))
    
    # Fallback: try matching by filename if exact path match fails.
    # This handles cases where CWD or project structure changes (e.g. running from root vs subdir).
    if entry is None:
        target_name = path.name
        for k, v in sec.items():
            if Path(k).name == target_name:
                entry = v
                break

    if not isinstance(entry, dict):
        return None
    if entry.get("key") != expected_key:
        return None
    dur = entry.get("durationSec")
    if not isinstance(dur, (int, float)):
        return None
    return float(dur)


def resolve_cached_audio(
    out_dir: Path,
    current_env: str,
    cache_key: str,
    kind: Literal["segments", "sfx", "music"],
    file_pattern: str,
    log: Callable[[str], None] | None = None,
) -> tuple[Path | None, str | None]:
    """Search for cached audio across environments with fallback.

    Args:
        out_dir: Base output directory
        current_env: Current environment
        cache_key: Cache key hash to match
        kind: Type of audio ("segments", "sfx", "music")
        file_pattern: Glob pattern to match files (e.g., "intro--*")
        log: Optional logging function

    Returns:
        Tuple of (path, environment) if found, (None, None) otherwise

    Example:
        path, env = resolve_cached_audio(
            Path(".babulus/out/intro"),
            "development",
            "abc123...",
            "segments",
            "intro--welcome--tts--abc123--*.mp3"
        )
        if path:
            print(f"Found cached audio at {path} from {env} environment")
    """
    _log = log or (lambda msg: None)

    fallback_chain = get_environment_fallback_chain(current_env)

    for env in fallback_chain:
        env_dir = resolve_env_cache_dir(out_dir, env)
        manifest_path = env_dir / "manifest.json"
        manifest = _load_manifest(manifest_path)

        # Search for files matching the pattern in this environment
        kind_dir = env_dir / kind
        if not kind_dir.exists():
            continue

        candidates = list(kind_dir.glob(file_pattern))

        for candidate in candidates:
            # Check if file exists and cache key matches
            if not candidate.exists():
                continue

            duration = _get_manifest_duration(manifest, kind, candidate, cache_key)
            if duration is not None:
                # Found valid cache entry
                if env != current_env:
                    _log(f"cache: fallback {kind}={candidate.name} from env={env}")
                return (candidate, env)

    return (None, None)


def resolve_cached_segment(
    out_dir: Path,
    current_env: str,
    cache_key: str,
    scene_id: str,
    cue_id: str,
    occurrence: int,
    extension: str,
    log: Callable[[str], None] | None = None,
) -> tuple[Path | None, str | None]:
    """Resolve cached TTS segment with environment fallback.

    Args:
        out_dir: Base output directory
        current_env: Current environment
        cache_key: Cache key hash (first 12 chars used in filename)
        scene_id: Scene ID
        cue_id: Cue ID
        occurrence: Occurrence number (for duplicate segments)
        extension: File extension (e.g., ".mp3", ".wav")
        log: Optional logging function

    Returns:
        Tuple of (path, environment) if found, (None, None) otherwise
    """
    # Build pattern that matches this specific segment
    hash_prefix = cache_key[:12]
    pattern = f"{scene_id}--{cue_id}--tts--{hash_prefix}--{occurrence}{extension}"

    return resolve_cached_audio(
        out_dir=out_dir,
        current_env=current_env,
        cache_key=cache_key,
        kind="segments",
        file_pattern=pattern,
        log=log,
    )


def resolve_cached_sfx(
    out_dir: Path,
    current_env: str,
    cache_key: str,
    clip_id: str,
    variant: int,
    extension: str,
    log: Callable[[str], None] | None = None,
) -> tuple[Path | None, str | None]:
    """Resolve cached SFX with environment fallback.

    Args:
        out_dir: Base output directory
        current_env: Current environment
        cache_key: Cache key hash (first 12 chars used in filename)
        clip_id: Clip ID
        variant: Variant number (0-indexed)
        extension: File extension
        log: Optional logging function

    Returns:
        Tuple of (path, environment) if found, (None, None) otherwise
    """
    hash_prefix = cache_key[:12]
    pattern = f"{clip_id}--v{variant + 1}--{hash_prefix}{extension}"

    return resolve_cached_audio(
        out_dir=out_dir,
        current_env=current_env,
        cache_key=cache_key,
        kind="sfx",
        file_pattern=pattern,
        log=log,
    )


def resolve_cached_music(
    out_dir: Path,
    current_env: str,
    cache_key: str,
    clip_id: str,
    variant: int,
    extension: str,
    log: Callable[[str], None] | None = None,
) -> tuple[Path | None, str | None]:
    """Resolve cached music with environment fallback.

    Args:
        out_dir: Base output directory
        current_env: Current environment
        cache_key: Cache key hash (first 12 chars used in filename)
        clip_id: Clip ID
        variant: Variant number (0-indexed)
        extension: File extension
        log: Optional logging function

    Returns:
        Tuple of (path, environment) if found, (None, None) otherwise
    """
    hash_prefix = cache_key[:12]
    pattern = f"{clip_id}--v{variant + 1}--{hash_prefix}{extension}"

    return resolve_cached_audio(
        out_dir=out_dir,
        current_env=current_env,
        cache_key=cache_key,
        kind="music",
        file_pattern=pattern,
        log=log,
    )
