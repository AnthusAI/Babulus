from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
import warnings
from pathlib import Path
from typing import Callable

# Requests can emit a scary warning if optional encoding detectors aren't installed.
# Silence it globally (without importing requests) and only print an actionable hint
# for commands that actually call external APIs.
try:
    import chardet  # noqa: F401

    _HAVE_REQUESTS_DETECTOR = True
except Exception:  # noqa: BLE001
    try:
        import charset_normalizer  # noqa: F401

        _HAVE_REQUESTS_DETECTOR = True
    except Exception:  # noqa: BLE001
        _HAVE_REQUESTS_DETECTOR = False

if not _HAVE_REQUESTS_DETECTOR:
    warnings.filterwarnings(
        "ignore",
        message=r"Unable to find acceptable character detection dependency.*",
        category=Warning,
    )

from .compiler import CompileOptions, compile_file
from .config import find_config_path, load_config
from .errors import BabulusError
from .media import is_audio_all_silence, probe_duration_sec, probe_volume_db
from .voiceover_generate import generate_voiceover
from .util import slugify
from .sfx_workflow import archive_variants, bump_pick, clear_live_variants, load_selections, restore_variants, set_pick


def _cmd_compile(args: argparse.Namespace) -> int:
    script = compile_file(args.dsl, transcript_path=args.transcript, options=CompileOptions(strict=args.strict))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(script.to_jsonable(), indent=2 if args.pretty else None, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )
    return 0


def _discover_project_dsls(cwd: Path) -> list[Path]:
    """
    Default discovery is intentionally project-centric:
      1) Look under ./content/** for *.babulus.y*ml
      2) Otherwise, look in ./ for *.babulus.y*ml (non-recursive)
    """
    content_dir = cwd / "content"
    dsls: list[Path] = []
    if content_dir.exists() and content_dir.is_dir():
        dsls.extend([p for p in content_dir.rglob("*.babulus.yml") if p.is_file()])
        dsls.extend([p for p in content_dir.rglob("*.babulus.yaml") if p.is_file()])
        dsls.sort()
        return dsls

    dsls.extend([p for p in cwd.glob("*.babulus.yml") if p.is_file()])
    dsls.extend([p for p in cwd.glob("*.babulus.yaml") if p.is_file()])
    dsls.sort()
    return dsls


def _video_slug_from_dsl_path(dsl_path: Path) -> str:
    name = dsl_path.name
    for suffix in (".babulus.yml", ".babulus.yaml", ".yml", ".yaml"):
        if name.endswith(suffix):
            name = name[: -len(suffix)]
            break
    return slugify(name.strip() or "video")


def _defaults_for_dsl(dsl_path: Path, project_dir: Path | None = None) -> tuple[str, str, str, str]:
    """
    Compute default output paths.

    If project_dir not provided, auto-detect it from DSL location by
    walking up to find .babulus/ or .git/ directory.
    """
    # Auto-detect project root if not specified
    if project_dir is None:
        from .config import find_project_root
        project_dir = find_project_root(dsl_path.resolve())

    video = _video_slug_from_dsl_path(dsl_path)

    def _p(p: str) -> str:
        return str(project_dir / p)

    script_out = _p(f"src/videos/{video}/{video}.script.json")
    timeline_out = _p(f"src/videos/{video}/{video}.timeline.json")
    audio_out = _p(f"public/babulus/{video}.wav")
    out_dir = _p(f".babulus/out/{video}")
    return script_out, timeline_out, audio_out, out_dir


def _is_within(root: Path, p: Path) -> bool:
    try:
        p.resolve().relative_to(root.resolve())
        return True
    except Exception:  # noqa: BLE001
        return False


