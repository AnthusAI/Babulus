from __future__ import annotations

from dataclasses import field
from typing import Any

from .errors import ParseError
from .parser import AstCue, AstScene, TimeRange, parse_time_range
from .util import slugify


def _require_mapping(obj: Any, where: str) -> dict[str, Any]:
    if not isinstance(obj, dict):
        raise ParseError(f"Expected mapping at {where}")
    return obj


def _require_list(obj: Any, where: str) -> list[Any]:
    if not isinstance(obj, list):
        raise ParseError(f"Expected list at {where}")
    return obj


def _opt_str(obj: Any, where: str) -> str | None:
    if obj is None:
        return None
    if not isinstance(obj, str):
        raise ParseError(f"Expected string at {where}")
    return obj


def _opt_num(obj: Any, where: str) -> float | None:
    if obj is None:
        return None
    if not isinstance(obj, (int, float)):
        raise ParseError(f"Expected number at {where}")
    return float(obj)


def _parse_time(obj: Any, where: str) -> TimeRange | None:
    if obj is None:
        return None
    if isinstance(obj, str):
        return parse_time_range(obj)
    if isinstance(obj, dict):
        start = _opt_num(obj.get("startSec"), f"{where}.startSec")
        end = _opt_num(obj.get("endSec"), f"{where}.endSec")
        if start is None or end is None:
            raise ParseError(f"Expected {where}.time to have startSec/endSec")
        if end < start:
            raise ParseError(f"{where}.time endSec before startSec")
        return TimeRange(start=start, end=end, start_is_relative=False, end_is_relative=False)
    raise ParseError(f"Expected string or mapping at {where}.time")


def _parse_bullets(obj: Any, where: str) -> list[str]:
    if obj is None:
        return []
    if isinstance(obj, list):
        out: list[str] = []
        for idx, item in enumerate(obj):
            if not isinstance(item, str):
                raise ParseError(f"Expected string bullet at {where}[{idx}]")
            out.append(item)
        return out
    raise ParseError(f"Expected list at {where}")


def parse_babulus_yaml(yaml_obj: Any) -> list[AstScene]:
    root = _require_mapping(yaml_obj, "document")
    scenes_raw = _require_list(root.get("scenes"), "scenes")

    scenes: list[AstScene] = []
    for s_idx, scene_obj in enumerate(scenes_raw):
        s = _require_mapping(scene_obj, f"scenes[{s_idx}]")
        scene_id = _opt_str(s.get("id"), f"scenes[{s_idx}].id")
        scene_title = _opt_str(s.get("title"), f"scenes[{s_idx}].title")
        if not scene_title:
            raise ParseError(f"Missing scenes[{s_idx}].title")
        if not scene_id:
            scene_id = slugify(scene_title)

        scene_time = _parse_time(s.get("time"), f"scenes[{s_idx}]")
        if scene_time and (scene_time.start_is_relative or scene_time.end_is_relative):
            raise ParseError("Scene time ranges must be absolute (no + offsets)")

        cues_raw = _require_list(s.get("cues"), f"scenes[{s_idx}].cues")
        cues: list[AstCue] = []
        for c_idx, cue_obj in enumerate(cues_raw):
            c = _require_mapping(cue_obj, f"scenes[{s_idx}].cues[{c_idx}]")
            label = _opt_str(c.get("label"), f"scenes[{s_idx}].cues[{c_idx}].label")
            if not label:
                raise ParseError(f"Missing scenes[{s_idx}].cues[{c_idx}].label")
            cue_id = _opt_str(c.get("id"), f"scenes[{s_idx}].cues[{c_idx}].id") or slugify(label)
            cue_time = _parse_time(c.get("time"), f"scenes[{s_idx}].cues[{c_idx}]")
            cue_text = (
                _opt_str(c.get("voice"), f"scenes[{s_idx}].cues[{c_idx}].voice")
                or _opt_str(c.get("text"), f"scenes[{s_idx}].cues[{c_idx}].text")
                or ""
            )
            bullets = _parse_bullets(c.get("bullets"), f"scenes[{s_idx}].cues[{c_idx}].bullets")
            cues.append(AstCue(id=cue_id, label=label, time=cue_time, text=cue_text, bullets=bullets))

        scenes.append(AstScene(id=scene_id, title=scene_title, time=scene_time, cues=cues))

    return scenes


def load_babulus_yaml(text: str) -> list[AstScene]:
    try:
        import yaml  # type: ignore
    except Exception as e:  # noqa: BLE001
        raise ParseError(
            "PyYAML is required to parse .babulus.yml files. Install with: pip install pyyaml"
        ) from e
    try:
        obj = yaml.safe_load(text)
    except Exception as e:  # noqa: BLE001
        raise ParseError(f"Invalid YAML: {e}") from e
    return parse_babulus_yaml(obj)
