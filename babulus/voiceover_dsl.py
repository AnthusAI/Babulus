from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Optional

from .errors import ParseError
from .parser import TimeRange, parse_time_range
from .util import slugify
from .audio_dsl import (
    AudioPlan,
    load_audio_plan,
    load_audio_music_provider,
    load_audio_sfx_provider,
    load_inline_audio_plan,
)


def _get_environment() -> str:
    """Get current environment from BABULUS_ENV, default to 'development'."""
    return os.environ.get("BABULUS_ENV", "development")


def _resolve_env_value(value: Any, where: str) -> Any:
    """Resolve environment-specific value.

    If value is a dict with environment keys, return value[env].
    If value is a dict but env key not found, return value["production"] as fallback.
    Otherwise return value as-is (backward compatible with string/primitive values).

    Examples:
        _resolve_env_value("elevenlabs", "provider") -> "elevenlabs"
        _resolve_env_value({"development": "dry-run", "production": "elevenlabs"}, "provider")
            -> "dry-run" (if BABULUS_ENV=development)
            -> "elevenlabs" (if BABULUS_ENV=production)
    """
    if not isinstance(value, dict):
        return value

    env = _get_environment()

    # Try to get env-specific value
    if env in value:
        return value[env]

    # Fallback to production
    if "production" in value:
        return value["production"]

    # If it's a dict but no env keys found, it might be a config dict (not env-specific)
    # Return as-is
    return value


@dataclass(frozen=True)
class GaussianPause:
    meanSec: float
    stdSec: float
    minSec: float | None = None
    maxSec: float | None = None


@dataclass(frozen=True)
class PauseSpec:
    seconds: float
    # A pause is only timing (silence). If you need a timeline marker, use a real cue with an id/label.


@dataclass(frozen=True)
class TextSegmentSpec:
    text: str
    trim_end_sec: float = 0.0


@dataclass(frozen=True)
class PronunciationLexemeSpec:
    grapheme: str
    phoneme: str | None = None
    alphabet: str = "ipa"
    alias: str | None = None


@dataclass(frozen=True)
class CueSpec:
    id: str
    label: str
    segments: list[TextSegmentSpec | PauseSpec]
    bullets: list[str]
    time: TimeRange | None = None
    provider: str | None = None  # Per-cue provider override


@dataclass(frozen=True)
class SceneSpec:
    id: str
    title: str
    time: TimeRange | None
    items: list[CueSpec | PauseSpec]


@dataclass(frozen=True)
class VoiceoverConfig:
    provider: str = "dry-run"
    voice: str | None = None
    model: str | None = None
    format: str = "wav"
    sample_rate_hz: int = 44100
    seed: int = 0
    lead_in_sec: float = 0.0
    default_trim_end_sec: float = 0.0
    pause_between_items_sec: float = 0.0
    pause_between_items_gaussian: GaussianPause | None = None
    pronunciation_dictionary_locators: list[dict[str, str | None]] | None = None
    pronunciation_dictionary_name: str | None = None
    pronunciation_dictionary_workspace_access: str | None = None
    pronunciation_dictionary_description: str | None = None
    pronunciations: list[PronunciationLexemeSpec] = field(default_factory=list)


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


def _parse_seconds(obj: Any, where: str) -> float:
    """
    Accept:
      - number (seconds)
      - string like "0.35" or "0.35s"
    """
    if isinstance(obj, (int, float)):
        return float(obj)
    if isinstance(obj, str):
        s = obj.strip()
        if s.endswith("s"):
            s = s[:-1].strip()
        try:
            return float(s)
        except ValueError as e:
            raise ParseError(f"Invalid seconds value at {where}") from e
    raise ParseError(f"Expected seconds (number or '0.5s') at {where}")


def _parse_time(obj: Any, where: str) -> TimeRange | None:
    if obj is None:
        return None
    if isinstance(obj, str):
        return parse_time_range(obj)
    raise ParseError(f"Expected string at {where}.time")


