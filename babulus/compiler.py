from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .errors import CompileError
from .models import Bullet, CuePoint, Scene, Script
from .parser import AstScene, TimeRange, parse_dsl
from .transcript import TranscriptWord, find_subsequence, load_transcript_words
from .util import slugify, split_words
from .yaml_parser import load_babulus_yaml


@dataclass(frozen=True)
class CompileOptions:
    strict: bool = False


def _ensure_unique(ids: list[str], what: str) -> None:
    seen: set[str] = set()
    for i in ids:
        if i in seen:
            raise CompileError(f"Duplicate {what} id: {i}")
        seen.add(i)


def _resolve_time_range(scene_start: Optional[float], tr: TimeRange, what: str) -> tuple[float, float]:
    if tr.start_is_relative or tr.end_is_relative:
        if scene_start is None:
            raise CompileError(f"{what} uses relative time but scene has no start time")
        start = scene_start + tr.start
        end = scene_start + tr.end
    else:
        start = tr.start
        end = tr.end
    if end < start:
        raise CompileError(f"{what} time range end before start")
    return start, end


def _align_cue_from_transcript(
    cue_text: str, transcript: list[TranscriptWord], cursor: int
) -> tuple[float, float, int]:
    query = split_words(cue_text)
    if not query:
        raise CompileError("Cue missing text for transcript alignment")
    hay = [w.norm for w in transcript]
    match = find_subsequence(hay, query, cursor)
    if match is None:
        preview = " ".join(query[:12])
        raise CompileError(f'Could not align cue text in transcript: "{preview}..."')
    start_i, end_i = match
    start_sec = transcript[start_i].start
    end_sec = transcript[end_i].end
    return start_sec, end_sec, end_i + 1


def compile_script(
    scenes: list[AstScene],
    *,
    transcript_words: Optional[list[TranscriptWord]] = None,
    options: CompileOptions = CompileOptions(),
) -> Script:
    _ensure_unique([s.id for s in scenes], "scene")

    out_scenes: list[Scene] = []
    transcript_cursor = 0

    for scene in scenes:
        _ensure_unique([c.id for c in scene.cues], f'cue in scene "{scene.id}"')

        scene_start: Optional[float] = None
        scene_end: Optional[float] = None
        if scene.time is not None:
            scene_start, scene_end = _resolve_time_range(None, scene.time, f'Scene "{scene.id}"')

        out_cues: list[CuePoint] = []
        for cue in scene.cues:
            if cue.time is not None:
                cue_start, cue_end = _resolve_time_range(scene_start, cue.time, f'Cue "{cue.id}"')
            else:
                if transcript_words is None:
                    if scene_start is not None and scene_end is not None and len(scene.cues) == 1:
                        cue_start, cue_end = scene_start, scene_end
                    else:
                        if options.strict:
                            raise CompileError(
                                f'Cue "{cue.id}" is missing time and no transcript provided'
                            )
                        raise CompileError(
                            f'Cue "{cue.id}" is missing time; provide a transcript to auto-align'
                        )
                else:
                    cue_start, cue_end, transcript_cursor = _align_cue_from_transcript(
                        cue.text, transcript_words, transcript_cursor
                    )

            bullets = [Bullet(id=slugify(t), text=t) for t in cue.bullets]
            out_cues.append(
                CuePoint(
                    id=cue.id,
                    label=cue.label,
                    startSec=cue_start,
                    endSec=cue_end,
                    text=cue.text,
                    bullets=bullets,
                )
            )

        if not out_cues:
            raise CompileError(f'Scene "{scene.id}" has no cues')

        # Derive scene times if missing.
        if scene_start is None or scene_end is None:
            scene_start = min(c.startSec for c in out_cues)
            scene_end = max(c.endSec for c in out_cues)

        # Validate cue containment and (simple) non-overlap.
        out_cues_sorted = sorted(out_cues, key=lambda c: (c.startSec, c.endSec, c.id))
        prev_end = None
        for c in out_cues_sorted:
            if c.startSec < scene_start - 1e-6 or c.endSec > scene_end + 1e-6:
                raise CompileError(
                    f'Cue "{c.id}" falls outside scene "{scene.id}" time range'
                )
            if prev_end is not None and c.startSec < prev_end - 1e-6:
                raise CompileError(f'Cues overlap in scene "{scene.id}" near "{c.id}"')
            prev_end = c.endSec

        out_scenes.append(
            Scene(
                id=scene.id,
                title=scene.title,
                startSec=scene_start,
                endSec=scene_end,
                cues=out_cues_sorted,
            )
        )

    # Validate non-overlapping scenes globally.
    out_scenes_sorted = sorted(out_scenes, key=lambda s: (s.startSec, s.endSec, s.id))
    prev_end = None
    for s in out_scenes_sorted:
        if prev_end is not None and s.startSec < prev_end - 1e-6:
            raise CompileError(f'Scenes overlap near "{s.id}"')
        prev_end = s.endSec

    return Script(scenes=out_scenes_sorted)


def compile_dsl_text(
    dsl_text: str,
    *,
    is_yaml: bool = False,
    transcript_path: Optional[str] = None,
    options: CompileOptions = CompileOptions(),
) -> Script:
    ast_scenes = load_babulus_yaml(dsl_text) if is_yaml else parse_dsl(dsl_text)
    transcript_words = load_transcript_words(transcript_path) if transcript_path else None
    return compile_script(ast_scenes, transcript_words=transcript_words, options=options)


def compile_file(
    path: str,
    *,
    transcript_path: Optional[str] = None,
    options: CompileOptions = CompileOptions(),
) -> Script:
    from pathlib import Path

    p = Path(path)
    text = p.read_text(encoding="utf-8")
    suffixes = "".join(p.suffixes).lower()
    is_yaml = suffixes.endswith(".yml") or suffixes.endswith(".yaml")
    return compile_dsl_text(text, is_yaml=is_yaml, transcript_path=transcript_path, options=options)