def _collect_generated_paths_for_dsl(
    dsl_path: Path,
    cwd: Path,
    env: str | None = None,
    only_voice: bool = False,
    only_sfx: bool = False,
    only_music: bool = False,
    project_dir: Path | None = None,
) -> list[Path]:
    """Collect generated paths for a DSL file.

    Args:
        dsl_path: Path to .babulus.yml
        cwd: Current working directory
        env: Environment name (None = current BABULUS_ENV)
        only_voice: Only clean voice/TTS segments
        only_sfx: Only clean SFX
        only_music: Only clean music
        project_dir: Optional project directory prefix
    """
    import os
    from .cache_resolver import resolve_env_cache_dir

    script_out_s, timeline_out_s, audio_out_s, out_dir_s = _defaults_for_dsl(dsl_path, project_dir)
    video = _video_slug_from_dsl_path(dsl_path)

    # Determine environment to clean
    if env is None:
        env = os.environ.get("BABULUS_ENV", "development")

    out_dir_p = cwd / out_dir_s
    env_cache_dir = resolve_env_cache_dir(out_dir_p, env)

    def _p_public(parts: list[str]) -> Path:
        base = cwd / project_dir if project_dir else cwd
        return base.joinpath("public", *parts)

    candidates: list[Path] = []

    # If selective cleaning, only clean specific types from env cache
    if only_voice or only_sfx or only_music:
        if only_voice:
            candidates.append(env_cache_dir / "segments")
            candidates.append(env_cache_dir / "segments_trimmed")
            candidates.append(_p_public(["babulus", video, "segments"]))
        if only_sfx:
            candidates.append(env_cache_dir / "sfx")
            candidates.append(env_cache_dir / "sfx_archived")
            candidates.append(_p_public(["babulus", "sfx"]))
        if only_music:
            candidates.append(env_cache_dir / "music")
            candidates.append(_p_public(["babulus", "music"]))
    else:
        # Clean everything for this environment
        candidates.extend([
            cwd / script_out_s,
            cwd / timeline_out_s,
            cwd / audio_out_s,
            env_cache_dir,  # Only clean current environment's cache
            _p_public(["babulus", video]),  # staged segments
        ])

        # Also remove any referenced clip sources under public/ (e.g. babulus/sfx/*.mp3).
        timeline_path = cwd / timeline_out_s
        if timeline_path.exists():
            try:
                obj = json.loads(timeline_path.read_text(encoding="utf-8"))
                tracks = (obj.get("audio") or {}).get("tracks") or []
                for t in tracks:
                    for clip in (t.get("clips") or []):
                        src = clip.get("src")
                        if isinstance(src, str) and src:
                            if project_dir:
                                candidates.append(cwd / project_dir / "public" / src)
                            else:
                                candidates.append(cwd / "public" / src)
            except Exception:  # noqa: BLE001
                pass

        # Remove legacy output locations if present.
        if project_dir:
            candidates.append(cwd / project_dir / "src" / "babulus" / "generated" / "script.json")
        else:
            candidates.append(cwd / "src" / "babulus" / "generated" / "script.json")

    # Filter to only paths within this repo.
    out: list[Path] = []
    for p in candidates:
        if _is_within(cwd, p):
            out.append(p)
    # De-dupe while preserving order
    seen: set[str] = set()
    uniq: list[Path] = []
    for p in out:
        key = str(p)
        if key in seen:
            continue
        seen.add(key)
        uniq.append(p)
    return uniq


