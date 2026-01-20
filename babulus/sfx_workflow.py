from __future__ import annotations

import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import BabulusError
from .cache_resolver import resolve_env_cache_dir


@dataclass(frozen=True)
class SfxSelectionState:
    # clipId -> pick index
    picks: dict[str, int]


def selection_path(out_dir: str | Path, env: str | None = None) -> Path:
    """Get path to selections.json for a specific environment.

    Args:
        out_dir: Base output directory
        env: Environment name (defaults to BABULUS_ENV)

    Returns:
        Path to selections.json in environment-specific directory
    """
    if env is None:
        env = os.environ.get("BABULUS_ENV", "development")
    env_dir = resolve_env_cache_dir(Path(out_dir), env)
    return env_dir / "selections.json"


def load_selections(out_dir: str | Path, env: str | None = None) -> SfxSelectionState:
    """Load selections from environment-specific selections.json.

    Args:
        out_dir: Base output directory
        env: Environment name (defaults to BABULUS_ENV)
    """
    path = selection_path(out_dir, env)
    if not path.exists():
        return SfxSelectionState(picks={})
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        raise BabulusError(f"Invalid selections file: {path}") from e
    if not isinstance(obj, dict):
        raise BabulusError(f"Invalid selections file: {path}")
    raw = obj.get("sfx_picks", {})
    if raw is None:
        return SfxSelectionState(picks={})
    if not isinstance(raw, dict):
        raise BabulusError(f"Invalid selections file: {path} (sfx_picks must be a mapping)")
    picks: dict[str, int] = {}
    for k, v in raw.items():
        if not isinstance(k, str):
            continue
        if not isinstance(v, int):
            continue
        picks[k] = v
    return SfxSelectionState(picks=picks)


def save_selections(out_dir: str | Path, state: SfxSelectionState, env: str | None = None) -> None:
    """Save selections to environment-specific selections.json.

    Args:
        out_dir: Base output directory
        state: Selection state to save
        env: Environment name (defaults to BABULUS_ENV)
    """
    path = selection_path(out_dir, env)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps({"version": 1, "sfx_picks": state.picks}, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def set_pick(out_dir: str | Path, *, clip_id: str, pick: int, env: str | None = None) -> int:
    """Set the selected variant for a clip in a specific environment.

    Args:
        out_dir: Base output directory
        clip_id: Clip identifier
        pick: Variant index to select
        env: Environment name (defaults to BABULUS_ENV)
    """
    if pick < 0:
        raise BabulusError("--pick must be >= 0")
    state = load_selections(out_dir, env)
    picks = dict(state.picks)
    picks[clip_id] = int(pick)
    save_selections(out_dir, SfxSelectionState(picks=picks), env)
    return int(pick)


def bump_pick(out_dir: str | Path, *, clip_id: str, delta: int, variants: int, env: str | None = None) -> int:
    """Cycle to next/previous variant for a clip in a specific environment.

    Args:
        out_dir: Base output directory
        clip_id: Clip identifier
        delta: Amount to change (+1 for next, -1 for previous)
        variants: Total number of variants
        env: Environment name (defaults to BABULUS_ENV)
    """
    if variants <= 0:
        raise BabulusError("variants must be > 0")
    state = load_selections(out_dir, env)
    cur = int(state.picks.get(clip_id, 0))
    nxt = (cur + int(delta)) % int(variants)
    return set_pick(out_dir, clip_id=clip_id, pick=nxt, env=env)


def archive_variants(
    *,
    out_dir: str | Path,
    clip_id: str,
    keep_variant: int | None,
    env: str | None = None,
) -> int:
    """
    Move cached variant files for a clip from env-specific sfx/ to sfx_archived/<clip_id>/.
    If keep_variant is not None, keep that variant in-place.
    Returns number of files moved.

    Args:
        out_dir: Base output directory
        clip_id: Clip identifier
        keep_variant: Variant index to keep (others archived), or None to archive all
        env: Environment name (defaults to BABULUS_ENV)
    """
    if env is None:
        env = os.environ.get("BABULUS_ENV", "development")
    env_dir = resolve_env_cache_dir(Path(out_dir), env)
    live_dir = env_dir / "sfx"
    if not live_dir.exists():
        return 0
    archived_dir = env_dir / "sfx_archived" / clip_id
    archived_dir.mkdir(parents=True, exist_ok=True)

    moved = 0
    for p in live_dir.glob(f"{clip_id}--v*--*.*"):
        if not p.is_file():
            continue
        # Filename format: <clipId>--v<index>--<hash>.<ext>
        parts = p.name.split("--")
        if len(parts) < 3:
            continue
        vpart = parts[1]
        if not vpart.startswith("v"):
            continue
        try:
            v_index = int(vpart[1:]) - 1
        except Exception:  # noqa: BLE001
            continue
        if keep_variant is not None and v_index == int(keep_variant):
            continue
        dest = archived_dir / p.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), str(dest))
        moved += 1
    return moved


def restore_variants(*, out_dir: str | Path, clip_id: str, env: str | None = None) -> int:
    """Restore archived variants back to live sfx directory for a specific environment.

    Args:
        out_dir: Base output directory
        clip_id: Clip identifier
        env: Environment name (defaults to BABULUS_ENV)
    """
    if env is None:
        env = os.environ.get("BABULUS_ENV", "development")
    env_dir = resolve_env_cache_dir(Path(out_dir), env)
    archived_dir = env_dir / "sfx_archived" / clip_id
    live_dir = env_dir / "sfx"
    if not archived_dir.exists():
        return 0
    live_dir.mkdir(parents=True, exist_ok=True)
    moved = 0
    for p in archived_dir.glob("*.*"):
        if not p.is_file():
            continue
        dest = live_dir / p.name
        shutil.move(str(p), str(dest))
        moved += 1
    try:
        archived_dir.rmdir()
    except Exception:  # noqa: BLE001
        pass
    return moved


def clear_live_variants(*, out_dir: str | Path, clip_id: str, env: str | None = None) -> int:
    """
    Delete cached live variant files for a clip in a specific environment (forces re-generation next run).
    Returns number of files deleted.

    Args:
        out_dir: Base output directory
        clip_id: Clip identifier
        env: Environment name (defaults to BABULUS_ENV)
    """
    if env is None:
        env = os.environ.get("BABULUS_ENV", "development")
    env_dir = resolve_env_cache_dir(Path(out_dir), env)
    live_dir = env_dir / "sfx"
    if not live_dir.exists():
        return 0
    deleted = 0
    for p in live_dir.glob(f"{clip_id}--v*--*.*"):
        if not p.is_file():
            continue
        try:
            p.unlink()
            deleted += 1
        except Exception:  # noqa: BLE001
            pass
    return deleted