def _parse_pronunciations(obj: Any) -> list[PronunciationLexemeSpec]:
    if obj is None:
        return []
    items = _require_list(obj, "voiceover.pronunciations")
    out: list[PronunciationLexemeSpec] = []
    for i, item in enumerate(items):
        m = _require_mapping(item, f"voiceover.pronunciations[{i}]")
        lex = m.get("lexeme", m)
        lex_m = _require_mapping(lex, f"voiceover.pronunciations[{i}].lexeme")
        grapheme = _opt_str(lex_m.get("grapheme"), f"voiceover.pronunciations[{i}].lexeme.grapheme")
        if not grapheme:
            raise ParseError(f"Missing voiceover.pronunciations[{i}].lexeme.grapheme")
        phoneme = _opt_str(lex_m.get("phoneme"), f"voiceover.pronunciations[{i}].lexeme.phoneme")
        alias = _opt_str(lex_m.get("alias"), f"voiceover.pronunciations[{i}].lexeme.alias")
        if phoneme is None and alias is None:
            raise ParseError(f"voiceover.pronunciations[{i}].lexeme must provide phoneme or alias")
        alphabet = _opt_str(lex_m.get("alphabet"), f"voiceover.pronunciations[{i}].lexeme.alphabet") or "ipa"
        out.append(
            PronunciationLexemeSpec(grapheme=grapheme, phoneme=phoneme, alias=alias, alphabet=alphabet)
        )
    return out


