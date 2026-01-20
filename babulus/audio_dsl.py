from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Literal, Optional

from .errors import ParseError
from .util import slugify


def _get_environment() -> str:
    """Get current environment from BABULUS_ENV, default to 'development'."""
    return os.environ.get("BABULUS_ENV", "development")


def _resolve_env_value(value: Any, where: str = "unknown") -> Any:
    """Resolve environment-specific value.

    If value is a dict with environment keys, return value[env].
    Otherwise return value as-is (backward compatible).
    """
    if not isinstance(value, dict):
        return value

    env = _get_environment()
    if env in value:
        return value[env]
    if "production" in value:
        return value["production"]
    # If it's a dict but no env keys found, this is likely an error
    # Return the original value and let the caller handle it
    return value


@dataclass(frozen=True)
class VolumeFadeToSpec:
    volume: float
    after_seconds: float
    fade_duration_seconds: float = 2.0


@dataclass(frozen=True)
class VolumeFadeOutSpec:
    volume: float
    before_end_seconds: float
    fade_duration_seconds: float = 2.0


@dataclass(frozen=True)
class AudioLibraryClip:
    id: str
    kind: Literal["file", "sfx", "music"]

    # file
    src: str | None = None

    # sfx
    prompt: str | None = None
    duration_seconds: float | None = None
    variants: int = 1
    pick: int = 0

    # music (generated)
    model_id: str | None = None
    force_instrumental: bool | None = None


@dataclass(frozen=True)
class CueRef:
    cueId: str
    offsetSec: float = 0.0


@dataclass(frozen=True)
class SceneRef:
    sceneId: str
    offsetSec: float = 0.0


@dataclass(frozen=True)
class StartAt:
    kind: Literal["absolute", "cue", "scene"]
    sec: float | None = None
    cue: CueRef | None = None
    scene: SceneRef | None = None


@dataclass(frozen=True)
class AudioClipSpec:
    id: str
    kind: Literal["file", "sfx", "music"]
    start: StartAt
    volume: float = 1.0
    fade_to: VolumeFadeToSpec | None = None
    fade_out: VolumeFadeOutSpec | None = None
    # If set, variants/caching are keyed on this id (lets you reuse one generated clip in many places).
    source_id: str | None = None
    # For music: by default plays for the current scene; if true, extend to end of video.
    play_through: bool = False

    # file
    src: str | None = None

    # sfx
    prompt: str | None = None
    durationSec: float | None = None
    variants: int = 1
    pick: int = 0

    # music
    model_id: str | None = None
    force_instrumental: bool | None = None


@dataclass(frozen=True)
class AudioTrackSpec:
    id: str
    kind: Literal["sfx", "music", "narration", "custom"] = "custom"
    clips: list[AudioClipSpec] = ()


@dataclass(frozen=True)
class AudioPlan:
    sfx_provider: str | None
    music_provider: str | None
    tracks: list[AudioTrackSpec]


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


def _parse_seconds_str(s: str, where: str) -> float:
    s = s.strip()
    if not s.endswith("s"):
        raise ParseError(f'Expected seconds like "0.5s" at {where}')
    try:
        return float(s[:-1])
    except ValueError as e:
        raise ParseError(f"Invalid seconds value at {where}") from e


