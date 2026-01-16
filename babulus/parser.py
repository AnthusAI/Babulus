from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from typing import Optional

from .errors import ParseError
from .util import slugify


_scene_header = re.compile(r"^scene\s+(?P<name>.+?)(?:\s+@(?P<range>[^:]+))?:\s*$")
_cue_header = re.compile(r"^cue\s+(?P<name>.+?)(?:\s+@(?P<range>[^:]+))?:\s*$")
_title_stmt = re.compile(r"^title\s+(?P<value>.+?)\s*$")
_text_stmt = re.compile(r"^text\s+(?P<value>.+?)\s*$")
_bullets_stmt = re.compile(r"^bullets\s*:\s*$")
_bullet_item = re.compile(r"^-\s+(?P<value>.+?)\s*$")


@dataclass(frozen=True)
class TimeRange:
    start: float
    end: float
    start_is_relative: bool = False
    end_is_relative: bool = False


@dataclass
class AstCue:
    id: str
    label: str
    time: Optional[TimeRange] = None
    text: str = ""
    bullets: list[str] = field(default_factory=list)


@dataclass
class AstScene:
    id: str
    title: str
    time: Optional[TimeRange] = None
    cues: list[AstCue] = field(default_factory=list)


def _parse_string(token: str) -> str:
    token = token.strip()
    if not token.startswith('"'):
        raise ParseError('Expected a string literal like "..."')
    try:
        value = ast.literal_eval(token)
    except Exception as e:  # noqa: BLE001 - parse errors
        raise ParseError(f"Invalid string literal: {token}") from e
    if not isinstance(value, str):
        raise ParseError(f"Invalid string literal: {token}")
    return value


def _parse_name(token: str) -> tuple[str, str]:
    token = token.strip()
    if token.startswith('"'):
        label = _parse_string(token)
        return slugify(label), label
    # bare identifier
    name = token.split()[0]
    return name, name


def _parse_seconds(token: str) -> tuple[float, bool]:
    token = token.strip()
    is_relative = token.startswith("+")
    if is_relative:
        token = token[1:]
    if not token.endswith("s"):
        raise ParseError(f'Expected seconds like "12.5s", got "{token}"')
    num = token[:-1].strip()
    try:
        val = float(num)
    except ValueError as e:
        raise ParseError(f'Invalid seconds value: "{token}"') from e
    return val, is_relative


def _parse_time_range(spec: str) -> TimeRange:
    spec = spec.strip()
    parts = spec.split("-")
    if len(parts) != 2:
        raise ParseError(f'Expected time range like "0s-8s", got "{spec}"')
    start_val, start_rel = _parse_seconds(parts[0])
    end_val, end_rel = _parse_seconds(parts[1])
    if end_val < start_val:
        raise ParseError(f"Time range end before start: {spec}")
    return TimeRange(start=start_val, end=end_val, start_is_relative=start_rel, end_is_relative=end_rel)


def parse_dsl(text: str) -> list[AstScene]:
    lines = text.splitlines()
    i = 0
    scenes: list[AstScene] = []

    def line_indent(raw: str) -> int:
        return len(raw) - len(raw.lstrip(" "))

    while i < len(lines):
        raw = lines[i]
        i += 1
        if not raw.strip() or raw.strip().startswith("#"):
            continue
        if line_indent(raw) != 0:
            raise ParseError(f"Top-level statement must be unindented: {raw}")
        m = _scene_header.match(raw.strip())
        if not m:
            raise ParseError(f"Expected scene header, got: {raw}")
        scene_name = m.group("name")
        scene_id, scene_label = _parse_name(scene_name)
        tr = m.group("range")
        scene_time = _parse_time_range(tr) if tr else None
        if scene_time and (scene_time.start_is_relative or scene_time.end_is_relative):
            raise ParseError("Scene time ranges must be absolute (no + offsets)")
        scene = AstScene(id=scene_id, title=scene_label, time=scene_time)

        # Parse scene body (indent > 0 until next top-level)
        while i < len(lines):
            raw2 = lines[i]
            if not raw2.strip() or raw2.strip().startswith("#"):
                i += 1
                continue
            if line_indent(raw2) == 0:
                break
            if line_indent(raw2) < 2:
                raise ParseError(f"Expected scene body indentation: {raw2}")
            stmt = raw2.strip()
            i += 1

            t = _title_stmt.match(stmt)
            if t:
                scene.title = _parse_string(t.group("value"))
                continue

            c = _cue_header.match(stmt)
            if not c:
                raise ParseError(f"Unexpected scene statement: {stmt}")
            cue_name = c.group("name")
            cue_id, cue_label = _parse_name(cue_name)
            cue_tr = c.group("range")
            cue_time = _parse_time_range(cue_tr) if cue_tr else None
            cue = AstCue(id=cue_id, label=cue_label, time=cue_time)

            # Parse cue body (indent > scene body)
            while i < len(lines):
                raw3 = lines[i]
                if not raw3.strip() or raw3.strip().startswith("#"):
                    i += 1
                    continue
                if line_indent(raw3) <= 2:
                    break
                if line_indent(raw3) < 4:
                    raise ParseError(f"Expected cue body indentation: {raw3}")
                stmt2 = raw3.strip()
                i += 1

                tx = _text_stmt.match(stmt2)
                if tx:
                    cue.text = _parse_string(tx.group("value"))
                    continue
                if _bullets_stmt.match(stmt2):
                    # Parse bullet list items
                    while i < len(lines):
                        raw4 = lines[i]
                        if not raw4.strip() or raw4.strip().startswith("#"):
                            i += 1
                            continue
                        if line_indent(raw4) <= 4:
                            break
                        bi = _bullet_item.match(raw4.strip())
                        if not bi:
                            raise ParseError(f"Expected bullet item '- ...', got: {raw4.strip()}")
                        cue.bullets.append(_parse_string(bi.group("value")))
                        i += 1
                    continue

                raise ParseError(f"Unexpected cue statement: {stmt2}")

            scene.cues.append(cue)

        scenes.append(scene)

    return scenes


def parse_time_range(spec: str) -> TimeRange:
    return _parse_time_range(spec)