def _parse_voiceover(obj: Any) -> VoiceoverConfig:
    if obj is None:
        return VoiceoverConfig()
    m = _require_mapping(obj, "voiceover")

    # Support environment-specific provider (string or dict)
    provider_raw = m.get("provider")
    provider = _resolve_env_value(provider_raw, "voiceover.provider")
    provider = _opt_str(provider, "voiceover.provider")  # Don't default here, let generate() use config default

    # Support environment-specific voice
    voice_raw = m.get("voice")
    voice = _resolve_env_value(voice_raw, "voiceover.voice")
    voice = _opt_str(voice, "voiceover.voice")

    # Support environment-specific model
    model_raw = m.get("model")
    model = _resolve_env_value(model_raw, "voiceover.model")
    model = _opt_str(model, "voiceover.model")
    fmt = _opt_str(m.get("format"), "voiceover.format") or "wav"

    # Support environment-specific sample_rate_hz
    sr_raw = m.get("sample_rate_hz", 44100)
    sr = _resolve_env_value(sr_raw, "voiceover.sample_rate_hz")
    try:
        sr_i = int(sr)
    except Exception as e:  # noqa: BLE001
        raise ParseError("voiceover.sample_rate_hz must be an integer") from e
    seed = m.get("seed", 0)
    try:
        seed_i = int(seed)
    except Exception as e:  # noqa: BLE001
        raise ParseError("voiceover.seed must be an integer") from e

    lead_in_raw = m.get("lead_in_seconds", m.get("lead_in_sec", m.get("lead_in")))
    lead_in_sec = _opt_num(lead_in_raw, "voiceover.lead_in_sec")
    if lead_in_sec is None and isinstance(lead_in_raw, str):
        tr = parse_time_range(f"0s-{lead_in_raw}")
        lead_in_sec = tr.end
    lead_in_sec_f = float(lead_in_sec or 0.0)
    if lead_in_sec_f < 0:
        raise ParseError("voiceover.lead_in_sec must be >= 0")

    default_trim_end_raw = m.get("trim_end_seconds", m.get("trim_end_sec", m.get("trim_end")))
    default_trim_end_sec = _opt_num(default_trim_end_raw, "voiceover.trim_end_sec")
    if default_trim_end_sec is None and isinstance(default_trim_end_raw, str):
        tr = parse_time_range(f"0s-{default_trim_end_raw}")
        default_trim_end_sec = tr.end
    default_trim_end_sec_f = float(default_trim_end_sec or 0.0)
    if default_trim_end_sec_f < 0:
        raise ParseError("voiceover.trim_end_sec must be >= 0")

    pause_between_items_sec = (
        _opt_num(m.get("pause_between_items_seconds"), "voiceover.pause_between_items_seconds")
        or _opt_num(m.get("pause_between_items_sec"), "voiceover.pause_between_items_sec")
        or 0.0
    )
    gaussian_cfg = m.get("pause_between_items_gaussian")
    pause_between_items_gaussian: GaussianPause | None = None
    if gaussian_cfg is not None:
        g = _require_mapping(gaussian_cfg, "voiceover.pause_between_items_gaussian")
        mean = _opt_num(
            g.get("mean_seconds", g.get("meanSec")),
            "voiceover.pause_between_items_gaussian.mean_seconds",
        )
        std = _opt_num(
            g.get("std_seconds", g.get("stdSec")),
            "voiceover.pause_between_items_gaussian.std_seconds",
        )
        if mean is None or std is None:
            raise ParseError("pause_between_items_gaussian requires meanSec and stdSec")
        pause_between_items_gaussian = GaussianPause(
            meanSec=float(mean),
            stdSec=float(std),
            minSec=_opt_num(
                g.get("min_seconds", g.get("minSec")),
                "voiceover.pause_between_items_gaussian.min_seconds",
            ),
            maxSec=_opt_num(
                g.get("max_seconds", g.get("maxSec")),
                "voiceover.pause_between_items_gaussian.max_seconds",
            ),
        )

    pdl_raw = m.get("pronunciation_dictionaries", m.get("pronunciation_dictionary_locators"))
    pronunciation_dictionary_locators: list[dict[str, str | None]] | None = None
    if pdl_raw is not None:
        if not isinstance(pdl_raw, list):
            raise ParseError("voiceover.pronunciation_dictionaries must be a list")
        locs: list[dict[str, str | None]] = []
        for i, item in enumerate(pdl_raw):
            if isinstance(item, str):
                locs.append({"pronunciation_dictionary_id": item, "version_id": None})
                continue
            if not isinstance(item, dict):
                raise ParseError(f"voiceover.pronunciation_dictionaries[{i}] must be a string or mapping")
            pid = item.get("id", item.get("pronunciation_dictionary_id"))
            if not isinstance(pid, str) or not pid:
                raise ParseError(f"voiceover.pronunciation_dictionaries[{i}] missing id")
            vid = item.get("version_id", item.get("versionId"))
            if vid is not None and not isinstance(vid, str):
                raise ParseError(f"voiceover.pronunciation_dictionaries[{i}].version_id must be a string")
            locs.append({"pronunciation_dictionary_id": pid, "version_id": vid})
        if len(locs) > 3:
            raise ParseError("ElevenLabs supports up to 3 pronunciation dictionaries per request")
        pronunciation_dictionary_locators = locs

    pd_cfg = m.get("pronunciation_dictionary")
    pronunciation_dictionary_name = None
    pronunciation_dictionary_workspace_access = None
    pronunciation_dictionary_description = None
    if pd_cfg is not None:
        pd = _require_mapping(pd_cfg, "voiceover.pronunciation_dictionary")
        pronunciation_dictionary_name = _opt_str(pd.get("name"), "voiceover.pronunciation_dictionary.name")
        pronunciation_dictionary_workspace_access = _opt_str(
            pd.get("workspace_access"), "voiceover.pronunciation_dictionary.workspace_access"
        )
        pronunciation_dictionary_description = _opt_str(
            pd.get("description"), "voiceover.pronunciation_dictionary.description"
        )

    pronunciations = _parse_pronunciations(
        m.get(
            "pronunciations",
            m.get("pronunciation_lexemes", m.get("pronunciation", m.get("lexemes"))),
        )
    )
    return VoiceoverConfig(
        provider=provider,
        voice=voice,
        model=model,
        format=fmt,
        sample_rate_hz=sr_i,
        seed=seed_i,
        lead_in_sec=lead_in_sec_f,
        default_trim_end_sec=default_trim_end_sec_f,
        pause_between_items_sec=pause_between_items_sec,
        pause_between_items_gaussian=pause_between_items_gaussian,
        pronunciation_dictionary_locators=pronunciation_dictionary_locators,
        pronunciation_dictionary_name=pronunciation_dictionary_name,
        pronunciation_dictionary_workspace_access=pronunciation_dictionary_workspace_access,
        pronunciation_dictionary_description=pronunciation_dictionary_description,
        pronunciations=pronunciations,
    )