def _parse_offset_seconds(value: Any, where: str) -> float | None:
    """
    Accept:
      - number (seconds)
      - string: "0.5", "0.5s", "+0.5s"
    Returns float seconds, or None.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        s = value.strip()
        if s.startswith("+"):
            s = s[1:].strip()
        if s.endswith("s"):
            s = s[:-1].strip()
        try:
            return float(s)
        except ValueError as e:
            raise ParseError(f"Invalid pause_seconds at {where}") from e
    raise ParseError(f"pause_seconds must be a number or string at {where}")

def _parse_volume(value: Any, where: str) -> float:
    """
    Accept either:
      - float 0..1 (Remotion volume)
      - int/float 0..100 (percent)
      - string "80%" or "0.8"
    Returns normalized 0..1.
    """
    if value is None:
        return 1.0
    if isinstance(value, str):
        s = value.strip()
        if s.endswith("%"):
            try:
                pct = float(s[:-1].strip())
            except ValueError as e:
                raise ParseError(f"Invalid volume percent at {where}") from e
            if pct < 0 or pct > 100:
                raise ParseError(f"volume percent must be 0..100 at {where}")
            return pct / 100.0
        try:
            num = float(s)
        except ValueError as e:
            raise ParseError(f"Invalid volume at {where}") from e
        value = num
    if not isinstance(value, (int, float)):
        raise ParseError(f"Expected number or percent string at {where}")
    v = float(value)
    if v < 0:
        raise ParseError(f"volume must be >= 0 at {where}")
    if v <= 1.0:
        return v
    if v <= 100.0:
        return v / 100.0
    raise ParseError(f"volume must be 0..1 or 0..100 at {where}")


def _parse_fade_to(value: Any, where: str) -> VolumeFadeToSpec | None:
    """
    fade_to:
      volume: 50%
      after_seconds: 4
      fade_duration_seconds: 2   # optional, default 2
    """
    if value is None:
        return None
    m = _require_mapping(value, where)
    vol_raw = m.get("volume", m.get("to", m.get("target_volume")))
    if vol_raw is None:
        raise ParseError(f"{where}.volume is required")
    volume = _parse_volume(vol_raw, f"{where}.volume")
    after = _opt_num(m.get("after_seconds"), f"{where}.after_seconds")
    if after is None:
        raise ParseError(f"{where}.after_seconds is required")
    dur = _opt_num(m.get("fade_duration_seconds"), f"{where}.fade_duration_seconds")
    fade_dur = float(dur) if dur is not None else 2.0
    if fade_dur <= 0:
        raise ParseError(f"{where}.fade_duration_seconds must be > 0")
    if after < 0:
        raise ParseError(f"{where}.after_seconds must be >= 0")
    return VolumeFadeToSpec(volume=volume, after_seconds=float(after), fade_duration_seconds=fade_dur)


def _parse_fade_out(value: Any, where: str) -> VolumeFadeOutSpec | None:
    """
    fade_out:
      volume: 50%
      before_end_seconds: 4
      fade_duration_seconds: 2   # optional, default 2
    """
    if value is None:
        return None
    m = _require_mapping(value, where)
    vol_raw = m.get("volume", m.get("to", m.get("target_volume")))
    if vol_raw is None:
        raise ParseError(f"{where}.volume is required")
    volume = _parse_volume(vol_raw, f"{where}.volume")
    before = _opt_num(m.get("before_end_seconds"), f"{where}.before_end_seconds")
    if before is None:
        raise ParseError(f"{where}.before_end_seconds is required")
    dur = _opt_num(m.get("fade_duration_seconds"), f"{where}.fade_duration_seconds")
    fade_dur = float(dur) if dur is not None else 2.0
    if fade_dur <= 0:
        raise ParseError(f"{where}.fade_duration_seconds must be > 0")
    if before < 0:
        raise ParseError(f"{where}.before_end_seconds must be >= 0")
    return VolumeFadeOutSpec(volume=volume, before_end_seconds=float(before), fade_duration_seconds=fade_dur)


def parse_start(value: Any, where: str) -> StartAt:
    if isinstance(value, (int, float)):
        return StartAt(kind="absolute", sec=float(value))
    if isinstance(value, str):
        v = value.strip()
        if v.startswith("scene:"):
            tail = v[len("scene:") :]
            offset = 0.0
            scene_id = tail
            if "+" in tail:
                scene_id, off = tail.split("+", 1)
                offset = _parse_seconds_str(off, f"{where}.start")
            scene_id = scene_id.strip()
            if not scene_id:
                raise ParseError(f"Invalid scene reference at {where}.start")
            return StartAt(kind="scene", scene=SceneRef(sceneId=scene_id, offsetSec=offset))
        if v.startswith("cue:"):
            tail = v[len("cue:") :]
            offset = 0.0
            cue_id = tail
            if "+" in tail:
                cue_id, off = tail.split("+", 1)
                offset = _parse_seconds_str(off, f"{where}.start")
            cue_id = cue_id.strip()
            if not cue_id:
                raise ParseError(f"Invalid cue reference at {where}.start")
            return StartAt(kind="cue", cue=CueRef(cueId=cue_id, offsetSec=offset))
        if v.endswith("s"):
            return StartAt(kind="absolute", sec=_parse_seconds_str(v, f"{where}.start"))
    raise ParseError(f"Invalid start value at {where}.start")


def parse_at_relative(
    value: Any,
    where: str,
    *,
    anchor_kind: Literal["cue", "scene"],
    anchor_id: str,
) -> StartAt:
    """
    For inlined audio within a cue/scene, allow:
      - at: null -> anchor+0
      - at: "+0.5s" -> anchor+offset
      - at: "cue:other+0.5s"/"scene:other+0.5s"/"12.3s" -> absolute or explicit refs (delegates to parse_start)
    """
    if value is None:
        if anchor_kind == "cue":
            return StartAt(kind="cue", cue=CueRef(cueId=anchor_id, offsetSec=0.0))
        return StartAt(kind="scene", scene=SceneRef(sceneId=anchor_id, offsetSec=0.0))

    if isinstance(value, str) and value.strip().startswith("+"):
        off = _parse_seconds_str(value.strip()[1:], f"{where}.at")
        if anchor_kind == "cue":
            return StartAt(kind="cue", cue=CueRef(cueId=anchor_id, offsetSec=off))
        return StartAt(kind="scene", scene=SceneRef(sceneId=anchor_id, offsetSec=off))

    return parse_start(value, where)


def _unique_id(preferred: str, used: set[str]) -> str:
    base = slugify(preferred)
    if base not in used:
        used.add(base)
        return base
    i = 2
    while f"{base}--{i}" in used:
        i += 1
    out = f"{base}--{i}"
    used.add(out)
    return out


def load_inline_audio_plan(root: dict[str, Any], scenes_raw: list[Any]) -> AudioPlan | None:
    """
    New DSL shape (inline):
      scenes:
        - id: intro
          audio: [ ... ]                 # relative to scene start
          cues:
            - id: hook
              audio: [ ... ]             # relative to cue start

    Each inline audio item supports:
      kind: "sfx"|"file"
      id: string (optional)
      at: "+0.0s" (optional; default "+0s")
      track: string (optional; defaults to kind, e.g. "sfx"/"music")
      volume: 0..1 | 0..100 | "80%" (optional; default 1.0)
      plus kind-specific fields:
        - file: src
        - sfx: prompt, durationSec, variants, pick
    """
    library = load_audio_library(root)
    tracks: dict[str, AudioTrackSpec] = {}
    has_any = False
    used_clip_ids: set[str] = set()

    def add_clip(track_id: str, track_kind: str, clip: AudioClipSpec) -> None:
        nonlocal has_any
        has_any = True
        existing = tracks.get(track_id)
        if existing is None:
            tracks[track_id] = AudioTrackSpec(id=track_id, kind=track_kind, clips=[clip])
        else:
            if existing.kind != track_kind:
                raise ParseError(f'Audio track "{track_id}" has conflicting kinds: "{existing.kind}" vs "{track_kind}"')
            tracks[track_id] = AudioTrackSpec(
                id=existing.id, kind=existing.kind, clips=[*list(existing.clips), clip]
            )

    for s_idx, scene_obj in enumerate(scenes_raw):
        s = _require_mapping(scene_obj, f"scenes[{s_idx}]")
        sid = _opt_str(s.get("id"), f"scenes[{s_idx}].id")
        if not sid:
            title = _opt_str(s.get("title"), f"scenes[{s_idx}].title")
            if not title:
                raise ParseError(f"Missing scenes[{s_idx}].title")
            sid = slugify(title)

        scene_audio = s.get("audio")
        if scene_audio is not None:
            scene_audio_list = _require_list(scene_audio, f"scenes[{s_idx}].audio")
            for a_idx, a_obj in enumerate(scene_audio_list):
                a = _require_mapping(a_obj, f"scenes[{s_idx}].audio[{a_idx}]")
                define = _opt_str(a.get("define"), f"scenes[{s_idx}].audio[{a_idx}].define")
                use = _opt_str(a.get("use", a.get("ref", a.get("clip"))), f"scenes[{s_idx}].audio[{a_idx}].use")
                kind = _opt_str(a.get("kind"), f"scenes[{s_idx}].audio[{a_idx}].kind")
                defined_here = False

                if define:
                    if define in library:
                        raise ParseError(
                            f'Duplicate audio library clip "{define}" (already defined) at scenes[{s_idx}].audio[{a_idx}]'
                        )
                    if kind not in ("file", "sfx", "music"):
                        raise ParseError(
                            f'Defining a clip requires kind "file", "sfx", or "music" at scenes[{s_idx}].audio[{a_idx}]'
                        )
                    if kind == "file":
                        src = _opt_str(a.get("src"), f"scenes[{s_idx}].audio[{a_idx}].src")
                        if not src:
                            raise ParseError(f"Missing src for defined file clip at scenes[{s_idx}].audio[{a_idx}]")
                        library[define] = AudioLibraryClip(id=define, kind="file", src=src)
                    elif kind == "sfx":
                        prompt = _opt_str(a.get("prompt"), f"scenes[{s_idx}].audio[{a_idx}].prompt")
                        if not prompt:
                            raise ParseError(
                                f"Missing prompt for defined sfx clip at scenes[{s_idx}].audio[{a_idx}]"
                            )
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick0 = int(a.get("pick", 0))
                        library[define] = AudioLibraryClip(
                            id=define,
                            kind="sfx",
                            prompt=prompt,
                            duration_seconds=dur,
                            variants=max(1, variants),
                            pick=max(0, pick0),
                        )
                    else:
                        prompt = _opt_str(a.get("prompt"), f"scenes[{s_idx}].audio[{a_idx}].prompt")
                        if not prompt:
                            raise ParseError(
                                f"Missing prompt for defined music clip at scenes[{s_idx}].audio[{a_idx}]"
                            )
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick0 = int(a.get("pick", 0))
                        model_id = _opt_str(a.get("model_id"), f"scenes[{s_idx}].audio[{a_idx}].model_id")
                        force_instr = a.get("force_instrumental")
                        if force_instr is not None and not isinstance(force_instr, bool):
                            raise ParseError(
                                f"scenes[{s_idx}].audio[{a_idx}].force_instrumental must be boolean"
                            )
                        library[define] = AudioLibraryClip(
                            id=define,
                            kind="music",
                            prompt=prompt,
                            duration_seconds=dur,
                            variants=max(1, variants),
                            pick=max(0, pick0),
                            model_id=model_id,
                            force_instrumental=force_instr,
                        )
                    if use and use != define:
                        raise ParseError(
                            f"Cannot specify both define:{define} and use:{use} at scenes[{s_idx}].audio[{a_idx}]"
                        )
                    use = define
                    defined_here = True

                if use:
                    if use not in library:
                        raise ParseError(f'Unknown audio library clip "{use}" at scenes[{s_idx}].audio[{a_idx}]')
                    src_def = library[use]
                    if kind is not None and kind != src_def.kind:
                        raise ParseError(
                            f'scenes[{s_idx}].audio[{a_idx}].kind conflicts with audio.library["{use}"].kind'
                        )
                    kind = src_def.kind
                if kind not in ("file", "sfx", "music"):
                    raise ParseError(
                        f'Inline audio kind must be "file", "sfx", or "music" at scenes[{s_idx}].audio[{a_idx}]'
                    )

                preferred_id = _opt_str(a.get("id"), f"scenes[{s_idx}].audio[{a_idx}].id") or (
                    use or f"{sid}-{kind}-{a_idx+1}"
                )
                cid = _unique_id(preferred_id, used_clip_ids)
                pause_seconds = _parse_offset_seconds(
                    a.get("pause_seconds", a.get("pauseSec")), f"scenes[{s_idx}].audio[{a_idx}].pause_seconds"
                )
                at_value = a.get("at", a.get("start"))
                if at_value is None and pause_seconds is not None:
                    at_value = f"+{pause_seconds}s"
                start = parse_at_relative(
                    at_value,
                    f"scenes[{s_idx}].audio[{a_idx}]",
                    anchor_kind="scene",
                    anchor_id=sid,
                )
                volume = _parse_volume(
                    a.get("volume"), f"scenes[{s_idx}].audio[{a_idx}].volume"
                )
                fade_to = _parse_fade_to(a.get("fade_to", a.get("fadeTo")), f"scenes[{s_idx}].audio[{a_idx}].fade_to")
                fade_out = _parse_fade_out(
                    a.get("fade_out", a.get("fadeOut")), f"scenes[{s_idx}].audio[{a_idx}].fade_out"
                )
                track_id = _opt_str(a.get("track"), f"scenes[{s_idx}].audio[{a_idx}].track")
                track_id = track_id or ("sfx" if kind == "sfx" else "music")
                if kind == "file":
                    if use:
                        if a.get("src") is not None and not defined_here:
                            raise ParseError(f"Do not specify src when using audio library clip at scenes[{s_idx}].audio[{a_idx}]")
                        src = library[use].src
                        assert src is not None
                    else:
                        src = _opt_str(a.get("src"), f"scenes[{s_idx}].audio[{a_idx}].src")
                        if not src:
                            raise ParseError(f"Missing src for file audio at scenes[{s_idx}].audio[{a_idx}]")
                    add_clip(
                        track_id,
                        "file",
                        AudioClipSpec(
                            id=cid, kind="file", start=start, volume=volume, fade_to=fade_to, fade_out=fade_out, src=src
                        ),
                    )
                elif kind == "sfx":
                    if use:
                        if (
                            not defined_here
                            and (
                                a.get("prompt") is not None
                                or a.get("variants") is not None
                                or a.get("duration_seconds") is not None
                            )
                        ):
                            raise ParseError(
                                f"Do not override prompt/variants/duration_seconds when using audio library clip at scenes[{s_idx}].audio[{a_idx}]"
                            )
                        prompt = library[use].prompt
                        assert prompt is not None
                        dur = library[use].duration_seconds
                        variants = library[use].variants
                        pick = int(a.get("pick", library[use].pick))
                    else:
                        prompt = _opt_str(a.get("prompt"), f"scenes[{s_idx}].audio[{a_idx}].prompt")
                        if not prompt:
                            raise ParseError(f"Missing prompt for sfx audio at scenes[{s_idx}].audio[{a_idx}]")
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick = int(a.get("pick", 0))
                    add_clip(
                        track_id,
                        "sfx",
                        AudioClipSpec(
                            id=cid,
                            kind="sfx",
                            start=start,
                            volume=volume,
                            fade_to=fade_to,
                            fade_out=fade_out,
                            source_id=use,
                            prompt=prompt,
                            durationSec=dur,
                            variants=max(1, variants),
                            pick=max(0, pick),
                        ),
                    )
                else:
                    if use:
                        if (
                            not defined_here
                            and (
                                a.get("prompt") is not None
                                or a.get("variants") is not None
                                or a.get("duration_seconds") is not None
                            )
                        ):
                            raise ParseError(
                                f"Do not override prompt/variants/duration_seconds when using audio library clip at scenes[{s_idx}].audio[{a_idx}]"
                            )
                        prompt = library[use].prompt
                        assert prompt is not None
                        dur = library[use].duration_seconds
                        variants = library[use].variants
                        pick = int(a.get("pick", library[use].pick))
                        model_id = _opt_str(a.get("model_id"), f"scenes[{s_idx}].audio[{a_idx}].model_id") or library[use].model_id
                        force_instr = a.get("force_instrumental", library[use].force_instrumental)
                    else:
                        prompt = _opt_str(a.get("prompt"), f"scenes[{s_idx}].audio[{a_idx}].prompt")
                        if not prompt:
                            raise ParseError(f"Missing prompt for music at scenes[{s_idx}].audio[{a_idx}]")
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick = int(a.get("pick", 0))
                        model_id = _opt_str(a.get("model_id"), f"scenes[{s_idx}].audio[{a_idx}].model_id")
                        force_instr = a.get("force_instrumental")
                    if force_instr is not None and not isinstance(force_instr, bool):
                        raise ParseError(f"scenes[{s_idx}].audio[{a_idx}].force_instrumental must be boolean")
                    play_through = a.get("play_through", a.get("playThrough"))
                    if play_through is not None and not isinstance(play_through, bool):
                        raise ParseError(f"scenes[{s_idx}].audio[{a_idx}].play_through must be boolean")
                    add_clip(
                        track_id,
                        "music",
                        AudioClipSpec(
                            id=cid,
                            kind="music",
                            start=start,
                            volume=volume,
                            fade_to=fade_to,
                            fade_out=fade_out,
                            source_id=use,
                            prompt=prompt,
                            durationSec=dur,
                            variants=max(1, variants),
                            pick=max(0, pick),
                            play_through=bool(play_through or False),
                            model_id=model_id,
                            force_instrumental=force_instr,
                        ),
                    )

        cues_raw = s.get("cues")
        if cues_raw is None:
            continue
        cues = _require_list(cues_raw, f"scenes[{s_idx}].cues")
        for c_idx, cue_obj in enumerate(cues):
            c = _require_mapping(cue_obj, f"scenes[{s_idx}].cues[{c_idx}]")
            cue_id = _opt_str(c.get("id"), f"scenes[{s_idx}].cues[{c_idx}].id")
            if not cue_id:
                label = _opt_str(c.get("label"), f"scenes[{s_idx}].cues[{c_idx}].label")
                if not label:
                    # Pause items won't have a label (and should not have audio).
                    continue
                cue_id = slugify(label)

            cue_audio = c.get("audio")
            if cue_audio is None:
                continue
            cue_audio_list = _require_list(cue_audio, f"scenes[{s_idx}].cues[{c_idx}].audio")
            for a_idx, a_obj in enumerate(cue_audio_list):
                a = _require_mapping(a_obj, f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]")
                define = _opt_str(a.get("define"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].define")
                use = _opt_str(
                    a.get("use", a.get("ref", a.get("clip"))),
                    f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].use",
                )
                kind = _opt_str(a.get("kind"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].kind")
                defined_here = False

                if define:
                    if define in library:
                        raise ParseError(
                            f'Duplicate audio library clip "{define}" (already defined) at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]'
                        )
                    if kind not in ("file", "sfx", "music"):
                        raise ParseError(
                            f'Defining a clip requires kind "file", "sfx", or "music" at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]'
                        )
                    if kind == "file":
                        src = _opt_str(
                            a.get("src"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].src"
                        )
                        if not src:
                            raise ParseError(
                                f"Missing src for defined file clip at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        library[define] = AudioLibraryClip(id=define, kind="file", src=src)
                    elif kind == "sfx":
                        prompt = _opt_str(
                            a.get("prompt"),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].prompt",
                        )
                        if not prompt:
                            raise ParseError(
                                f"Missing prompt for defined sfx clip at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick0 = int(a.get("pick", 0))
                        library[define] = AudioLibraryClip(
                            id=define,
                            kind="sfx",
                            prompt=prompt,
                            duration_seconds=dur,
                            variants=max(1, variants),
                            pick=max(0, pick0),
                        )
                    else:
                        prompt = _opt_str(
                            a.get("prompt"),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].prompt",
                        )
                        if not prompt:
                            raise ParseError(
                                f"Missing prompt for defined music clip at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick0 = int(a.get("pick", 0))
                        model_id = _opt_str(
                            a.get("model_id"),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].model_id",
                        )
                        force_instr = a.get("force_instrumental")
                        if force_instr is not None and not isinstance(force_instr, bool):
                            raise ParseError(
                                f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].force_instrumental must be boolean"
                            )
                        library[define] = AudioLibraryClip(
                            id=define,
                            kind="music",
                            prompt=prompt,
                            duration_seconds=dur,
                            variants=max(1, variants),
                            pick=max(0, pick0),
                            model_id=model_id,
                            force_instrumental=force_instr,
                        )
                    if use and use != define:
                        raise ParseError(
                            f"Cannot specify both define:{define} and use:{use} at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                        )
                    use = define
                    defined_here = True

                if use:
                    if use not in library:
                        raise ParseError(
                            f'Unknown audio library clip "{use}" at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]'
                        )
                    src_def = library[use]
                    if kind is not None and kind != src_def.kind:
                        raise ParseError(
                            f'scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].kind conflicts with audio.library["{use}"].kind'
                        )
                    kind = src_def.kind
                if kind not in ("file", "sfx", "music"):
                    raise ParseError(
                        f'Inline audio kind must be "file", "sfx", or "music" at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]'
                    )
                preferred_id = _opt_str(a.get("id"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].id") or (
                    use or f"{cue_id}-{kind}-{a_idx+1}"
                )
                cid = _unique_id(preferred_id, used_clip_ids)
                pause_seconds = _parse_offset_seconds(
                    a.get("pause_seconds", a.get("pauseSec")),
                    f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].pause_seconds",
                )
                at_value = a.get("at", a.get("start"))
                if at_value is None and pause_seconds is not None:
                    at_value = f"+{pause_seconds}s"
                start = parse_at_relative(
                    at_value,
                    f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]",
                    anchor_kind="cue",
                    anchor_id=cue_id,
                )
                volume = _parse_volume(
                    a.get("volume"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].volume"
                )
                fade_to = _parse_fade_to(
                    a.get("fade_to", a.get("fadeTo")), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].fade_to"
                )
                fade_out = _parse_fade_out(
                    a.get("fade_out", a.get("fadeOut")), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].fade_out"
                )
                track_id = _opt_str(
                    a.get("track"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].track"
                )
                track_id = track_id or ("sfx" if kind == "sfx" else "music")
                if kind == "file":
                    if use:
                        if a.get("src") is not None and not defined_here:
                            raise ParseError(
                                f"Do not specify src when using audio library clip at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        src = library[use].src
                        assert src is not None
                    else:
                        src = _opt_str(
                            a.get("src"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].src"
                        )
                        if not src:
                            raise ParseError(
                                f"Missing src for file audio at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                    add_clip(
                        track_id,
                        "file",
                        AudioClipSpec(
                            id=cid, kind="file", start=start, volume=volume, fade_to=fade_to, fade_out=fade_out, src=src
                        ),
                    )
                elif kind == "sfx":
                    if use:
                        if (
                            not defined_here
                            and (
                                a.get("prompt") is not None
                                or a.get("variants") is not None
                                or a.get("duration_seconds") is not None
                            )
                        ):
                            raise ParseError(
                                f"Do not override prompt/variants/duration_seconds when using audio library clip at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        prompt = library[use].prompt
                        assert prompt is not None
                        dur = library[use].duration_seconds
                        variants = library[use].variants
                        pick = int(a.get("pick", library[use].pick))
                    else:
                        prompt = _opt_str(
                            a.get("prompt"),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].prompt",
                        )
                        if not prompt:
                            raise ParseError(
                                f"Missing prompt for sfx audio at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick = int(a.get("pick", 0))
                    add_clip(
                        track_id,
                        "sfx",
                        AudioClipSpec(
                            id=cid,
                            kind="sfx",
                            start=start,
                            volume=volume,
                            fade_to=fade_to,
                            fade_out=fade_out,
                            source_id=use,
                            prompt=prompt,
                            durationSec=dur,
                            variants=max(1, variants),
                            pick=max(0, pick),
                        ),
                    )
                else:
                    if use:
                        if (
                            not defined_here
                            and (
                                a.get("prompt") is not None
                                or a.get("variants") is not None
                                or a.get("duration_seconds") is not None
                            )
                        ):
                            raise ParseError(
                                f"Do not override prompt/variants/duration_seconds when using audio library clip at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        prompt = library[use].prompt
                        assert prompt is not None
                        dur = library[use].duration_seconds
                        variants = library[use].variants
                        pick = int(a.get("pick", library[use].pick))
                        model_id = _opt_str(a.get("model_id"), f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].model_id") or library[use].model_id
                        force_instr = a.get("force_instrumental", library[use].force_instrumental)
                    else:
                        prompt = _opt_str(
                            a.get("prompt"),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].prompt",
                        )
                        if not prompt:
                            raise ParseError(
                                f"Missing prompt for music at scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}]"
                            )
                        dur = _opt_num(
                            a.get("duration_seconds", a.get("durationSec")),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].duration_seconds",
                        )
                        variants = int(a.get("variants", 1))
                        pick = int(a.get("pick", 0))
                        model_id = _opt_str(
                            a.get("model_id"),
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].model_id",
                        )
                        force_instr = a.get("force_instrumental")
                    if force_instr is not None and not isinstance(force_instr, bool):
                        raise ParseError(
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].force_instrumental must be boolean"
                        )
                    play_through = a.get("play_through", a.get("playThrough"))
                    if play_through is not None and not isinstance(play_through, bool):
                        raise ParseError(
                            f"scenes[{s_idx}].cues[{c_idx}].audio[{a_idx}].play_through must be boolean"
                        )
                    add_clip(
                        track_id,
                        "music",
                        AudioClipSpec(
                            id=cid,
                            kind="music",
                            start=start,
                            volume=volume,
                            fade_to=fade_to,
                            fade_out=fade_out,
                            source_id=use,
                            prompt=prompt,
                            durationSec=dur,
                            variants=max(1, variants),
                            pick=max(0, pick),
                            play_through=bool(play_through or False),
                            model_id=model_id,
                            force_instrumental=force_instr,
                        ),
                    )

    if not has_any:
        return None
    return AudioPlan(sfx_provider=None, music_provider=None, tracks=list(tracks.values()))


def load_audio_library(root: dict[str, Any]) -> dict[str, AudioLibraryClip]:
    """
    Optional clip library for reuse:

      audio:
        library:
          whoosh:
            kind: sfx
            prompt: "..."
            duration_seconds: 3
            variants: 8

    You can also use a list form:

      audio:
        library:
          - id: whoosh
            kind: sfx
            ...
    """
    audio = root.get("audio")
    if audio is None:
        return {}
    a = _require_mapping(audio, "audio")
    lib_raw = a.get("library", a.get("clips"))
    if lib_raw is None:
        return {}

    out: dict[str, AudioLibraryClip] = {}

    def add_clip(clip_id: str, clip: AudioLibraryClip) -> None:
        if clip_id in out:
            raise ParseError(f'Duplicate audio library clip id "{clip_id}"')
        out[clip_id] = clip

    if isinstance(lib_raw, dict):
        for key, value in lib_raw.items():
            if not isinstance(key, str) or not key.strip():
                raise ParseError("audio.library keys must be non-empty strings")
            m = _require_mapping(value, f"audio.library[{key}]")
            kind = _opt_str(m.get("kind"), f"audio.library[{key}].kind")
            if kind not in ("file", "sfx", "music"):
                raise ParseError(f'audio.library[{key}].kind must be "file", "sfx", or "music"')
            if kind == "file":
                src = _opt_str(m.get("src"), f"audio.library[{key}].src")
                if not src:
                    raise ParseError(f"audio.library[{key}].src is required for file clips")
                add_clip(key, AudioLibraryClip(id=key, kind="file", src=src))
            elif kind == "sfx":
                prompt = _opt_str(m.get("prompt"), f"audio.library[{key}].prompt")
                if not prompt:
                    raise ParseError(f"audio.library[{key}].prompt is required for sfx clips")
                dur = _opt_num(
                    m.get("duration_seconds", m.get("durationSec")),
                    f"audio.library[{key}].duration_seconds",
                )
                variants = int(m.get("variants", 1))
                pick = int(m.get("pick", 0))
                add_clip(
                    key,
                    AudioLibraryClip(
                        id=key,
                        kind="sfx",
                        prompt=prompt,
                        duration_seconds=dur,
                        variants=max(1, variants),
                        pick=max(0, pick),
                    ),
                )
            else:
                prompt = _opt_str(m.get("prompt"), f"audio.library[{key}].prompt")
                if not prompt:
                    raise ParseError(f"audio.library[{key}].prompt is required for music clips")
                dur = _opt_num(
                    m.get("duration_seconds", m.get("durationSec")),
                    f"audio.library[{key}].duration_seconds",
                )
                variants = int(m.get("variants", 1))
                pick = int(m.get("pick", 0))
                model_id = _opt_str(m.get("model_id"), f"audio.library[{key}].model_id")
                force_instr = m.get("force_instrumental")
                if force_instr is not None and not isinstance(force_instr, bool):
                    raise ParseError(f"audio.library[{key}].force_instrumental must be boolean")
                add_clip(
                    key,
                    AudioLibraryClip(
                        id=key,
                        kind="music",
                        prompt=prompt,
                        duration_seconds=dur,
                        variants=max(1, variants),
                        pick=max(0, pick),
                        model_id=model_id,
                        force_instrumental=force_instr,
                    ),
                )
        return out

    lib_list = _require_list(lib_raw, "audio.library")
    for i, item in enumerate(lib_list):
        m = _require_mapping(item, f"audio.library[{i}]")
        clip_id = _opt_str(m.get("id"), f"audio.library[{i}].id")
        if not clip_id:
            raise ParseError(f"audio.library[{i}].id is required")
        kind = _opt_str(m.get("kind"), f"audio.library[{i}].kind")
        if kind not in ("file", "sfx", "music"):
            raise ParseError(f'audio.library[{i}].kind must be "file", "sfx", or "music"')
        if kind == "file":
            src = _opt_str(m.get("src"), f"audio.library[{i}].src")
            if not src:
                raise ParseError(f"audio.library[{i}].src is required for file clips")
            add_clip(clip_id, AudioLibraryClip(id=clip_id, kind="file", src=src))
        elif kind == "sfx":
            prompt = _opt_str(m.get("prompt"), f"audio.library[{i}].prompt")
            if not prompt:
                raise ParseError(f"audio.library[{i}].prompt is required for sfx clips")
            dur = _opt_num(
                m.get("duration_seconds", m.get("durationSec")),
                f"audio.library[{i}].duration_seconds",
            )
            variants = int(m.get("variants", 1))
            pick = int(m.get("pick", 0))
            add_clip(
                clip_id,
                AudioLibraryClip(
                    id=clip_id,
                    kind="sfx",
                    prompt=prompt,
                    duration_seconds=dur,
                    variants=max(1, variants),
                    pick=max(0, pick),
                ),
            )
        else:
            prompt = _opt_str(m.get("prompt"), f"audio.library[{i}].prompt")
            if not prompt:
                raise ParseError(f"audio.library[{i}].prompt is required for music clips")
            dur = _opt_num(
                m.get("duration_seconds", m.get("durationSec")),
                f"audio.library[{i}].duration_seconds",
            )
            variants = int(m.get("variants", 1))
            pick = int(m.get("pick", 0))
            model_id = _opt_str(m.get("model_id"), f"audio.library[{i}].model_id")
            force_instr = m.get("force_instrumental")
            if force_instr is not None and not isinstance(force_instr, bool):
                raise ParseError(f"audio.library[{i}].force_instrumental must be boolean")
            add_clip(
                clip_id,
                AudioLibraryClip(
                    id=clip_id,
                    kind="music",
                    prompt=prompt,
                    duration_seconds=dur,
                    variants=max(1, variants),
                    pick=max(0, pick),
                    model_id=model_id,
                    force_instrumental=force_instr,
                ),
            )
    return out


def load_audio_music_provider(root: dict[str, Any]) -> str | None:
    audio = root.get("audio")
    if audio is None:
        return None
    a = _require_mapping(audio, "audio")
    # Support environment-specific music_provider
    provider_raw = a.get("music_provider")
    provider = _resolve_env_value(provider_raw, "audio.music_provider")
    return _opt_str(provider, "audio.music_provider")


def load_audio_sfx_provider(root: dict[str, Any]) -> str | None:
    """
    Extract a top-level audio setting:

      audio:
        sfx_provider: elevenlabs

    This is used by the inline DSL shape (which otherwise declares clips next to cues/scenes).
    Supports environment-specific providers.
    """
    audio = root.get("audio")
    if audio is None:
        return None
    a = _require_mapping(audio, "audio")
    # Support environment-specific sfx_provider
    provider_raw = a.get("sfx_provider")
    provider = _resolve_env_value(provider_raw, "audio.sfx_provider")
    return _opt_str(provider, "audio.sfx_provider")


def load_audio_plan(root: dict[str, Any]) -> AudioPlan | None:
    audio = root.get("audio")
    if audio is None:
        return None
    a = _require_mapping(audio, "audio")
    # Support environment-specific providers
    sfx_provider_raw = a.get("sfx_provider")
    sfx_provider = _resolve_env_value(sfx_provider_raw, "audio.sfx_provider")
    sfx_provider = _opt_str(sfx_provider, "audio.sfx_provider")
    
    music_provider_raw = a.get("music_provider")
    music_provider = _resolve_env_value(music_provider_raw, "audio.music_provider")
    music_provider = _opt_str(music_provider, "audio.music_provider")
    tracks_val = a.get("tracks")
    # Allow `audio:` to exist purely for configuration (`sfx_provider`, `library`, etc.)
    # without requiring the legacy `tracks:` list.
    if tracks_val is None:
        return AudioPlan(sfx_provider=sfx_provider, music_provider=music_provider, tracks=[])
    tracks_raw = _require_list(tracks_val, "audio.tracks")
    tracks: list[AudioTrackSpec] = []
    for t_idx, t_obj in enumerate(tracks_raw):
        t = _require_mapping(t_obj, f"audio.tracks[{t_idx}]")
        tid = _opt_str(t.get("id"), f"audio.tracks[{t_idx}].id")
        tkind = _opt_str(t.get("kind"), f"audio.tracks[{t_idx}].kind") or "custom"
        if not tid:
            tid = slugify(tkind + "-" + str(t_idx + 1))
        clips_raw = _require_list(t.get("clips"), f"audio.tracks[{t_idx}].clips")
        clips: list[AudioClipSpec] = []
        for c_idx, c_obj in enumerate(clips_raw):
            c = _require_mapping(c_obj, f"audio.tracks[{t_idx}].clips[{c_idx}]")
            kind = _opt_str(c.get("kind"), f"audio.tracks[{t_idx}].clips[{c_idx}].kind")
            if kind not in ("file", "sfx", "music"):
                raise ParseError(
                    f'clip.kind must be "file", "sfx", or "music" at audio.tracks[{t_idx}].clips[{c_idx}]'
                )
            cid = _opt_str(c.get("id"), f"audio.tracks[{t_idx}].clips[{c_idx}].id")
            if not cid:
                cid = slugify(f"{tid}-{kind}-{c_idx+1}")
            start = parse_start(c.get("start"), f"audio.tracks[{t_idx}].clips[{c_idx}]")
            volume = _parse_volume(c.get("volume"), f"audio.tracks[{t_idx}].clips[{c_idx}].volume")
            if kind == "file":
                src = _opt_str(c.get("src"), f"audio.tracks[{t_idx}].clips[{c_idx}].src")
                if not src:
                    raise ParseError(
                        f"Missing src for file clip at audio.tracks[{t_idx}].clips[{c_idx}]"
                    )
                clips.append(
                    AudioClipSpec(id=cid, kind="file", start=start, volume=volume, src=src)
                )
            elif kind == "sfx":
                prompt = _opt_str(c.get("prompt"), f"audio.tracks[{t_idx}].clips[{c_idx}].prompt")
                if not prompt:
                    raise ParseError(
                        f"Missing prompt for sfx clip at audio.tracks[{t_idx}].clips[{c_idx}]"
                    )
                dur = _opt_num(
                    c.get("duration_seconds", c.get("durationSec")),
                    f"audio.tracks[{t_idx}].clips[{c_idx}].duration_seconds",
                )
                variants = int(c.get("variants", 1))
                pick = int(c.get("pick", 0))
                clips.append(
                    AudioClipSpec(
                        id=cid,
                        kind="sfx",
                        start=start,
                        volume=volume,
                        prompt=prompt,
                        durationSec=dur,
                        variants=max(1, variants),
                        pick=max(0, pick),
                    )
                )
            else:
                prompt = _opt_str(c.get("prompt"), f"audio.tracks[{t_idx}].clips[{c_idx}].prompt")
                if not prompt:
                    raise ParseError(
                        f"Missing prompt for music clip at audio.tracks[{t_idx}].clips[{c_idx}]"
                    )
                dur = _opt_num(
                    c.get("duration_seconds", c.get("durationSec")),
                    f"audio.tracks[{t_idx}].clips[{c_idx}].duration_seconds",
                )
                variants = int(c.get("variants", 1))
                pick = int(c.get("pick", 0))
                play_through = c.get("play_through", c.get("playThrough"))
                if play_through is not None and not isinstance(play_through, bool):
                    raise ParseError(
                        f"audio.tracks[{t_idx}].clips[{c_idx}].play_through must be boolean"
                    )
                model_id = _opt_str(c.get("model_id"), f"audio.tracks[{t_idx}].clips[{c_idx}].model_id")
                force_instr = c.get("force_instrumental")
                if force_instr is not None and not isinstance(force_instr, bool):
                    raise ParseError(
                        f"audio.tracks[{t_idx}].clips[{c_idx}].force_instrumental must be boolean"
                    )
                clips.append(
                    AudioClipSpec(
                        id=cid,
                        kind="music",
                        start=start,
                        volume=volume,
                        prompt=prompt,
                        durationSec=dur,
                        variants=max(1, variants),
                        pick=max(0, pick),
                        play_through=bool(play_through or False),
                        model_id=model_id,
                        force_instrumental=force_instr,
                    )
                )
        tracks.append(AudioTrackSpec(id=tid, kind=tkind, clips=clips))
    return AudioPlan(sfx_provider=sfx_provider, music_provider=music_provider, tracks=tracks)
