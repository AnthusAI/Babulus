from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import BabulusError


@dataclass(frozen=True)
class SfxSelectionState:
    # clipId -> pick index
    picks: dict[str, int]


def selection_path(out_dir: str | Path) -> Path:
    return Path(out_dir) / "selections.json"


def load_selections(out_dir: str | Path) -> SfxSelectionState:
    path = selection_path(out_dir)
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


def save_selections(out_dir: str | Path, state: SfxSelectionState) -> None:
    path = selection_path(out_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps({"version": 1, "sfx_picks": state.picks}, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def set_pick(out_dir: str | Path, *, clip_id: str, pick: int) -> int:
    if pick < 0:
        raise BabulusError("--pick must be >= 0")
    state = load_selections(out_dir)
    picks = dict(state.picks)
    picks[clip_id] = int(pick)
    save_selections(out_dir, SfxSelectionState(picks=picks))
    return int(pick)


def bump_pick(out_dir: str | Path, *, clip_id: str, delta: int, variants: int) -> int:
    if variants <= 0:
        raise BabulusError("variants must be > 0")
    state = load_selections(out_dir)
    cur = int(state.picks.get(clip_id, 0))
    nxt = (cur + int(delta)) % int(variants)
    return set_pick(out_dir, clip_id=clip_id, pick=nxt)


def archive_variants(
    *,
    out_dir: str | Path,
    clip_id: str,
    keep_variant: int | None,
) -> int:
    """
    Move cached variant files for a clip from `<out_dir>/sfx/` to `<out_dir>/sfx_archived/<clip_id>/`.
    If keep_variant is not None, keep that variant in-place.
    Returns number of files moved.
    """
    out_dir_p = Path(out_dir)
    live_dir = out_dir_p / "sfx"
    if not live_dir.exists():
        return 0
    archived_dir = out_dir_p / "sfx_archived" / clip_id
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


def restore_variants(*, out_dir: str | Path, clip_id: str) -> int:
    out_dir_p = Path(out_dir)
    archived_dir = out_dir_p / "sfx_archived" / clip_id
    live_dir = out_dir_p / "sfx"
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


def clear_live_variants(*, out_dir: str | Path, clip_id: str) -> int:
    """
    Delete cached live variant files for a clip (forces re-generation next run).
    Returns number of files deleted.
    """
    out_dir_p = Path(out_dir)
    live_dir = out_dir_p / "sfx"
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