def _parse_voice_field(
    obj: Any, where: str, *, default_trim_end_sec: float
) -> list[TextSegmentSpec | PauseSpec]:
    """
    `voice` can be either:
      - string (single narration segment)
      - mapping:
          voice: "..." | text: "..."
          pause_seconds: 0.25           # delay before speaking (leading pause)
          segments:
            - voice: "..."
            - pause_seconds: 0.35       # pause segment (silence)
    """
    if obj is None:
        raise ParseError(f"Missing {where}")
    if isinstance(obj, str):
        return [TextSegmentSpec(text=obj, trim_end_sec=default_trim_end_sec)]

    m = _require_mapping(obj, where)
    segments: list[TextSegmentSpec | PauseSpec] = []

    pause_before = m.get("pause_seconds", m.get("pauseSec"))
    if pause_before is not None:
        seconds = _parse_seconds(pause_before, f"{where}.pause_seconds")
        if seconds > 0:
            segments.append(PauseSpec(seconds=float(seconds)))

    segs_raw = m.get("segments")
    if segs_raw is not None:
        seg_list = _require_list(segs_raw, f"{where}.segments")
        for seg_i, seg_obj in enumerate(seg_list):
            seg_map = _require_mapping(seg_obj, f"{where}.segments[{seg_i}]")
            if "pause_seconds" in seg_map or "pauseSec" in seg_map or "pause" in seg_map:
                sec = seg_map.get("pause_seconds", seg_map.get("pauseSec", seg_map.get("pause")))
                seconds = _parse_seconds(sec, f"{where}.segments[{seg_i}].pause_seconds")
                segments.append(PauseSpec(seconds=float(seconds)))
                continue

            if "voice" in seg_map or "text" in seg_map:
                pause_before = seg_map.get("pause_seconds", seg_map.get("pauseSec"))
                if pause_before is not None:
                    seconds = _parse_seconds(pause_before, f"{where}.segments[{seg_i}].pause_seconds")
                    if seconds > 0:
                        segments.append(PauseSpec(seconds=float(seconds)))
                t = _opt_str(seg_map.get("voice", seg_map.get("text")), f"{where}.segments[{seg_i}].voice")
                if t is None:
                    raise ParseError("segment.voice must be a string")
                trim_raw = seg_map.get(
                    "trim_end_seconds",
                    seg_map.get("trim_end_sec", seg_map.get("trimEndSec", seg_map.get("trim_end"))),
                )
                trim_end = _opt_num(trim_raw, "segment.trim_end_seconds")
                if trim_end is None and isinstance(trim_raw, str):
                    tr = parse_time_range(f"0s-{trim_raw}")
                    trim_end = tr.end
                segments.append(TextSegmentSpec(text=t, trim_end_sec=float(trim_end or default_trim_end_sec)))
                continue

            raise ParseError(f"{where}.segments[{seg_i}] must have either voice/text or pause_seconds")
        return segments

    t = _opt_str(m.get("voice", m.get("text")), f"{where}.voice")
    if t is None:
        raise ParseError(f"{where} must be a string or mapping with voice/text")
    segments.append(TextSegmentSpec(text=t, trim_end_sec=default_trim_end_sec))
    return segments


