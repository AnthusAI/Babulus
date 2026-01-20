from __future__ import annotations

import json
import math
import random
import hashlib
import sys
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Callable

from .errors import CompileError
from .models import Bullet, CuePoint, Scene, Script
from .audio_dsl import AudioPlan, AudioClipSpec, StartAt
from .config import get_default_music_provider, get_default_sfx_provider, get_default_provider
from .sfx import SFXRequest, get_sfx_provider
from .music import MusicRequest, get_music_provider
from .media import (
    audio_activity_ratio,
    concat_audio_files,
    is_audio_all_silence,
    estimate_trailing_silence_sec,
    probe_duration_sec,
    trim_audio_to_duration,
)
from .tts.providers import TTSRequest
from .tts.registry import get_provider
from .util import slugify
from .elevenlabs_pronunciation import PronunciationRule, ensure_dictionary_from_rules, rules_hash
from .sfx_workflow import load_selections, selection_path
from .voiceover_dsl import (
    CueSpec,
    GaussianPause,
    PauseSpec,
    SceneSpec,
    TextSegmentSpec,
    VoiceoverConfig,
    load_voiceover_yaml,
    _get_environment,
)
from .cache_resolver import (
    resolve_env_cache_dir,
    resolve_cached_segment,
    resolve_cached_sfx,
    resolve_cached_music,
)


@dataclass(frozen=True)
class GeneratedArtifact:
    script: Script
    audio_path: str | None
    timeline_path: str
    did_synthesize: bool  # True if any audio was actually generated (vs all cache hits)


def _write_silence_wav_append(wf: wave.Wave_write, *, duration_sec: float, sample_rate_hz: int) -> None:
    frames = int(math.ceil(duration_sec * sample_rate_hz))
    wf.writeframes(b"\x00\x00" * frames)


def _concat_wavs(output_path: Path, segment_paths: list[Path], sample_rate_hz: int) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output_path), "wb") as out_wav:
        out_wav.setnchannels(1)
        out_wav.setsampwidth(2)
        out_wav.setframerate(sample_rate_hz)
        for seg in segment_paths:
            with wave.open(str(seg), "rb") as in_wav:
                if in_wav.getnchannels() != 1 or in_wav.getsampwidth() != 2:
                    raise CompileError(f"Unsupported WAV format for segment: {seg}")
                if in_wav.getframerate() != sample_rate_hz:
                    raise CompileError(f"Segment sample rate mismatch: {seg}")
                out_wav.writeframes(in_wav.readframes(in_wav.getnframes()))