def _cmd_stage(args: argparse.Namespace) -> int:
    script_in = Path(args.script_in)
    script_out = Path(args.script_out)
    script_out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(script_in, script_out)

    if args.audio_in:
        audio_in = Path(args.audio_in)
        audio_out = Path(args.audio_out)
        audio_out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(audio_in, audio_out)

    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="babulus")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_compile = sub.add_parser("compile", help="Compile DSL to script.json")
    p_compile.add_argument("--dsl", required=True, help="Path to DSL file")
    p_compile.add_argument("--out", required=True, help="Output JSON path")
    p_compile.add_argument("--transcript", help="Optional transcript words JSON path")
    p_compile.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    p_compile.add_argument("--strict", action="store_true", help="Require explicit cue times if no transcript")
    p_compile.set_defaults(func=_cmd_compile)

    p_stage = sub.add_parser("stage", help="Copy compiled artifacts into Remotion paths")
    p_stage.add_argument("--script-in", required=True, help="Input script.json")
    p_stage.add_argument(
        "--script-out",
        default="src/babulus/generated/script.json",
        help="Destination script JSON (default: src/babulus/generated/script.json)",
    )
    p_stage.add_argument("--audio-in", help="Optional audio file to copy")
    p_stage.add_argument(
        "--audio-out",
        default="public/babulus/narration.mp3",
        help="Destination audio under public/ (default: public/babulus/narration.mp3)",
    )
    p_stage.set_defaults(func=_cmd_stage)

    p_gen = sub.add_parser(
        "generate",
        help="Generate voiceover audio + compute timings (audio-driven)",
    )
    p_gen.add_argument(
        "dsl",
        nargs="?",
        help="Path to .babulus.yml file or directory (default: auto-discover from ./content/ or ./)",
    )
    p_gen.add_argument("--script-out", help="Output script JSON path (default: src/videos/<video>/<video>.script.json)")
    p_gen.add_argument(
        "--timeline-out",
        help="Output timeline JSON path (default: src/videos/<video>/<video>.timeline.json)",
    )
    p_gen.add_argument(
        "--audio-out",
        help="Output audio path (default: public/babulus/<video>.wav). If under public/, Remotion can play it.",
    )
    p_gen.add_argument("--out-dir", help="Intermediate output dir (default: .babulus/out/<video>)")
    p_gen.add_argument(
        "--environment",
        "--env",
        help='Set environment for provider/voice/model selection (e.g. "development", "marin", "production"). Overrides BABULUS_ENV.',
    )
    p_gen.add_argument("--provider", help='Override voiceover.provider (e.g. "dry-run")')
    p_gen.add_argument("--sfx-provider", help='Override config audio.default_sfx_provider (e.g. "elevenlabs")')
    p_gen.add_argument("--music-provider", help='Override config audio.default_music_provider (e.g. "elevenlabs")')
    p_gen.add_argument("--seed", type=int, help="Override voiceover.seed")
    p_gen.add_argument(
        "--fresh",
        action="store_true",
        help="Force regeneration of all audio (ignore caches)",
    )
    p_gen.add_argument(
        "--watch",
        action="store_true",
        help="Watch the DSL file(s) and re-run generation on changes",
    )
    p_gen.add_argument(
        "--poll-interval",
        type=float,
        default=0.5,
        help="Polling interval for --watch (seconds)",
    )
    p_gen.add_argument("--quiet", action="store_true", help="Suppress normal progress output")
    p_gen.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    def _cmd_generate(args: argparse.Namespace) -> int:
        import os

        # Set environment from --environment flag if provided
        if args.environment:
            os.environ["BABULUS_ENV"] = args.environment

        cwd = Path.cwd()
        project_dir = (cwd / args.project_dir).resolve() if args.project_dir else None

        # Resolve DSL paths from positional argument
        if args.dsl:
            dsl_arg = Path(args.dsl)
            if dsl_arg.is_file():
                # Single file specified
                dsl_paths = [dsl_arg]
            elif dsl_arg.is_dir():
                # Directory specified - find all DSL files recursively
                dsl_paths = []
                dsl_paths.extend([p for p in dsl_arg.rglob("*.babulus.yml") if p.is_file()])
                dsl_paths.extend([p for p in dsl_arg.rglob("*.babulus.yaml") if p.is_file()])
                dsl_paths.sort()
                if not dsl_paths:
                    raise BabulusError(f"No .babulus.yml files found in directory: {dsl_arg}")
            else:
                raise BabulusError(f"Path does not exist: {dsl_arg}")
        else:
            # No argument - use auto-discovery
            discovered = _discover_project_dsls(cwd)
            if len(discovered) == 0:
                raise BabulusError(
                    "No .babulus.yml files found. Pass a file or directory path, or create one under ./content/."
                )
            if len(discovered) > 1:
                raise BabulusError(
                    f"Multiple .babulus.yml files found ({len(discovered)} files). Pass a specific file or directory path (e.g., content/)."
                )
            dsl_paths = [discovered[0]]

        if args.watch and (args.script_out or args.timeline_out or args.audio_out or args.out_dir) and len(dsl_paths) != 1:
            raise BabulusError("When using --watch with multiple DSLs, omit explicit output overrides.")

        def _defaults_for(dsl_path: Path) -> tuple[str, str, str, str]:
            d_script, d_timeline, d_audio, d_out = _defaults_for_dsl(dsl_path, project_dir)
            script_out = args.script_out or d_script
            timeline_out = args.timeline_out or d_timeline
            audio_out = args.audio_out or d_audio
            out_dir = args.out_dir or d_out
            return script_out, timeline_out, audio_out, out_dir

        def _run_once(dsls_to_process: list[Path] | None = None, verbose_logs: bool = True) -> bool:
            """Run generation once. Returns True if any synthesis happened."""
            def _make_logger(dsl_path: Path) -> Callable[[str], None]:
                video = _video_slug_from_dsl_path(dsl_path)

                def _log(msg: str) -> None:
                    ts = time.strftime("%H:%M:%S")
                    print(f"[{ts}] {video}: {msg}", file=sys.stderr)

                return _log

            # Reload config each run so `--watch` picks up API key/provider changes.
            # For multi-DSL scenarios, use first DSL's location for config discovery
            # (all DSLs in same run should typically share config)
            reference_dsl = (dsls_to_process if dsls_to_process is not None else dsl_paths)[0]
            cfg = load_config(project_dir=project_dir, dsl_path=reference_dsl)
            # Process only specified DSLs, or all if none specified
            paths_to_process = dsls_to_process if dsls_to_process is not None else dsl_paths
            any_synthesis = False
            for dsl_path in paths_to_process:
                script_out, timeline_out, audio_out, out_dir = _defaults_for(dsl_path)
                logger = None if args.quiet else _make_logger(dsl_path)
                t0 = time.time()
                if logger is not None and verbose_logs:
                    logger(
                        "run: start"
                        + (f" fresh={bool(args.fresh)}" if args.fresh else "")
                        + (f" provider_override={args.provider}" if args.provider else "")
                        + (f" sfx_provider_override={args.sfx_provider}" if args.sfx_provider else "")
                        + (f" music_provider_override={args.music_provider}" if args.music_provider else "")
                    )
                try:
                    art = generate_voiceover(
                        dsl_path=str(dsl_path),
                        script_out=script_out,
                        audio_out=audio_out,
                        timeline_out=timeline_out,
                        out_dir=out_dir,
                        config=cfg,
                        provider_override=args.provider,
                        sfx_provider_override=args.sfx_provider,
                        music_provider_override=args.music_provider,
                        seed_override=args.seed,
                        fresh=bool(args.fresh),
                        log=logger,
                        verbose_logs=verbose_logs,
                    )
                except Exception as e:  # noqa: BLE001
                    if logger is not None:
                        msg = str(e).strip().splitlines()[0] if str(e).strip() else type(e).__name__
                        logger(
                            "run: failed"
                            + f" elapsed_seconds={time.time() - t0:.2f}"
                            + f" err={type(e).__name__}: {msg}"
                        )
                    if not args.watch:
                        # In non-watch mode, fail fast
                        raise
                    # In watch mode, log the error and continue to next video
                    print(f"\n{dsl_path}: {e}\n", file=sys.stderr)
                else:
                    if art.did_synthesize:
                        any_synthesis = True
                    if logger is not None and verbose_logs:
                        logger(
                            "run: done"
                            + f" elapsed_seconds={time.time() - t0:.2f}"
                            + f" script={script_out}"
                            + f" timeline={timeline_out}"
                            + (f" audio={art.audio_path}" if art.audio_path else "")
                        )
            return any_synthesis

        if not args.watch:
            _run_once()
            return 0

        poll = float(args.poll_interval)
        if poll <= 0:
            raise BabulusError("--poll-interval must be > 0")

        def _mtime(p: Path) -> int:
            try:
                return int(p.stat().st_mtime_ns)
            except Exception:  # noqa: BLE001
                return 0

        def _safe_run(run: Callable[[], bool]) -> bool:
            try:
                return run()
            except BabulusError as e:
                print(f"babulus: {e}", file=sys.stderr)
                return False
            except Exception as e:  # noqa: BLE001
                # Keep the watcher alive even if an API request fails or a provider returns an unexpected response.
                print(f"babulus: generation failed: {e}", file=sys.stderr)
                return False

        # Watch DSLs + whichever config file is currently in effect, plus common config locations.
        watched: list[Path] = list(dsl_paths)
        cfg_in_effect = find_config_path(cwd / project_dir if project_dir else cwd)
        if cfg_in_effect is not None:
            watched.append(cfg_in_effect)
        # Always include project-local config path, even if it doesn't exist yet.
        watched.append(cwd / ".babulus" / "config.yml")
        if project_dir:
            watched.append(cwd / project_dir / ".babulus" / "config.yml")
        # Also include home config path (common when sharing credentials across projects).
        watched.append(Path.home() / ".babulus" / "config.yml")
        # Watch SFX selection overrides (so `babulus sfx next` can hot-update in Remotion via --watch).
        # Always include this path even if it doesn't exist yet (it may get created later).
        for dsl_path in dsl_paths:
            out_dir = Path(_defaults_for(dsl_path)[3])
            watched.append(out_dir / "selections.json")

        # De-dupe while preserving order (common when config in effect is project-local).
        seen: set[str] = set()
        watched = [p for p in watched if not (str(p) in seen or seen.add(str(p)))]
        # Normalize to resolved paths to make the watch list unambiguous (and improve change detection
        # when running from different working directories).
        watched = [Path(str(p)).expanduser().resolve() for p in watched]
        seen2: set[str] = set()
        watched = [p for p in watched if not (str(p) in seen2 or seen2.add(str(p)))]

        last = {str(p): _mtime(p) for p in watched}

        # Initial run with enhanced logging
        if not args.quiet:
            print("\n" + "=" * 80, file=sys.stderr)
            print("BABULUS WATCH MODE - Initial generation", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            for i, dsl_path in enumerate(dsl_paths, 1):
                video = _video_slug_from_dsl_path(dsl_path)
                print(f"  {i}. {video} <- {dsl_path}", file=sys.stderr)
            print("=" * 80 + "\n", file=sys.stderr)

        _safe_run(_run_once)

        if not args.quiet:
            print("\n" + "=" * 80, file=sys.stderr)
            print("WATCHING FOR CHANGES", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            print(f"DSLs: {len(dsl_paths)} file(s)", file=sys.stderr)
            for dsl_path in dsl_paths:
                print(f"  - {dsl_path}", file=sys.stderr)
            print(f"Config: {cfg_in_effect if cfg_in_effect else '(none found)'}", file=sys.stderr)
            print(f"Poll interval: {poll}s", file=sys.stderr)
            print("=" * 80 + "\n", file=sys.stderr)
            print("Waiting for changes... (Ctrl+C to stop)\n", file=sys.stderr)

        while True:
            time.sleep(poll)
            changed_paths: list[str] = []
            for p in watched:
                m = _mtime(p)
                key = str(p)
                if m != last.get(key):
                    last[key] = m
                    changed_paths.append(key)

            if changed_paths:
                # Identify which DSLs changed
                changed_dsls = [p for p in dsl_paths if str(p.resolve()) in changed_paths]
                dsls_to_process = changed_dsls if changed_dsls else dsl_paths

                # Run generation and capture results
                generation_start = time.time()
                did_work = _safe_run(lambda: _run_once(dsls_to_process, verbose_logs=False))
                generation_elapsed = time.time() - generation_start

                # Always show output when change detected (make it clear if synthesis happened or not)
                if not args.quiet:
                    ts = time.strftime("%H:%M:%S")
                    # Show what changed in compact format
                    changed_files = []
                    for changed in changed_paths:
                        try:
                            rel = Path(changed).relative_to(cwd)
                            changed_files.append(str(rel))
                        except Exception:  # noqa: BLE001
                            changed_files.append(changed)

                    if changed_dsls:
                        videos_str = ", ".join(_video_slug_from_dsl_path(p) for p in changed_dsls)
                    else:
                        videos_str = "all"

                    files_str = ", ".join(changed_files)
                    if did_work:
                        print(f"\n[{ts}] {files_str} → regenerated {videos_str} ({generation_elapsed:.2f}s)\n", file=sys.stderr)
                    else:
                        print(f"\n[{ts}] {files_str} → {videos_str} (all cached, {generation_elapsed:.2f}s)\n", file=sys.stderr)
                    print("Waiting for changes... (Ctrl+C to stop)\n", file=sys.stderr)

        return 0

    p_gen.set_defaults(func=_cmd_generate)

    p_sfx = sub.add_parser("sfx", help="Manage sound-effect (SFX) variants and picks")
    sfx_sub = p_sfx.add_subparsers(dest="sfx_cmd", required=True)

    p_sfx_list = sfx_sub.add_parser("list", help="List SFX picks for a video")
    p_sfx_list.add_argument("--dsl", help="Path to .babulus.yml file (optional if discoverable)")
    p_sfx_list.add_argument("--out-dir", help="Override output dir (default: .babulus/out/<video>)")
    p_sfx_list.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    p_sfx_next = sfx_sub.add_parser("next", help="Select the next variant for a clip")
    p_sfx_next.add_argument("--clip", required=True, help="SFX clip id (e.g. whoosh)")
    p_sfx_next.add_argument("--variants", type=int, required=True, help="Number of variants for this clip")
    p_sfx_next.add_argument("--dsl", help="Path to .babulus.yml file (optional if discoverable)")
    p_sfx_next.add_argument("--out-dir", help="Override output dir (default: .babulus/out/<video>)")
    p_sfx_next.add_argument("--apply", action="store_true", help="Run `babulus generate` after changing the pick")
    p_sfx_next.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    p_sfx_prev = sfx_sub.add_parser("prev", help="Select the previous variant for a clip")
    p_sfx_prev.add_argument("--clip", required=True, help="SFX clip id (e.g. whoosh)")
    p_sfx_prev.add_argument("--variants", type=int, required=True, help="Number of variants for this clip")
    p_sfx_prev.add_argument("--dsl", help="Path to .babulus.yml file (optional if discoverable)")
    p_sfx_prev.add_argument("--out-dir", help="Override output dir (default: .babulus/out/<video>)")
    p_sfx_prev.add_argument("--apply", action="store_true", help="Run `babulus generate` after changing the pick")
    p_sfx_prev.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    p_sfx_set = sfx_sub.add_parser("set", help="Set the selected variant for a clip")
    p_sfx_set.add_argument("--clip", required=True, help="SFX clip id (e.g. whoosh)")
    p_sfx_set.add_argument("--pick", type=int, required=True, help="Variant index (0-based)")
    p_sfx_set.add_argument("--dsl", help="Path to .babulus.yml file (optional if discoverable)")
    p_sfx_set.add_argument("--out-dir", help="Override output dir (default: .babulus/out/<video>)")
    p_sfx_set.add_argument("--apply", action="store_true", help="Run `babulus generate` after changing the pick")
    p_sfx_set.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    p_sfx_archive = sfx_sub.add_parser("archive", help="Archive cached variants for a clip")
    p_sfx_archive.add_argument("--clip", required=True, help="SFX clip id (e.g. whoosh)")
    p_sfx_archive.add_argument(
        "--keep-pick",
        action="store_true",
        help="Keep the currently-selected pick in place (archive others)",
    )
    p_sfx_archive.add_argument("--dsl", help="Path to .babulus.yml file (optional if discoverable)")
    p_sfx_archive.add_argument("--out-dir", help="Override output dir (default: .babulus/out/<video>)")
    p_sfx_archive.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    p_sfx_restore = sfx_sub.add_parser("restore", help="Restore archived variants for a clip back to live cache")
    p_sfx_restore.add_argument("--clip", required=True, help="SFX clip id (e.g. whoosh)")
    p_sfx_restore.add_argument("--dsl", help="Path to .babulus.yml file (optional if discoverable)")
    p_sfx_restore.add_argument("--out-dir", help="Override output dir (default: .babulus/out/<video>)")
    p_sfx_restore.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    p_sfx_clear = sfx_sub.add_parser("clear", help="Delete live cached variants for a clip (forces regeneration)")
    p_sfx_clear.add_argument("--clip", required=True, help="SFX clip id (e.g. whoosh)")
    p_sfx_clear.add_argument("--dsl", help="Path to .babulus.yml file (optional if discoverable)")
    p_sfx_clear.add_argument("--out-dir", help="Override output dir (default: .babulus/out/<video>)")
    p_sfx_clear.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    def _resolve_single_dsl(dsl_arg: str | None) -> Path:
        if dsl_arg:
            return Path(dsl_arg)
        discovered = _discover_project_dsls(Path.cwd())
        if len(discovered) == 0:
            raise BabulusError("No .babulus.yml files found. Pass --dsl <path>.")
        if len(discovered) > 1:
            raise BabulusError("Multiple .babulus.yml files found. Pass --dsl <path>.")
        return discovered[0]

    def _resolve_out_dir(dsl_path: Path, out_dir_override: str | None) -> Path:
        if out_dir_override:
            return Path(out_dir_override)
        return Path(_defaults_for_dsl(dsl_path)[3])

    def _cmd_sfx(args: argparse.Namespace) -> int:
        cwd = Path.cwd()
        dsl_path = _resolve_single_dsl(getattr(args, "dsl", None))
        project_dir = (cwd / args.project_dir).resolve() if getattr(args, "project_dir", None) else None
        
        def _resolve_out_dir(dsl_path: Path, out_dir_override: str | None) -> Path:
            if out_dir_override:
                return Path(out_dir_override)
            return Path(_defaults_for_dsl(dsl_path, project_dir)[3])

        out_dir = _resolve_out_dir(dsl_path, getattr(args, "out_dir", None))
        state = load_selections(out_dir)
        cfg = None

        def _apply_generate() -> None:
            nonlocal cfg
            if cfg is None:
                cfg = load_config(project_dir=project_dir, dsl_path=dsl_path)
            script_out, timeline_out, audio_out, out_dir_s = _defaults_for_dsl(dsl_path, project_dir)
            generate_voiceover(
                dsl_path=str(dsl_path),
                script_out=script_out,
                audio_out=audio_out,
                timeline_out=timeline_out,
                out_dir=out_dir_s,
                config=cfg,
                provider_override=None,
                sfx_provider_override=None,
                music_provider_override=None,
                seed_override=None,
                fresh=False,
            )

        if args.sfx_cmd == "list":
            if not state.picks:
                print(f"No SFX picks set yet (out-dir: {out_dir}).", file=sys.stderr)
                return 0
            for clip_id, pick in sorted(state.picks.items()):
                print(f"{clip_id}: pick={pick}", file=sys.stderr)
            return 0

        if args.sfx_cmd in ("next", "prev"):
            delta = 1 if args.sfx_cmd == "next" else -1
            new_pick = bump_pick(out_dir, clip_id=args.clip, delta=delta, variants=int(args.variants))
            print(f"{args.clip}: pick={new_pick}", file=sys.stderr)
            if bool(getattr(args, "apply", False)):
                _apply_generate()
            return 0

        if args.sfx_cmd == "set":
            new_pick = set_pick(out_dir, clip_id=args.clip, pick=int(args.pick))
            print(f"{args.clip}: pick={new_pick}", file=sys.stderr)
            if bool(getattr(args, "apply", False)):
                _apply_generate()
            return 0

        if args.sfx_cmd == "archive":
            keep_variant = None
            if bool(args.keep_pick):
                keep_variant = int(state.picks.get(args.clip, 0))
            moved = archive_variants(out_dir=out_dir, clip_id=args.clip, keep_variant=keep_variant)
            print(f"{args.clip}: archived_files={moved}", file=sys.stderr)
            return 0

        if args.sfx_cmd == "restore":
            moved = restore_variants(out_dir=out_dir, clip_id=args.clip)
            print(f"{args.clip}: restored_files={moved}", file=sys.stderr)
            return 0

        if args.sfx_cmd == "clear":
            deleted = clear_live_variants(out_dir=out_dir, clip_id=args.clip)
            print(f"{args.clip}: deleted_files={deleted}", file=sys.stderr)
            return 0

        raise BabulusError(f"Unknown sfx command: {args.sfx_cmd}")

    p_sfx.set_defaults(func=_cmd_sfx)

    p_clean = sub.add_parser("clean", help="Remove generated artifacts (safe by default, environment-aware)")
    p_clean.add_argument(
        "dsl",
        nargs="?",
        help="Path to .babulus.yml file or directory (default: auto-discover from ./content/ or ./)",
    )
    p_clean.add_argument(
        "--env",
        help="Environment to clean (default: current BABULUS_ENV or 'development')",
    )
    p_clean.add_argument(
        "--only-voice",
        action="store_true",
        help="Only clean voice/TTS segments",
    )
    p_clean.add_argument(
        "--only-sfx",
        action="store_true",
        help="Only clean SFX",
    )
    p_clean.add_argument(
        "--only-music",
        action="store_true",
        help="Only clean music",
    )
    p_clean.add_argument(
        "--yes",
        action="store_true",
        help="Actually delete files (otherwise prints what would be deleted)",
    )
    p_clean.add_argument("--project-dir", help="Project root directory (prefix for outputs)")

    def _cmd_clean(args: argparse.Namespace) -> int:
        import os

        cwd = Path.cwd()
        project_dir = Path(args.project_dir) if args.project_dir else None

        # Resolve DSL paths from positional argument (same logic as generate)
        if args.dsl:
            dsl_arg = Path(args.dsl)
            if dsl_arg.is_file():
                dsl_paths = [dsl_arg]
            elif dsl_arg.is_dir():
                dsl_paths = []
                dsl_paths.extend([p for p in dsl_arg.rglob("*.babulus.yml") if p.is_file()])
                dsl_paths.extend([p for p in dsl_arg.rglob("*.babulus.yaml") if p.is_file()])
                dsl_paths.sort()
                if not dsl_paths:
                    raise BabulusError(f"No .babulus.yml files found in directory: {dsl_arg}")
            else:
                raise BabulusError(f"Path does not exist: {dsl_arg}")
        else:
            discovered = _discover_project_dsls(cwd)
            if len(discovered) == 0:
                raise BabulusError(
                    "No .babulus.yml files found. Pass a file or directory path, or create one under ./content/."
                )
            if len(discovered) > 1:
                raise BabulusError(
                    f"Multiple .babulus.yml files found ({len(discovered)} files). Pass a specific file or directory path (e.g., content/)."
                )
            dsl_paths = [discovered[0]]

        env = args.env or os.environ.get("BABULUS_ENV", "development")
        only_voice = args.only_voice
        only_sfx = args.only_sfx
        only_music = args.only_music

        to_delete: list[Path] = []
        for dsl in dsl_paths:
            to_delete.extend(
                _collect_generated_paths_for_dsl(
                    dsl, cwd, env=env, only_voice=only_voice, only_sfx=only_sfx, only_music=only_music, project_dir=project_dir
                )
            )

        # Keep output stable & readable.
        to_delete = sorted(set(to_delete), key=lambda p: str(p))

        if not args.yes:
            clean_type = []
            if only_voice:
                clean_type.append("voice")
            if only_sfx:
                clean_type.append("sfx")
            if only_music:
                clean_type.append("music")
            clean_desc = f" ({', '.join(clean_type)} only)" if clean_type else ""
            print(f"babulus clean (dry-run, env={env}{clean_desc}): would delete:", file=sys.stderr)
            for p in to_delete:
                print(f"- {p}", file=sys.stderr)
            print("Run again with `--yes` to delete.", file=sys.stderr)
            return 0

        for p in to_delete:
            if not p.exists():
                continue
            if p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
            else:
                try:
                    p.unlink()
                except Exception:  # noqa: BLE001
                    pass
        print(f"Deleted {len(to_delete)} path(s) from env={env}.", file=sys.stderr)
        return 0

    p_clean.set_defaults(func=_cmd_clean)

    p_inspect = sub.add_parser("inspect-audio", help="Print basic info about an audio file")
    p_inspect.add_argument("--path", required=True, help="Path to an audio file")
    p_inspect.add_argument("--sample-rate-hz", type=int, default=44100, help="Decode sample rate for silence check")
    p_inspect.set_defaults(
        func=lambda args: (
            print(json.dumps(_inspect_audio(args.path, int(args.sample_rate_hz)), indent=2))
            or 0
        )
    )

    args = parser.parse_args(argv)
    if not _HAVE_REQUESTS_DETECTOR and args.cmd in ("generate",):
        print(
            "babulus: tip: install `charset_normalizer` (or `chardet`) to silence Requests warnings: "
            "`python -m pip install charset_normalizer`",
            file=sys.stderr,
        )
    try:
        return int(args.func(args))
    except BabulusError as e:
        parser.error(str(e))
        return 2


def _inspect_audio(path_str: str, sample_rate_hz: int) -> dict[str, object]:
    p = Path(path_str)
    if not p.exists():
        alt = Path("public") / path_str
        if alt.exists():
            p = alt
        else:
            raise BabulusError(f"Audio file not found: {path_str}")
    dur = probe_duration_sec(p)
    vol = probe_volume_db(p, seconds=min(3.0, max(0.25, dur)))
    return {
        "path": str(p),
        "bytes": p.stat().st_size,
        "durationSec": dur,
        "allSilence": is_audio_all_silence(p, seconds=min(3.0, max(0.25, dur)), sample_rate_hz=sample_rate_hz),
        **vol,
    }