def load_voiceover_yaml(text: str) -> tuple[VoiceoverConfig, list[SceneSpec], AudioPlan | None]:
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
    root = _require_mapping(obj, "document")

    voiceover = _parse_voiceover(root.get("voiceover"))
    scenes_raw = _require_list(root.get("scenes"), "scenes")
    # Prefer new inline audio (declared under scenes/cues). Fall back to legacy top-level `audio:` if present.
    audio_plan = load_inline_audio_plan(root, scenes_raw)
    if audio_plan is not None:
        sfx_provider = load_audio_sfx_provider(root)
        music_provider = load_audio_music_provider(root)
        if sfx_provider or music_provider:
            audio_plan = AudioPlan(
                sfx_provider=sfx_provider,
                music_provider=music_provider,
                tracks=audio_plan.tracks,
            )
    else:
        audio_plan = load_audio_plan(root)

    scenes: list[SceneSpec] = []
    for s_idx, scene_obj in enumerate(scenes_raw):
        s = _require_mapping(scene_obj, f"scenes[{s_idx}]")
        title = _opt_str(s.get("title"), f"scenes[{s_idx}].title")
        if not title:
            raise ParseError(f"Missing scenes[{s_idx}].title")
        scene_id = _opt_str(s.get("id"), f"scenes[{s_idx}].id") or slugify(title)
        scene_time = _parse_time(s.get("time"), f"scenes[{s_idx}]")
        if scene_time and (scene_time.start_is_relative or scene_time.end_is_relative):
            raise ParseError("Scene time ranges must be absolute (no + offsets)")

        cues_raw = _require_list(s.get("cues"), f"scenes[{s_idx}].cues")
        items: list[CueSpec | PauseSpec] = []
        for c_idx, cue_obj in enumerate(cues_raw):
            c = _require_mapping(cue_obj, f"scenes[{s_idx}].cues[{c_idx}]")
            # Legacy: allow a bare pause item in the cues list.
            if "pause_seconds" in c or "pauseSec" in c or "pause" in c:
                sec = c.get("pause_seconds", c.get("pauseSec", c.get("pause")))
                seconds = _parse_seconds(sec, f"scenes[{s_idx}].cues[{c_idx}].pause_seconds")
                items.append(PauseSpec(seconds=float(seconds)))
                continue

            label = _opt_str(c.get("label"), f"scenes[{s_idx}].cues[{c_idx}].label")
            if not label:
                raise ParseError(f"Missing scenes[{s_idx}].cues[{c_idx}].label")
            cid = _opt_str(c.get("id"), f"scenes[{s_idx}].cues[{c_idx}].id") or slugify(label)
            cue_time = _parse_time(c.get("time"), f"scenes[{s_idx}].cues[{c_idx}]")
            segments = _parse_voice_field(
                c.get("voice", c.get("text")),
                f"scenes[{s_idx}].cues[{c_idx}].voice",
                default_trim_end_sec=float(voiceover.default_trim_end_sec),
            )
            bullets_raw = c.get("bullets")
            bullets: list[str] = []
            if bullets_raw is not None:
                bullets_list = _require_list(bullets_raw, f"scenes[{s_idx}].cues[{c_idx}].bullets")
                for b_idx, b in enumerate(bullets_list):
                    if not isinstance(b, str):
                        raise ParseError(
                            f"Expected string bullet at scenes[{s_idx}].cues[{c_idx}].bullets[{b_idx}]"
                        )
                    bullets.append(b)

            # Support per-cue provider override (environment-specific)
            provider_raw = c.get("provider")
            cue_provider = None
            if provider_raw is not None:
                cue_provider = _resolve_env_value(provider_raw, f"scenes[{s_idx}].cues[{c_idx}].provider")
                cue_provider = _opt_str(cue_provider, f"scenes[{s_idx}].cues[{c_idx}].provider")

            items.append(
                CueSpec(
                    id=cid, label=label, segments=segments, bullets=bullets, time=cue_time, provider=cue_provider
                )
            )

        scenes.append(SceneSpec(id=scene_id, title=title, time=scene_time, items=items))

    return voiceover, scenes, audio_plan
