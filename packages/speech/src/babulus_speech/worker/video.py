"""Render video jobs by running the TypeScript toolchain as a subprocess.

The ``babulus`` command is Python; only video needs Node. This module checks
the setup, writes a job's inputs to a work folder, runs the repository's
existing render entry point (``scripts/render-video-from-script.ts``), reports
progress while it runs, and returns the finished MP4. It never renders in
process and never touches the network.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

RENDER_ENTRY = Path("scripts") / "render-video-from-script.ts"
MIN_NODE_MAJOR = 20
ROOT_ENV = "BABULUS_VIDEO_ROOT"

Emit = Callable[[dict[str, Any]], None]
# (command, cwd, env, on_output_line) -> exit code
Runner = Callable[[list[str], Path, dict[str, str], Callable[[str], None]], int]


class VideoSetupError(RuntimeError):
    """The machine cannot render video yet. ``fix`` says exactly what to do."""

    def __init__(self, message: str, fix: str) -> None:
        super().__init__(message)
        self.fix = fix


class VideoRenderError(RuntimeError):
    """The toolchain ran and failed. ``fix`` says what to try."""

    def __init__(self, message: str, fix: str) -> None:
        super().__init__(message)
        self.fix = fix


@dataclass(frozen=True)
class VideoToolchain:
    """A checked Node toolchain: where it lives and how to start it."""

    root: Path
    node: str
    tsx: Path
    ffmpeg: str


def find_video_root(
    configured: str | None = None, *, start: Path | None = None
) -> Path:
    """Locate the repository folder that holds the render entry point.

    Looks at the configured folder, then ``BABULUS_VIDEO_ROOT``, then walks up
    from the current folder.

    :raises VideoSetupError: If none of them holds the entry point.
    """
    candidates: list[Path] = []
    if configured:
        candidates.append(Path(configured).expanduser())
    if os.environ.get(ROOT_ENV):
        candidates.append(Path(os.environ[ROOT_ENV]).expanduser())
    here = (start or Path.cwd()).resolve()
    candidates.extend([here, *here.parents])
    for candidate in candidates:
        if (candidate / RENDER_ENTRY).is_file():
            return candidate.resolve()
    raise VideoSetupError(
        "Video rendering needs the Babulus toolchain, and it was not found.",
        f"Check out the Babulus repository, run `npm install` in it, then set "
        f"{ROOT_ENV}=<that folder> or `video_root` under [worker] in your config.",
    )


def _node_major(version_output: str) -> int:
    match = re.match(r"v?(\d+)\.", version_output.strip())
    return int(match.group(1)) if match else 0


def check_toolchain(
    root: Path,
    *,
    which: Callable[[str], str | None] = shutil.which,
    run: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
) -> VideoToolchain:
    """Check that Node, the toolchain's packages, Chromium and ffmpeg exist.

    :raises VideoSetupError: With a message and a ``Fix:`` for the first thing
        that is missing.
    """
    node = which("node")
    if not node:
        raise VideoSetupError(
            "Node.js is not installed, and video rendering needs it.",
            f"Install Node.js {MIN_NODE_MAJOR} or newer (see .nvmrc in the "
            "Babulus repository), then run this again.",
        )
    version = run([node, "--version"], capture_output=True, text=True, check=False)
    if _node_major(version.stdout) < MIN_NODE_MAJOR:
        raise VideoSetupError(
            f"Node.js {version.stdout.strip() or '(unknown)'} is too old.",
            f"Install Node.js {MIN_NODE_MAJOR} or newer, then run this again.",
        )
    tsx = root / "node_modules" / ".bin" / "tsx"
    if not tsx.exists():
        raise VideoSetupError(
            "The Babulus toolchain's packages are not installed.",
            f"Run `npm install` in {root}.",
        )
    chromium = run(
        [
            node,
            "-e",
            "const {chromium}=require('playwright');"
            "process.stdout.write(chromium.executablePath())",
        ],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    executable = chromium.stdout.strip()
    if chromium.returncode != 0 or not executable or not Path(executable).exists():
        raise VideoSetupError(
            "Chromium is not installed for the toolchain, and video rendering needs it.",
            f"Run `npx playwright install chromium` in {root}.",
        )
    ffmpeg = which("ffmpeg")
    if not ffmpeg:
        raise VideoSetupError(
            "ffmpeg is not installed, and video rendering needs it.",
            "Install ffmpeg (for example `brew install ffmpeg`), then run this again.",
        )
    return VideoToolchain(root=root, node=node, tsx=tsx, ffmpeg=ffmpeg)


def subprocess_runner(
    command: list[str], cwd: Path, env: dict[str, str], on_line: Callable[[str], None]
) -> int:
    """Run a command, passing each output line to ``on_line``; return its exit code."""
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    assert process.stdout is not None
    for line in process.stdout:
        on_line(line.rstrip("\n"))
    return process.wait()


def _count_frames(frames_dir: Path) -> int:
    try:
        return sum(1 for entry in frames_dir.iterdir() if entry.suffix == ".png")
    except FileNotFoundError:
        return 0


def _total_frames(job_input: dict[str, Any]) -> int | None:
    options = job_input.get("options") or {}
    for source in (options, job_input.get("script") or {}):
        value = source.get("durationFrames")
        if isinstance(value, int) and value > 0:
            return value
    return None


def _watch_frames(
    frames_dir: Path,
    total: int | None,
    done: threading.Event,
    emit: Emit,
    interval: float,
) -> None:
    last = -1
    while not done.wait(interval):
        count = _count_frames(frames_dir)
        if count != last:
            last = count
            emit({"event": "progress", "frames": count, "total": total})


def render_job(
    job_input: dict[str, Any],
    audio_path: Path | None,
    workdir: Path,
    toolchain: VideoToolchain,
    *,
    emit: Emit,
    runner: Runner = subprocess_runner,
    progress_interval: float = 1.0,
) -> Path:
    """Render one video job's inputs to an MP4 in ``workdir``.

    :param job_input: The job's ``script``, ``timeline`` and ``options``.
    :param audio_path: The narration audio already downloaded, if any.
    :param workdir: An empty folder this render may write to.
    :param emit: Receives ``log`` and ``progress`` events as they happen.
    :param runner: Starts the toolchain (replaced by a fake in tests).
    :returns: The path of the rendered MP4.
    :raises VideoRenderError: If the toolchain fails or writes no video.
    """
    workdir.mkdir(parents=True, exist_ok=True)
    script_path = workdir / "script.json"
    script_path.write_text(json.dumps(job_input["script"]), encoding="utf-8")
    frames_dir = workdir / "frames"
    output = workdir / "output.mp4"
    command = [
        str(toolchain.tsx),
        str(toolchain.root / RENDER_ENTRY),
        "--script",
        str(script_path),
        "--frames",
        str(frames_dir),
        "--out",
        str(output),
        "--ffmpeg",
        toolchain.ffmpeg,
    ]
    if job_input.get("timeline"):
        timeline_path = workdir / "timeline.json"
        timeline_path.write_text(json.dumps(job_input["timeline"]), encoding="utf-8")
        command += ["--timeline", str(timeline_path)]
    if audio_path is not None:
        command += ["--audio", str(audio_path)]
    options = job_input.get("options") or {}
    flags = {
        "title": "--title",
        "subtitle": "--subtitle",
        "fps": "--fps",
        "width": "--width",
        "height": "--height",
        "durationFrames": "--duration",
        "startFrame": "--start",
        "endFrame": "--end",
        "deviceScaleFactor": "--scale",
        "workers": "--workers",
        "framePattern": "--pattern",
    }
    for key, flag in flags.items():
        if options.get(key) is not None:
            command += [flag, str(options[key])]

    done = threading.Event()
    watcher = threading.Thread(
        target=_watch_frames,
        args=(frames_dir, _total_frames(job_input), done, emit, progress_interval),
        daemon=True,
    )
    watcher.start()
    try:
        code = runner(
            command,
            toolchain.root,
            {**os.environ},
            lambda line: emit({"event": "log", "line": line}),
        )
    finally:
        done.set()
        watcher.join(timeout=2.0)
    if code != 0:
        raise VideoRenderError(
            f"The renderer exited with status {code}.",
            "Read the log lines above; to try the same input yourself run "
            f"`{toolchain.tsx} {toolchain.root / RENDER_ENTRY} --script "
            f"{script_path} --frames {frames_dir} --out {output}`.",
        )
    if not output.is_file() or output.stat().st_size == 0:
        raise VideoRenderError(
            "The renderer finished but wrote no video.",
            "Re-run the render and read its log lines; check free disk space.",
        )
    emit({"event": "progress", "frames": _count_frames(frames_dir), "total": None})
    return output


def iter_chunks(path: Path, size: int = 1 << 20) -> Iterator[bytes]:
    """Yield a file in chunks (used for hashing and upload)."""
    with path.open("rb") as handle:
        while chunk := handle.read(size):
            yield chunk
