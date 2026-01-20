"""Static asset resolution for pre-generated audio files.

This module provides utilities for managing and resolving static audio assets
that can be referenced from the Babulus DSL without regeneration.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Literal

from .cache_resolver import resolve_env_cache_dir
from .errors import BabulusError


def resolve_static_asset(
    out_dir: Path,
    kind: Literal["segments", "sfx", "music"],
    filename: str,
) -> Path:
    """Resolve path to a static asset.

    Args:
        out_dir: Base output directory
        kind: Type of audio asset
        filename: Filename of the asset

    Returns:
        Path to the static asset

    Raises:
        BabulusError: If asset file does not exist

    Example:
        path = resolve_static_asset(
            Path(".babulus/out/intro"),
            "music",
            "intro-theme-v3.mp3"
        )
    """
    static_dir = resolve_env_cache_dir(out_dir, "static")
    asset_path = static_dir / kind / filename

    if not asset_path.exists():
        raise BabulusError(
            f"Static asset not found: {asset_path}\\n"
            f"Use 'babulus static promote' to create static assets from generated audio."
        )

    return asset_path


def resolve_file_asset(base_path: Path, file_url: str) -> Path:
    """Resolve a file:// URL to an absolute path.

    Args:
        base_path: Base directory for relative paths
        file_url: URL starting with file://

    Returns:
        Resolved absolute path

    Raises:
        BabulusError: If file does not exist

    Example:
        path = resolve_file_asset(
            Path("/Users/ryan/project"),
            "file://assets/music/intro.mp3"
        )
    """
    if not file_url.startswith("file://"):
        raise BabulusError(f"Invalid file URL: {file_url}")

    relative_path = file_url[7:]  # Strip "file://"
    file_path = Path(relative_path)

    # If not absolute, resolve relative to base_path
    if not file_path.is_absolute():
        file_path = base_path / file_path

    file_path = file_path.resolve()

    if not file_path.exists():
        raise BabulusError(f"File not found: {file_path}")

    return file_path


def list_static_assets(
    out_dir: Path,
    kind: Literal["segments", "sfx", "music"] | None = None,
) -> list[dict[str, str | int]]:
    """List all static assets in the static directory.

    Args:
        out_dir: Base output directory
        kind: Optional filter by asset type

    Returns:
        List of dicts with keys: kind, filename, size_bytes, path
    """
    static_dir = resolve_env_cache_dir(out_dir, "static")

    if not static_dir.exists():
        return []

    assets: list[dict[str, str | int]] = []

    kinds_to_check = [kind] if kind else ["segments", "sfx", "music"]

    for k in kinds_to_check:
        kind_dir = static_dir / k
        if not kind_dir.exists():
            continue

        for asset_file in kind_dir.iterdir():
            if not asset_file.is_file():
                continue

            assets.append({
                "kind": k,
                "filename": asset_file.name,
                "size_bytes": asset_file.stat().st_size,
                "path": str(asset_file),
            })

    return sorted(assets, key=lambda x: (x["kind"], x["filename"]))


def promote_to_static(
    out_dir: Path,
    env: str,
    clip_id: str,
    kind: Literal["segments", "sfx", "music"],
    variant: int | None,
    output_filename: str,
) -> Path:
    """Promote a generated audio clip to a static asset.

    Args:
        out_dir: Base output directory
        env: Source environment containing the generated audio
        clip_id: Clip identifier
        kind: Type of audio
        variant: Variant index (for sfx/music, None for segments)
        output_filename: Desired filename for the static asset

    Returns:
        Path to the created static asset

    Raises:
        BabulusError: If source file not found or target already exists

    Example:
        path = promote_to_static(
            Path(".babulus/out/intro"),
            "production",
            "intro-music",
            "music",
            2,
            "intro-theme-v3.mp3"
        )
    """
    env_dir = resolve_env_cache_dir(out_dir, env)
    kind_dir = env_dir / kind

    if not kind_dir.exists():
        raise BabulusError(f"No {kind} directory found in environment '{env}'")

    # Find the source file
    if kind == "segments":
        # Segments don't have variant numbers in the same way
        candidates = list(kind_dir.glob(f"{clip_id}--*"))
    else:
        # SFX and music have variant numbers
        if variant is None:
            raise BabulusError(f"Variant number required for {kind}")
        candidates = list(kind_dir.glob(f"{clip_id}--v{variant + 1}--*"))

    if not candidates:
        raise BabulusError(
            f"No {kind} file found for clip '{clip_id}' in environment '{env}'"
            + (f" variant {variant}" if variant is not None else "")
        )

    if len(candidates) > 1:
        raise BabulusError(
            f"Multiple {kind} files found for clip '{clip_id}': {[c.name for c in candidates]}. "
            "This shouldn't happen - please check your cache."
        )

    source_file = candidates[0]

    # Create static asset directory
    static_dir = resolve_env_cache_dir(out_dir, "static")
    static_kind_dir = static_dir / kind
    static_kind_dir.mkdir(parents=True, exist_ok=True)

    # Copy to static directory
    target_file = static_kind_dir / output_filename

    if target_file.exists():
        raise BabulusError(
            f"Static asset already exists: {target_file}\\n"
            "Use 'babulus static remove' to delete it first."
        )

    shutil.copy2(source_file, target_file)

    return target_file


def remove_static_asset(
    out_dir: Path,
    kind: Literal["segments", "sfx", "music"],
    filename: str,
) -> None:
    """Remove a static asset.

    Args:
        out_dir: Base output directory
        kind: Type of audio asset
        filename: Filename to remove

    Raises:
        BabulusError: If asset doesn't exist
    """
    static_dir = resolve_env_cache_dir(out_dir, "static")
    asset_path = static_dir / kind / filename

    if not asset_path.exists():
        raise BabulusError(f"Static asset not found: {asset_path}")

    asset_path.unlink()