def _wav_duration_sec(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def _hash_key(obj: dict[str, Any]) -> str:
    data = json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _safe_prefix(h: str, n: int = 12) -> str:
    return h[:n]


def _volume_at(points: list[tuple[float, float]], t: float) -> float:
    if not points:
        return 1.0
    if t <= points[0][0]:
        return float(points[0][1])
    for i in range(len(points) - 1):
        t0, v0 = points[i]
        t1, v1 = points[i + 1]
        if t0 <= t <= t1:
            if t1 <= t0 + 1e-9:
                return float(v1)
            a = (t - t0) / (t1 - t0)
            return float(v0 + a * (v1 - v0))
    return float(points[-1][1])


def _volume_envelope_for_clip(
    *,
    base_volume: float,
    duration_sec: float | None,
    fade_to: Any,
    fade_out: Any,
) -> list[dict[str, float]] | None:
    """
    Build a piecewise-linear volume envelope (seconds relative to clip start).

    Semantics:
      - fade_to ends at `after_seconds` and ramps for `fade_duration_seconds` before that.
      - fade_out starts at (duration - before_end_seconds) and ramps for `fade_duration_seconds` after that.
    """
    if fade_to is None and fade_out is None:
        return None

    points: list[tuple[float, float]] = [(0.0, float(base_volume))]

    if fade_to is not None:
        end = float(getattr(fade_to, "after_seconds"))
        dur = float(getattr(fade_to, "fade_duration_seconds", 2.0))
        start = max(0.0, end - max(0.0, dur))
        points.append((start, float(base_volume)))
        points.append((end, float(getattr(fade_to, "volume"))))

    if fade_out is not None:
        if duration_sec is None:
            raise CompileError("fade_out requires a known clip duration")
        start = max(0.0, float(duration_sec) - float(getattr(fade_out, "before_end_seconds")))
        dur = float(getattr(fade_out, "fade_duration_seconds", 2.0))
        end = start + max(0.0, dur)
        end = min(float(duration_sec), end)
        current = _volume_at(sorted(points, key=lambda x: x[0]), start)
        points.append((start, float(current)))
        points.append((end, float(getattr(fade_out, "volume"))))

    # Sort and squash duplicates by time (last one wins).
    points.sort(key=lambda x: x[0])
    squashed: list[tuple[float, float]] = []
    for t, v in points:
        if squashed and abs(squashed[-1][0] - t) < 1e-9:
            squashed[-1] = (t, v)
        else:
            squashed.append((t, v))
    if not squashed or squashed[0][0] > 1e-9:
        squashed.insert(0, (0.0, float(base_volume)))

    return [{"atSec": float(t), "volume": float(v)} for t, v in squashed]


_MAX_TTS_SEGMENT_SECONDS_DEFAULT = 180.0


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        if not path.exists():
            return None
        obj = json.loads(path.read_text(encoding="utf-8"))
        return obj if isinstance(obj, dict) else None
    except Exception:  # noqa: BLE001
        return None


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def _load_manifest(path: Path) -> dict[str, Any]:
    return _read_json(path) or {"version": 1, "segments": {}, "sfx": {}}


def _get_manifest_duration(manifest: dict[str, Any], section: str, path: Path, expected_key: str) -> float | None:
    sec = manifest.get(section)
    if not isinstance(sec, dict):
        return None
    entry = sec.get(str(path))
    
    # Fallback: match by filename if exact path match fails (handles CWD changes)
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


def _set_manifest_entry(
    manifest: dict[str, Any],
    section: str,
    *,
    path: Path,
    key: str,
    duration_sec: float,
    meta: dict[str, Any],
) -> None:
    sec = manifest.setdefault(section, {})
    if not isinstance(sec, dict):
        raise CompileError("Invalid manifest structure")
    sec[str(path)] = {"key": key, "durationSec": float(duration_sec), "meta": meta}


def _video_name_from_dsl_path(dsl_path: str) -> str:
    name = Path(dsl_path).name
    for suffix in (".babulus.yml", ".babulus.yaml", ".yml", ".yaml"):
        if name.endswith(suffix):
            name = name[: -len(suffix)]
            break
    name = name.strip() or "video"
    return slugify(name)


def generate_voiceover(
    *,
    dsl_path: str,
    script_out: str,
    audio_out: str | None,
    timeline_out: str,
    out_dir: str,
    config: dict[str, Any],
    provider_override: str | None = None,
    sfx_provider_override: str | None = None,
    music_provider_override: str | None = None,
    seed_override: int | None = None,
    fresh: bool = False,
    log: Callable[[str], None] | None = None,
    verbose_logs: bool = True,
) -> GeneratedArtifact:
    def _log(msg: str) -> None:
        if log is not None:
            log(msg)

    dsl_text = Path(dsl_path).read_text(encoding="utf-8")
    voiceover, scenes, audio_plan = load_voiceover_yaml(dsl_text)
    if verbose_logs:
        _log(
            f"dsl: loaded scenes={len(scenes)}"
            + (f" audio_tracks={len(audio_plan.tracks)}" if audio_plan is not None else " audio_tracks=0")
        )
    provider_name = provider_override or voiceover.provider or get_default_provider(config) or "dry-run"
    provider = get_provider(provider_name, config=config)

    # Log provider details
    if verbose_logs:
        model_info = f"model={voiceover.model or getattr(provider, 'default_model', None)}"
        voice_info = f"voice={voiceover.voice or getattr(provider, 'default_voice', None)}"
        _log(f"voice: provider={provider_name} {model_info} {voice_info} fresh={bool(fresh)}")

    rng = random.Random(seed_override if seed_override is not None else voiceover.seed)
    out_dir_p = Path(out_dir)

    # Use environment-specific cache directories
    current_env = _get_environment()
    env_cache_dir = resolve_env_cache_dir(out_dir_p, current_env)
    segments_dir = env_cache_dir / "segments"
    segments_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = env_cache_dir / "manifest.json"
    manifest = _load_manifest(manifest_path) if not fresh else {"version": 1, "segments": {}, "sfx": {}}

    if verbose_logs:
        _log(f"cache: env={current_env} provider={provider_name}")

    # Track whether we actually synthesized anything new (vs just using cache)
    did_synthesize = False

    effective_pronunciation_dictionary_locators = voiceover.pronunciation_dictionary_locators
    pronunciation_rules: list[PronunciationRule] = []
    if provider_name == "elevenlabs" and voiceover.pronunciations:
        api_key = getattr(provider, "api_key", "")
        base_url = getattr(provider, "base_url", "https://api.elevenlabs.io")
        if not api_key:
            raise CompileError("ElevenLabs pronunciation dictionaries require providers.elevenlabs.api_key in config")

        rules: list[PronunciationRule] = []
        for lex in voiceover.pronunciations:
            if lex.alias is not None:
                rules.append(
                    PronunciationRule(
                        string_to_replace=lex.grapheme,
                        type="alias",
                        alias=lex.alias,
                    )
                )
                continue
            if not lex.phoneme:
                raise CompileError(f'Pronunciation lexeme for "{lex.grapheme}" must provide phoneme or alias')
            rules.append(
                PronunciationRule(
                    string_to_replace=lex.grapheme,
                    type="phoneme",
                    phoneme=lex.phoneme,
                    alphabet=lex.alphabet or "ipa",
                )
            )

        pronunciation_rules = rules
        dict_name = voiceover.pronunciation_dictionary_name or f"babulus-{_video_name_from_dsl_path(dsl_path)}"
        did, _vid = ensure_dictionary_from_rules(
            base_url=base_url,
            api_key=api_key,
            name=dict_name,
            rules=rules,
            manifest=manifest,
            workspace_access=voiceover.pronunciation_dictionary_workspace_access,
            description=voiceover.pronunciation_dictionary_description,
        )
        # Use latest dictionary version implicitly by omitting version_id.
        # This avoids any propagation/race issues when a dictionary was just updated.
        auto_locator = {"pronunciation_dictionary_id": did, "version_id": None}
        merged: list[dict[str, str | None]] = [auto_locator]
        for loc in voiceover.pronunciation_dictionary_locators or []:
            if loc.get("pronunciation_dictionary_id") == did:
                continue
            merged.append(loc)
        if len(merged) > 3:
            raise CompileError("ElevenLabs supports up to 3 pronunciation dictionaries per request")
        effective_pronunciation_dictionary_locators = merged
        pronunciation_rules_hash = rules_hash(rules)
    else:
        pronunciation_rules_hash = None

    # Linearize items to compute absolute times.
    now = 0.0
    timeline: list[dict[str, Any]] = []
    out_scenes: list[Scene] = []
    segment_paths: list[Path] = []
    segment_paths_for_concat: list[Path] = []
    narration_segment_clips: list[dict[str, Any]] = []
    public_segments_dir: Path | None = None
    staged_segment_filenames: set[str] = set()
    if audio_out and "public" in Path(audio_out).parts:
        video_slug = _video_name_from_dsl_path(dsl_path)
        public_segments_dir = Path(audio_out).parent / video_slug / "segments"
        public_segments_dir.mkdir(parents=True, exist_ok=True)

    if voiceover.lead_in_sec > 0:
        if any(s.time is not None for s in scenes):
            raise CompileError("voiceover.lead_in_sec is only supported when scene times are omitted")
        now = float(voiceover.lead_in_sec)
        timeline.append({"type": "lead_in", "startSec": 0.0, "endSec": now, "seconds": now})

    cue_start_index: dict[str, float] = {}
    cue_scene_index: dict[str, str] = {}
    scene_start_index: dict[str, float] = {}
    segment_key_counts: dict[str, int] = {}

    def provider_cache_context() -> dict[str, Any]:
        # Non-secret fields that should invalidate cached audio when changed.
        if provider_name == "elevenlabs":
            return {
                "provider": "elevenlabs",
                "voice_id": getattr(provider, "voice_id", None),
                "model_id": getattr(provider, "model_id", None),
                "voice_settings": getattr(provider, "voice_settings", None),
                "base_url": getattr(provider, "base_url", None),
            }
        if provider_name == "openai":
            return {
                "provider": "openai",
                "default_model": getattr(provider, "default_model", None),
                "default_voice": getattr(provider, "default_voice", None),
                "base_url": getattr(provider, "base_url", None),
            }
        if provider_name == "aws-polly":
            return {
                "provider": "aws-polly",
                "region": getattr(provider, "region", None),
                "voice_id": getattr(provider, "voice_id", None),
                "engine": getattr(provider, "engine", None),
                "language_code": getattr(provider, "language_code", None),
            }
        if provider_name == "azure-speech":
            return {
                "provider": "azure-speech",
                "region": getattr(provider, "region", None),
                "voice_name": getattr(provider, "voice_name", None),
            }
        return {"provider": provider_name}

    tts_context = {
        "voice": voiceover.voice,
        "model": voiceover.model,
        "format": voiceover.format,
        "sample_rate_hz": voiceover.sample_rate_hz,
        "provider_ctx": provider_cache_context(),
        "pronunciation_dictionary_locators": effective_pronunciation_dictionary_locators,
        "pronunciation_rules_hash": pronunciation_rules_hash,
    }

    for scene in scenes:
        scene_start = now if scene.time is None else scene.time.start
        if scene.time is not None and scene_start < now - 1e-6:
            raise CompileError(f'Scene "{scene.id}" starts before previous scene ends')
        now = scene_start
        cues_out: list[CuePoint] = []

        def sample_between_items_pause() -> float:
            if voiceover.pause_between_items_gaussian is not None:
                g: GaussianPause = voiceover.pause_between_items_gaussian
                val = rng.gauss(g.meanSec, g.stdSec)
                if g.minSec is not None:
                    val = max(val, g.minSec)
                if g.maxSec is not None:
                    val = min(val, g.maxSec)
                return max(0.0, float(val))
            return max(0.0, float(voiceover.pause_between_items_sec))

        for idx, item in enumerate(scene.items):
            if idx > 0:
                pause = sample_between_items_pause()
                if pause > 0:
                    now += pause
                    timeline.append(
                        {
                            "type": "pause",
                            "sceneId": scene.id,
                            "startSec": now - pause,
                            "endSec": now,
                            "seconds": pause,
                        }
                    )

            if isinstance(item, PauseSpec):
                start = now
                now = start + item.seconds
                timeline.append(
                    {
                        "type": "pause",
                        "sceneId": scene.id,
                        "startSec": start,
                        "endSec": now,
                        "seconds": item.seconds,
                    }
                )
                continue

            cue = item
            start = now
            cue_segments: list[dict[str, Any]] = []
            for seg_i, seg_spec in enumerate(cue.segments):
                if isinstance(seg_spec, PauseSpec):
                    seg_start = now
                    now = seg_start + seg_spec.seconds
                    cue_segments.append(
                        {"type": "pause", "startSec": seg_start, "endSec": now, "seconds": seg_spec.seconds}
                    )
                    continue

                seg_key = _hash_key(
                    {
                        "kind": "tts",
                        "sceneId": scene.id,
                        "cueId": cue.id,
                        "text": seg_spec.text,
                        "trimEndSec": float(getattr(seg_spec, "trim_end_sec", 0.0)),
                        "ctx": tts_context,
                    }
                )
                segment_key_counts[seg_key] = segment_key_counts.get(seg_key, 0) + 1
                occurrence = segment_key_counts[seg_key]
                tts_ext = ".mp3" if provider_name == "elevenlabs" else ".wav"
                seg_path = segments_dir / f"{scene.id}--{cue.id}--tts--{_safe_prefix(seg_key)}--{occurrence}{tts_ext}"
                req = TTSRequest(
                    text=seg_spec.text,
                    voice=voiceover.voice,
                    model=voiceover.model,
                    format=voiceover.format,
                    sample_rate_hz=voiceover.sample_rate_hz,
                    extra={
                        "pronunciation_dictionary_locators": effective_pronunciation_dictionary_locators
                    }
                    if effective_pronunciation_dictionary_locators is not None
                    else {},
                )
                # Try to find cached segment in current or fallback environments
                cached_path, cached_env = resolve_cached_segment(
                    out_dir=out_dir_p,
                    current_env=current_env,
                    cache_key=seg_key,
                    scene_id=scene.id,
                    cue_id=cue.id,
                    occurrence=occurrence,
                    extension=tts_ext,
                    log=_log,
                )

                if cached_path is not None and not fresh:
                    # Found in cache (current or fallback environment)
                    duration = _get_manifest_duration(manifest, "segments", cached_path, seg_key)
                    if duration is None:
                        duration = (
                            _wav_duration_sec(cached_path)
                            if cached_path.suffix == ".wav"
                            else probe_duration_sec(cached_path)
                        )

                    # Self-heal corrupted cached audio
                    max_seg = float(getattr(voiceover, "max_tts_segment_seconds", _MAX_TTS_SEGMENT_SECONDS_DEFAULT))
                    if float(duration) > max_seg:
                        _log(
                            f"tts: corrupt-duration scene={scene.id} cue={cue.id} seg={seg_i+1} duration={float(duration):.1f}s -> regen"
                        )
                        # Regenerate in current environment
                        try:
                            seg = provider.synthesize(req, seg_path)
                        except Exception as e:
                            # Add context to provider errors
                            error_msg = str(e)
                            context_msg = (
                                f"\n\nLocation: {dsl_path}\n"
                                f"  Scene: {scene.id}\n"
                                f"  Cue: {cue.id}\n"
                                f"  Segment: {seg_i+1}\n"
                                f"  Text: {seg_spec.text[:100]!r}{'...' if len(seg_spec.text) > 100 else ''}\n"
                                f"\nEnvironment: {current_env}\n"
                                f"Provider: {provider_name}\n"
                            )
                            raise CompileError(error_msg + context_msg) from e
                        duration = float(seg.durationSec)
                        did_synthesize = True
                    else:
                        # Use cached file
                        if cached_env != current_env:
                            # Using fallback from different environment - log it
                            _log(f"tts: fallback scene={scene.id} cue={cue.id} seg={seg_i+1} using env={cached_env}")
                        elif verbose_logs:
                            # Cache hit in current environment - only show in verbose mode
                            _log(f"tts: cache scene={scene.id} cue={cue.id} seg={seg_i+1} key={_safe_prefix(seg_key)[:8]}")
                        # If from different env, use that path; otherwise seg_path == cached_path
                        seg_path = cached_path
                else:
                    # Not in cache, generate new
                    _log(f"tts: synth scene={scene.id} cue={cue.id} seg={seg_i+1} -> {seg_path.name}")
                    try:
                        seg = provider.synthesize(req, seg_path)
                    except Exception as e:
                        # Add context to provider errors
                        error_msg = str(e)
                        context_msg = (
                            f"\n\nLocation: {dsl_path}\n"
                            f"  Scene: {scene.id}\n"
                            f"  Cue: {cue.id}\n"
                            f"  Segment: {seg_i+1}\n"
                            f"  Text: {seg_spec.text[:100]!r}{'...' if len(seg_spec.text) > 100 else ''}\n"
                            f"\nEnvironment: {current_env}\n"
                            f"Provider: {provider_name}\n"
                        )
                        raise CompileError(error_msg + context_msg) from e
                    duration = float(seg.durationSec)
                    did_synthesize = True

                trim_end_cfg = float(getattr(seg_spec, "trim_end_sec", 0.0))
                if trim_end_cfg > 0:
                    trailing = estimate_trailing_silence_sec(
                        seg_path,
                        sample_rate_hz=voiceover.sample_rate_hz,
                        amplitude_threshold=80,
                        max_analyze_sec=6.0,
                    )
                    # Be conservative: only trim if there is clearly more trailing silence than the requested trim.
                    safety = 0.08
                    trim_end = trim_end_cfg if trailing >= (trim_end_cfg + safety) else 0.0
                else:
                    trim_end = 0.0
                effective_duration = max(0.0, duration - trim_end) if trim_end > 0 else duration
                _set_manifest_entry(
                    manifest,
                    "segments",
                    path=seg_path,
                    key=seg_key,
                    duration_sec=effective_duration,
                    meta={
                        "provider": provider_name,
                        "sceneId": scene.id,
                        "cueId": cue.id,
                        "text": seg_spec.text,
                        "sample_rate_hz": voiceover.sample_rate_hz,
                        "format": seg_path.suffix.lstrip("."),
                        "rawDurationSec": duration,
                        "trimEndSec": trim_end,
                    },
                )
                seg_start = now
                seg_end = seg_start + effective_duration
                now = seg_end
                segment_paths.append(seg_path)
                concat_path = seg_path
                if trim_end > 0:
                    trimmed_dir = env_cache_dir / "segments_trimmed"
                    trimmed_dir.mkdir(parents=True, exist_ok=True)
                    trimmed = trimmed_dir / seg_path.name
                    if not trimmed.exists() or fresh:
                        trim_audio_to_duration(
                            seg_path,
                            out_path=trimmed,
                            duration_sec=effective_duration,
                            sample_rate_hz=voiceover.sample_rate_hz,
                        )
                    concat_path = trimmed
                segment_paths_for_concat.append(concat_path)
                if public_segments_dir is not None:
                    staged = public_segments_dir / seg_path.name
                    if trim_end > 0:
                        # `concat_path` is already a trimmed copy; avoid trimming twice (can clip MP3 frame boundaries).
                        staged.write_bytes(concat_path.read_bytes())
                    else:
                        staged.write_bytes(seg_path.read_bytes())
                    staged_segment_filenames.add(staged.name)
                    narration_segment_clips.append(
                        {
                            "id": seg_path.stem,
                            "kind": "file",
                            "startSec": seg_start,
                            "durationSec": effective_duration,
                            "src": str(staged).split("public/", 1)[1],
                            "volume": 1.0,
                        }
                    )
                cue_segments.append(
                    {
                        "type": "tts",
                        "startSec": seg_start,
                        "endSec": seg_end,
                        "text": seg_spec.text,
                        "segmentPath": str(seg_path),
                        "durationSec": effective_duration,
                        "rawDurationSec": duration,
                        "trimEndSec": trim_end,
                    }
                )
            end = now

            cues_out.append(
                CuePoint(
                    id=cue.id,
                    label=cue.label,
                    startSec=start,
                    endSec=end,
                    text=" ".join(
                        [s.text for s in cue.segments if isinstance(s, TextSegmentSpec)]
                    ).strip(),
                    bullets=[Bullet(id=slugify(t), text=t) for t in cue.bullets],
                )
            )
            if cue.id in cue_start_index:
                raise CompileError(f'Duplicate cue id across scenes: "{cue.id}"')
            cue_start_index[cue.id] = start
            cue_scene_index[cue.id] = scene.id
            timeline.append(
                {
                    "type": "tts",
                    "sceneId": scene.id,
                    "cueId": cue.id,
                    "startSec": start,
                    "endSec": end,
                    "segments": cue_segments,
                }
            )

        if not cues_out:
            raise CompileError(f'Scene "{scene.id}" has no cues')
        scene_end_hint = None if scene.time is None else scene.time.end
        now = max(now, scene_end_hint or now)
        out_scenes.append(Scene(id=scene.id, title=scene.title, startSec=scene_start, endSec=now, cues=cues_out))
        if scene.id in scene_start_index:
            raise CompileError(f'Duplicate scene id: "{scene.id}"')
        scene_start_index[scene.id] = scene_start

    script = Script(scenes=out_scenes)
    scene_end_index: dict[str, float] = {s.id: float(s.endSec) for s in out_scenes}
    total_end_sec = float(out_scenes[-1].endSec) if out_scenes else 0.0

    Path(script_out).parent.mkdir(parents=True, exist_ok=True)
    Path(script_out).write_text(json.dumps(script.to_jsonable(), indent=2) + "\n", encoding="utf-8")
    if verbose_logs:
        _log(f"write: script={script_out} duration_seconds={total_end_sec:.2f}")

    # NOTE: Don't delete "stale" files from public/ to allow environment switching.
    # Files from other environments (e.g., .wav from development, .mp3 from production)
    # are not stale - they're valid cached assets that may be reused later.
    # Only manual cleanup (babulus clean) should remove these files.
    stale_public_segment_paths: list[Path] = []
    # Disabled: allows keeping files from multiple environments
    # if public_segments_dir is not None:
    #     for p in public_segments_dir.iterdir():
    #         if p.is_file() and p.name not in staged_segment_filenames:
    #             stale_public_segment_paths.append(p)

    audio_tracks_out: list[dict[str, Any]] = []
    if narration_segment_clips:
        # Prefer segment-based narration clips so Remotion shows each utterance as a separate Audio element.
        # (We still optionally generate a combined audio file at `--audio-out` for convenience/export.)
        audio_tracks_out.append({"id": "narration", "kind": "narration", "clips": narration_segment_clips})
    if audio_plan is not None:
        sfx_selections = load_selections(out_dir_p)
        default_sfx_provider = (
            sfx_provider_override
            or audio_plan.sfx_provider
            or get_default_sfx_provider(config)
            or "dry-run"
        )
        try:
            sfx_provider = get_sfx_provider(default_sfx_provider, config=config)
        except CompileError as e:
            # SFX provider not supported - warn and skip SFX generation
            _log(f"audio: WARNING: {e}. SFX generation will be skipped.")
            sfx_provider = None
        default_music_provider = (
            music_provider_override
            or audio_plan.music_provider
            or get_default_music_provider(config)
            or "dry-run"
        )
        try:
            music_provider = get_music_provider(default_music_provider, config=config)
        except CompileError as e:
            # Music provider not supported - warn and skip music generation
            _log(f"audio: WARNING: {e}. Music generation will be skipped.")
            music_provider = None

        # Log provider configuration
        if verbose_logs:
            sfx_status = default_sfx_provider if sfx_provider is not None else "none"
            music_status = default_music_provider if music_provider is not None else "none"
            _log(f"audio: sfx_provider={sfx_status} music_provider={music_status}")
        # Use environment-specific directories for SFX and music
        sfx_out_dir = env_cache_dir / "sfx"
        sfx_out_dir.mkdir(parents=True, exist_ok=True)
        music_out_dir = env_cache_dir / "music"
        music_out_dir.mkdir(parents=True, exist_ok=True)
        public_sfx_dir: Path | None = None
        public_music_dir: Path | None = None
        if audio_out and "public" in Path(audio_out).parts:
            # If generating a main audio file under public/, also stage chosen SFX into public/ for Remotion.
            public_sfx_dir = Path(audio_out).parent / "sfx"
            public_sfx_dir.mkdir(parents=True, exist_ok=True)
            public_music_dir = Path(audio_out).parent / "music"
            public_music_dir.mkdir(parents=True, exist_ok=True)

        def resolve_start(start: StartAt) -> float:
            if start.kind == "absolute":
                assert start.sec is not None
                return float(start.sec)
            if start.kind == "cue":
                assert start.cue is not None
                if start.cue.cueId not in cue_start_index:
                    raise CompileError(f'Unknown cue in audio start: "{start.cue.cueId}"')
                return float(cue_start_index[start.cue.cueId] + start.cue.offsetSec)
            assert start.scene is not None
            if start.scene.sceneId not in scene_start_index:
                raise CompileError(f'Unknown scene in audio start: "{start.scene.sceneId}"')
            return float(scene_start_index[start.scene.sceneId] + start.scene.offsetSec)

        def resolve_scene_for_start(start: StartAt, start_sec: float) -> str | None:
            if start.kind == "scene":
                assert start.scene is not None
                return start.scene.sceneId
            if start.kind == "cue":
                assert start.cue is not None
                return cue_scene_index.get(start.cue.cueId)
            for sc in out_scenes:
                if float(sc.startSec) - 1e-6 <= start_sec < float(sc.endSec) + 1e-6:
                    return sc.id
            return None

        for track in audio_plan.tracks:
            clips_out: list[dict[str, Any]] = []
            for clip in track.clips:
                start_sec = resolve_start(clip.start)
                if clip.kind == "file":
                    duration_for_fades: float | None = None
                    if getattr(clip, "fade_to", None) is not None or getattr(clip, "fade_out", None) is not None:
                        duration_for_fades = max(0.0, total_end_sec - start_sec)
                    envelope = _volume_envelope_for_clip(
                        base_volume=float(clip.volume),
                        duration_sec=duration_for_fades,
                        fade_to=getattr(clip, "fade_to", None),
                        fade_out=getattr(clip, "fade_out", None),
                    )
                    clips_out.append(
                        {
                            "id": clip.id,
                            "kind": "file",
                            "startSec": start_sec,
                            "src": clip.src,
                            "volume": clip.volume,
                            **({"durationSec": float(duration_for_fades)} if duration_for_fades is not None else {}),
                            **({"volumeEnvelope": envelope} if envelope is not None else {}),
                        }
                    )
                    continue

                if clip.kind == "music":
                    # Skip music generation if provider not supported
                    if music_provider is None:
                        _log(f"music: skip clip={clip.id} (provider not supported)")
                        continue
                    cache_id = getattr(clip, "source_id", None) or clip.id
                    scene_id = resolve_scene_for_start(clip.start, start_sec)
                    if clip.durationSec is not None:
                        desired = float(clip.durationSec)
                    elif getattr(clip, "play_through", False):
                        desired = total_end_sec - start_sec
                    else:
                        if not scene_id or scene_id not in scene_end_index:
                            raise CompileError(f'Cannot infer scene duration for music clip "{clip.id}"')
                        desired = float(scene_end_index[scene_id]) - start_sec
                    # ElevenLabs music has a hard API limit of 600 seconds.
                    if default_music_provider == "elevenlabs":
                        if desired > 600:
                            _log(f"music: clamp clip={clip.id} duration_seconds={desired:.1f} -> 600.0")
                            desired = 600.0
                        # ElevenLabs also requires a minimum of 3 seconds.
                        if desired < 3:
                            _log(f"music: clamp clip={clip.id} duration_seconds={desired:.2f} -> 3.0")
                            desired = 3.0
                    if desired <= 0:
                        raise CompileError(f'Non-positive music duration for "{clip.id}" (duration={desired})')

                    variants = max(1, int(clip.variants))
                    pick = int(clip.pick)
                    if pick >= variants:
                        raise CompileError(f'music pick out of range for "{clip.id}" (pick={pick}, variants={variants})')

                    # Plan music generation (logging removed to reduce noise - only log actual synthesis/fallback)
                    generated: list[dict[str, Any]] = []
                    music_ext = ".mp3" if default_music_provider == "elevenlabs" else ".wav"
                    for v in range(variants):
                        music_key = _hash_key(
                            {
                                "kind": "music",
                                "clipId": cache_id,
                                "variant": v,
                                "prompt": clip.prompt,
                                "durationSec": float(desired),
                                "model_id": getattr(clip, "model_id", None),
                                "force_instrumental": getattr(clip, "force_instrumental", None),
                                "provider": default_music_provider,
                                "seed": voiceover.seed,
                            }
                        )
                        # ElevenLabs expects a 32-bit signed integer seed (<= 2_147_483_647).
                        seed = int(music_key[:8], 16) % 2147483647
                        # Build target path in current environment
                        out_path = music_out_dir / f"{cache_id}--v{v+1}--{_safe_prefix(music_key)}{music_ext}"

                        # Try to find cached music in current or fallback environments
                        cached_path, cached_env = resolve_cached_music(
                            out_dir=out_dir_p,
                            current_env=current_env,
                            cache_key=music_key,
                            clip_id=cache_id,
                            variant=v,
                            extension=music_ext,
                            log=_log,
                        )

                        if cached_path is not None and not fresh:
                            # Found in cache
                            if cached_env != current_env:
                                _log(f"music: fallback clip={clip.id} variant={v+1}/{variants} using env={cached_env}")
                            dur = _get_manifest_duration(manifest, "music", cached_path, music_key)
                            if dur is None:
                                dur = probe_duration_sec(cached_path)
                            out_path = cached_path
                        else:
                            _log(
                                f"music: synth clip={clip.id} variant={v+1}/{variants} seed={seed} duration_seconds={desired:.1f} -> {out_path.name}"
                            )
                            req = MusicRequest(
                                prompt=clip.prompt or "",
                                duration_seconds=float(desired),
                                sample_rate_hz=voiceover.sample_rate_hz,
                                seed=seed,
                                model_id=getattr(clip, "model_id", None),
                                force_instrumental=getattr(clip, "force_instrumental", None),
                                extra={},
                            )
                            try:
                                seg = music_provider.generate(req, out_path)
                                dur = float(seg.durationSec)
                                did_synthesize = True
                            except Exception as e:  # noqa: BLE001
                                msg = str(e).strip().splitlines()[0] if str(e).strip() else type(e).__name__
                                _log(
                                    f"music: synth-failed clip={clip.id} variant={v+1}/{variants} err={type(e).__name__}: {msg}"
                                )
                                # Don't fail the whole run if music generation fails (quota/etc).
                                # Prefer an existing cached variant for this clip+variant if available.
                                existing = sorted(music_out_dir.glob(f"{cache_id}--v{v+1}--*{music_ext}"))
                                if existing:
                                    out_path = existing[0]
                                    dur = probe_duration_sec(out_path)
                                    _log(
                                        f"music: fallback clip={clip.id} variant={v+1}/{variants} using_cached={out_path.name}"
                                    )
                                else:
                                    dur = float(desired)
                                    _log(
                                        f"music: fallback clip={clip.id} variant={v+1}/{variants} no_cache=true"
                                    )

                        if out_path.exists():
                            _set_manifest_entry(
                                manifest,
                                "music",
                                path=out_path,
                                key=music_key,
                                duration_sec=float(dur),
                                meta={
                                    "provider": default_music_provider,
                                    "clipId": cache_id,
                                    "variant": v,
                                    "prompt": clip.prompt,
                                    "durationSecHint": float(desired),
                                    "model_id": getattr(clip, "model_id", None),
                                    "force_instrumental": getattr(clip, "force_instrumental", None),
                                    "format": out_path.suffix.lstrip("."),
                                },
                            )
                        generated.append(
                            {"variant": v, "seed": seed, "path": str(out_path), "durationSec": float(dur)}
                        )

                    chosen = generated[pick]
                    chosen_src: str | None = None
                    envelope = _volume_envelope_for_clip(
                        base_volume=float(clip.volume),
                        duration_sec=float(chosen["durationSec"]),
                        fade_to=getattr(clip, "fade_to", None),
                        fade_out=getattr(clip, "fade_out", None),
                    )
                    if public_music_dir is not None:
                        chosen_path = Path(chosen["path"])
                        if not chosen_path.exists():
                            # Music is optional; if we couldn't generate and have no cache, keep src null.
                            chosen_src = None
                        else:
                            staged_dir = public_music_dir / cache_id
                            staged_dir.mkdir(parents=True, exist_ok=True)
                            staged = staged_dir / chosen_path.name
                            staged.write_bytes(chosen_path.read_bytes())
                            # Clean up old staged variants for this clip to avoid confusion and caching.
                            for p in staged_dir.iterdir():
                                if not p.is_file():
                                    continue
                                if p.name != staged.name:
                                    try:
                                        p.unlink()
                                    except Exception:  # noqa: BLE001
                                        pass
                            chosen_src = str(staged).split("public/", 1)[1]

                    # Selected variant (logging removed to reduce noise)
                    clips_out.append(
                        {
                            "id": clip.id,
                            "kind": "music",
                            "startSec": start_sec,
                            "volume": clip.volume,
                            "prompt": clip.prompt,
                            "pick": pick,
                            "variants": generated,
                            "chosen": chosen,
                            "src": chosen_src,
                            "playThrough": bool(getattr(clip, "play_through", False)),
                            **({"volumeEnvelope": envelope} if envelope is not None else {}),
                        }
                    )
                    continue

                # SFX: Generate N variants (cache if files already exist), select `pick`.
                # Skip SFX generation if provider not supported
                if sfx_provider is None:
                    _log(f"sfx: skip clip={clip.id} (provider not supported)")
                    continue
                variants = max(1, int(clip.variants))
                pick = int(sfx_selections.picks.get(clip.id, int(clip.pick)))
                if pick >= variants:
                    raise CompileError(f'sfx pick out of range for "{clip.id}" (pick={pick}, variants={variants})')

                cache_id = getattr(clip, "source_id", None) or clip.id

                generated: list[dict[str, Any]] = []
                sfx_ctx = {
                    "provider": default_sfx_provider,
                    "sample_rate_hz": voiceover.sample_rate_hz,
                    "provider_ctx": {
                        "base_url": getattr(sfx_provider, "base_url", None),
                        "model_id": getattr(sfx_provider, "model_id", None),
                        "prompt_influence": getattr(sfx_provider, "prompt_influence", None),
                        "loop": getattr(sfx_provider, "loop", None),
                    }
                    if default_sfx_provider == "elevenlabs"
                    else {},
                }
                sfx_ext = ".mp3" if default_sfx_provider == "elevenlabs" else ".wav"
                for v in range(variants):
                    sfx_key = _hash_key(
                        {
                            "kind": "sfx",
                            "clipId": cache_id,
                            "variant": v,
                            "prompt": clip.prompt,
                            "durationSec": clip.durationSec,
                            "ctx": sfx_ctx,
                            "seed": voiceover.seed,
                        }
                    )
                    # ElevenLabs expects a 32-bit signed integer seed (<= 2_147_483_647).
                    seed = int(sfx_key[:8], 16) % 2147483647
                    # Build target path in current environment
                    out_path = sfx_out_dir / f"{cache_id}--v{v+1}--{_safe_prefix(sfx_key)}{sfx_ext}"

                    # Try to find cached SFX in current or fallback environments
                    cached_path, cached_env = resolve_cached_sfx(
                        out_dir=out_dir_p,
                        current_env=current_env,
                        cache_key=sfx_key,
                        clip_id=cache_id,
                        variant=v,
                        extension=sfx_ext,
                        log=_log,
                    )

                    if cached_path is not None and not fresh:
                        # Found in cache
                        if cached_env != current_env:
                            _log(f"sfx: fallback clip={clip.id} variant={v+1}/{variants} using env={cached_env}")
                        dur = _get_manifest_duration(manifest, "sfx", cached_path, sfx_key)
                        if dur is None:
                            dur = (
                                _wav_duration_sec(cached_path)
                                if cached_path.suffix == ".wav"
                                else probe_duration_sec(cached_path)
                            )
                        out_path = cached_path
                    else:
                        # Generate new SFX
                        _log(f"sfx: synth clip={clip.id} variant={v+1}/{variants} seed={seed} -> {out_path.name}")
                        req = SFXRequest(
                            prompt=clip.prompt or "",
                            durationSec=clip.durationSec,
                            sample_rate_hz=voiceover.sample_rate_hz,
                            seed=seed,
                            extra={},
                        )
                        seg = sfx_provider.generate(req, out_path)
                        dur = float(seg.durationSec)
                        did_synthesize = True
                    _set_manifest_entry(
                        manifest,
                        "sfx",
                        path=out_path,
                        key=sfx_key,
                        duration_sec=dur,
                        meta={
                            "provider": default_sfx_provider,
                            "clipId": clip.id,
                            "variant": v,
                            "prompt": clip.prompt,
                            "durationSecHint": clip.durationSec,
                            "sample_rate_hz": voiceover.sample_rate_hz,
                            "format": out_path.suffix.lstrip("."),
                        },
                    )
                    generated.append(
                        {
                            "variant": v,
                            "seed": seed,
                            "path": str(out_path),
                            "durationSec": dur,
                        }
                    )

                chosen = generated[pick]
                chosen_src: str | None = None
                envelope = _volume_envelope_for_clip(
                    base_volume=float(clip.volume),
                    duration_sec=float(chosen["durationSec"]),
                    fade_to=getattr(clip, "fade_to", None),
                    fade_out=getattr(clip, "fade_out", None),
                )
                if public_sfx_dir is not None:
                    # Clean up legacy staging from older versions (public/babulus/sfx/<clipId>.*).
                    for legacy in (
                        public_sfx_dir / f"{clip.id}.mp3",
                        public_sfx_dir / f"{clip.id}.wav",
                        public_sfx_dir / f"{clip.id}.ogg",
                    ):
                        if legacy.exists() and legacy.is_file():
                            try:
                                legacy.unlink()
                            except Exception:  # noqa: BLE001
                                pass

                    chosen_path = Path(chosen["path"])
                    staged_dir = public_sfx_dir / clip.id
                    staged_dir.mkdir(parents=True, exist_ok=True)
                    staged = staged_dir / chosen_path.name
                    staged.write_bytes(chosen_path.read_bytes())
                    # Clean up old staged variants for this clip to avoid confusion and caching.
                    for p in staged_dir.iterdir():
                        if not p.is_file():
                            continue
                        if p.name != staged.name:
                            try:
                                p.unlink()
                            except Exception:  # noqa: BLE001
                                pass
                    # Remotion staticFile path
                    chosen_src = str(staged).split("public/", 1)[1]
                clips_out.append(
                    {
                        "id": clip.id,
                        "kind": "sfx",
                        "startSec": start_sec,
                        "volume": clip.volume,
                        "prompt": clip.prompt,
                        "pick": pick,
                        "selectionPath": str(selection_path(out_dir_p)),
                        "variants": generated,
                        "chosen": chosen,
                        "src": chosen_src,
                        **({"volumeEnvelope": envelope} if envelope is not None else {}),
                    }
                )

            audio_tracks_out.append({"id": track.id, "kind": track.kind, "clips": clips_out})

    Path(timeline_out).parent.mkdir(parents=True, exist_ok=True)
    Path(timeline_out).write_text(
        json.dumps({"items": timeline, "audio": {"tracks": audio_tracks_out}}, indent=2) + "\n",
        encoding="utf-8",
    )
    if verbose_logs:
        _log(f"write: timeline={timeline_out} items={len(timeline)} tracks={len(audio_tracks_out)}")
    _atomic_write_json(manifest_path, manifest)

    if audio_out:
        outp = Path(audio_out)
        if outp.suffix == ".wav" and all(p.suffix == ".wav" for p in segment_paths_for_concat):
            _concat_wavs(outp, segment_paths_for_concat, voiceover.sample_rate_hz)
        else:
            concat_audio_files(outp, segment_paths_for_concat)
        audio_path = audio_out
        if verbose_logs:
            _log(f"write: audio={audio_out} segments={len(segment_paths_for_concat)}")
    else:
        audio_path = None

    # Now that generation succeeded, it's safe to delete stale staged segment files.
    for p in stale_public_segment_paths:
        try:
            p.unlink()
        except Exception:  # noqa: BLE001
            pass
    if stale_public_segment_paths:
        if verbose_logs:
            _log(f"cleanup: deleted_stale_public_segments={len(stale_public_segment_paths)}")

    return GeneratedArtifact(
        script=script, audio_path=audio_path, timeline_path=timeline_out, did_synthesize=did_synthesize
    )
