"""Steps for the unified local worker running video jobs, with a fake renderer."""

from __future__ import annotations

import json
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from behave import given, then, when
from typer.testing import CliRunner

from babulus_speech.api import AuritusApiError
from babulus_speech.cli import app
from babulus_speech.worker import daemon
from babulus_speech.worker import video as video_mod

_REAL_SLEEP = time.sleep  # the worker's own sleep is patched out below
SPEECH_HASH = "speech-job-hash"
VIDEO_HASH = "video-job-hash"
SPEECH_JOB = {
    "content_hash": SPEECH_HASH,
    "kind": "speech",
    "text": "Narrated text.",
    "tts_backend": "kokoro",
    "voice_id": "default",
}
VIDEO_JOB = {"content_hash": VIDEO_HASH, "kind": "video"}
FAKE_TOOLCHAIN = video_mod.VideoToolchain(
    root=Path("/spec/babulus"),
    node="/spec/node",
    tsx=Path("/spec/babulus/node_modules/.bin/tsx"),
    ffmpeg="/spec/ffmpeg",
)


def _client(context) -> MagicMock:
    if not hasattr(context, "client"):
        client = MagicMock()
        client.list_claimable.return_value = []
        client.claim_job.side_effect = lambda h, o, *a: {
            "status": "claimed",
            "claim_token": f"token-{h}",
        }
        client.get_job_input.return_value = {
            "content_hash": VIDEO_HASH,
            "script": {"id": "intro", "durationFrames": 4},
            "timeline": {"tracks": []},
            "options": {"fps": 24},
            "audio_url": None,
            "audio_sha256": None,
        }
        client.presign_upload.side_effect = lambda h, token=None: {
            "upload_url": f"https://uploads.example/{h}",
            "audio_key": f"out/{h}",
            "output_key": f"out/{h}",
        }
        context.client = client
        context.runner_calls = []
        context.runner = _default_runner(context, write_video=False)
        context.video_check = None
        context.heartbeat = None
    return context.client


def _default_runner(context, *, write_video: bool, code: int = 0, frames=0, lines=()):
    def run(command, cwd, env, on_line):
        context.runner_calls.append(command)
        out = Path(command[command.index("--out") + 1])
        frames_dir = Path(command[command.index("--frames") + 1])
        frames_dir.mkdir(parents=True, exist_ok=True)
        for line in lines:
            on_line(line)
        for index in range(frames):
            (frames_dir / f"frame-{index:06d}.png").write_bytes(b"png")
            _REAL_SLEEP(0.05)
        if write_video:
            out.write_bytes(b"fake-mp4-bytes")
        return code

    return run


@given("the queue holds a speech job and a video job")
def step_both(context) -> None:
    _client(context).list_claimable.return_value = [SPEECH_JOB, VIDEO_JOB]


@given("the queue holds a video job")
def step_video_only(context) -> None:
    _client(context).list_claimable.return_value = [VIDEO_JOB]


@given("the machine is set up for video")
def step_setup_ok(context) -> None:
    _client(context)
    context.video_check = lambda: FAKE_TOOLCHAIN


@given("the machine has no Node.js")
def step_no_node(context) -> None:
    _client(context)

    def check():
        raise video_mod.VideoSetupError(
            "Node.js is not installed, and video rendering needs it.",
            "Install Node.js 20 or newer, then run this again.",
        )

    context.video_check = check


@given("the renderer writes a video")
def step_renderer_ok(context) -> None:
    context.runner = _default_runner(context, write_video=True)


@given("the renderer logs two lines and writes frames slowly before it finishes")
def step_renderer_streams(context) -> None:
    context.runner = _default_runner(
        context, write_video=True, frames=4, lines=("bundle ready", "launching")
    )
    context.progress_interval = 0.02


@given("the renderer exits with an error")
def step_renderer_fails(context) -> None:
    context.runner = _default_runner(context, write_video=False, code=3)


@given("the renderer takes a while")
def step_renderer_slow(context) -> None:
    def run(command, cwd, env, on_line):
        _REAL_SLEEP(0.4)
        Path(command[command.index("--out") + 1]).write_bytes(b"late")
        return 0

    context.runner = run


@given("the API refuses the claim renewal during the render")
def step_renewal_refused(context) -> None:
    _client(context).renew_claim.side_effect = AuritusApiError(
        "claim lost", status_code=409
    )
    context.heartbeat = 0.05


def _config(context) -> dict:
    return {
        "worker": {
            "poll_interval": 1,
            "claim_timeout": 30,
            "tts_backend": "kokoro",
            "voices_dir": None,
            "heartbeat_interval": getattr(context, "heartbeat", None),
        }
    }


def _run(context, *, video=None, json_output=False):
    client = _client(context)
    jobs = client.list_claimable.return_value
    # Serve the queue once, then stop the worker's loop.
    client.list_claimable.side_effect = [jobs, SystemExit(0)]
    backend = MagicMock()
    backend.generate.return_value = b"fake-audio"
    put = MagicMock()
    put.raise_for_status.return_value = None
    context.puts = []

    def record_put(url, content=None, timeout=None):
        context.puts.append((url, content))
        return put

    runner = CliRunner()
    original = video_mod.render_job
    interval = getattr(context, "progress_interval", 1.0)

    def render(*args, **kwargs):
        kwargs["progress_interval"] = interval
        return original(*args, **kwargs)

    with (
        patch.object(daemon, "load_config", return_value=_config(context)),
        patch.object(daemon, "AuritusClient", return_value=client),
        patch.object(daemon, "get_backend", return_value=backend),
        patch.object(daemon, "maybe_warn_near_expiry", return_value=False),
        patch.object(daemon.httpx, "put", side_effect=record_put),
        patch.object(daemon.time, "sleep", return_value=None),
        patch.object(video_mod, "render_job", side_effect=render),
    ):
        import typer

        def command() -> None:
            daemon.run_worker(
                once=False,
                video=video,
                json_output=json_output,
                video_check=context.video_check,
                video_runner=context.runner,
            )

        wrapper = typer.Typer()
        wrapper.command()(command)
        context.result = runner.invoke(wrapper, [])
    return context.result


@when("the worker runs one cycle")
def step_run(context) -> None:
    _run(context)
    assert context.result.exit_code == 0, context.result.output


@when("the worker runs one cycle with JSON output")
def step_run_json(context) -> None:
    _run(context, json_output=True)


@when("the worker is required to take video jobs")
def step_run_required(context) -> None:
    _run(context, video=True)


@then("both jobs are claimed")
def step_both_claimed(context) -> None:
    claimed = [call.args[0] for call in context.client.claim_job.call_args_list]
    # ``once`` stops after the first job, so run the second cycle too.
    assert SPEECH_HASH in claimed or VIDEO_HASH in claimed, claimed
    context.first_claimed = claimed


@then("the speech job is marked done with its claim token")
def step_speech_done(context) -> None:
    done = {c.args[0]: c.kwargs for c in context.client.mark_done.call_args_list}
    assert done[SPEECH_HASH]["claim_token"] == f"token-{SPEECH_HASH}", done


@then("the video was uploaded and its job marked done with its claim token")
def step_video_done(context) -> None:
    done = {c.args[0]: c.kwargs for c in context.client.mark_done.call_args_list}
    assert done[VIDEO_HASH]["claim_token"] == f"token-{VIDEO_HASH}", done
    assert done[VIDEO_HASH]["audio_key"] == f"out/{VIDEO_HASH}", done
    assert (f"https://uploads.example/{VIDEO_HASH}", b"fake-mp4-bytes") in context.puts


@then("the renderer was started with the job's script, timeline and audio")
def step_runner_args(context) -> None:
    command = context.runner_calls[0]
    assert "--script" in command and "--timeline" in command, command
    assert command[command.index("--fps") + 1] == "24", command


@then("every output line is a JSON object")
def step_json_lines(context) -> None:
    lines = [line for line in context.result.output.splitlines() if line.strip()]
    context.events = [json.loads(line) for line in lines]
    assert context.events, context.result.output


@then("the output includes a progress event with a frame count")
def step_progress(context) -> None:
    progress = [e for e in context.events if e.get("event") == "progress"]
    assert any(e["frames"] > 0 for e in progress), context.events


@then("the output includes the renderer's log lines")
def step_log_lines(context) -> None:
    lines = [e["line"] for e in context.events if e.get("event") == "log"]
    assert lines == ["bundle ready", "launching"], lines


@then('the video job is marked failed with a reason mentioning "{text}"')
def step_failed_reason(context, text: str) -> None:
    call = context.client.mark_failed.call_args
    assert call.args[0] == VIDEO_HASH, call
    assert text in call.kwargs["reason"], call
    assert call.kwargs["claim_token"] == f"token-{VIDEO_HASH}", call


@then("nothing is uploaded")
def step_nothing_uploaded(context) -> None:
    assert context.puts == [], context.puts
    assert not context.client.presign_upload.called


@then("only the speech job is claimed")
def step_only_speech(context) -> None:
    claimed = [call.args[0] for call in context.client.claim_job.call_args_list]
    assert claimed == [SPEECH_HASH], claimed


@then("the output says Node.js is missing and ends with a Fix line")
def step_node_missing_output(context) -> None:
    output = context.result.output
    assert "Node.js is not installed" in output, output
    assert "Fix: Install Node.js" in output, output


@then("the worker exits with status 1 and a Fix line")
def step_exit_fix(context) -> None:
    assert context.result.exit_code == 1, context.result
    assert "Fix: Install Node.js" in context.result.output, context.result.output


@then("the video job is not marked done or failed")
def step_not_marked(context) -> None:
    assert not context.client.mark_done.called
    assert not context.client.mark_failed.called


# ---- toolchain check -------------------------------------------------------


def _fake_run(node_version="v22.1.0", chromium_ok=True):
    def run(command, **kwargs):
        if "--version" in command:
            return SimpleNamespace(stdout=node_version, returncode=0)
        executable = "/spec/chromium" if chromium_ok else ""
        return SimpleNamespace(stdout=executable, returncode=0)

    return run


@given("a machine where {missing}")
def step_machine(context, missing: str) -> None:
    root = Path(context.scenario_root)
    tools = {"node": "/spec/node", "ffmpeg": "/spec/ffmpeg"}
    tsx_present = True
    node_version = "v22.1.0"
    chromium_ok = True
    if missing == "Node.js is not installed":
        tools.pop("node")
    elif missing == "Node.js is version 18":
        node_version = "v18.19.0"
    elif missing == "the packages are not installed":
        tsx_present = False
    elif missing == "Chromium is not installed":
        chromium_ok = False
    elif missing == "ffmpeg is not installed":
        tools.pop("ffmpeg")
    elif missing != "everything is installed":
        raise AssertionError(missing)
    if tsx_present:
        (root / "node_modules" / ".bin").mkdir(parents=True, exist_ok=True)
        (root / "node_modules" / ".bin" / "tsx").write_text("#!/bin/sh\n")
    chromium = root / "chromium"
    if chromium_ok:
        chromium.write_text("")
    context.check_args = dict(
        which=lambda name: tools.get(name),
        run=_fake_run(node_version, chromium_ok=chromium_ok),
    )
    if chromium_ok:
        original = context.check_args["run"]

        def run(command, **kwargs):
            result = original(command, **kwargs)
            if "--version" not in command:
                return SimpleNamespace(stdout=str(chromium), returncode=0)
            return result

        context.check_args["run"] = run


@when("the toolchain is checked")
def step_check(context) -> None:
    context.check_error = None
    try:
        context.toolchain = video_mod.check_toolchain(
            Path(context.scenario_root), **context.check_args
        )
    except video_mod.VideoSetupError as exc:
        context.check_error = exc


@then('the check fails saying "{message}" with a fix mentioning "{fix}"')
def step_check_fails(context, message: str, fix: str) -> None:
    error = context.check_error
    assert error is not None, "the check passed"
    assert message in str(error), str(error)
    assert fix in error.fix, error.fix


@then("the check passes")
def step_check_passes(context) -> None:
    assert context.check_error is None, context.check_error
    assert context.toolchain.ffmpeg == "/spec/ffmpeg"


# ---- real render (opt in with AURITUS_INTEGRATION=1) -------------------------

REPO_ROOT = Path(__file__).resolve().parents[4]


@given("the Babulus toolchain is installed on this machine")
def step_real_toolchain(context) -> None:
    root = video_mod.find_video_root(start=REPO_ROOT)
    context.real_toolchain = video_mod.check_toolchain(root)


@when('the worker renders the "{name}" example up to frame {frame:d}')
def step_real_render(context, name: str, frame: int) -> None:
    preview = REPO_ROOT / "apps" / "studio-web" / "public" / "preview"
    job_input = {
        "script": json.loads((preview / f"{name}.script.json").read_text()),
        "timeline": json.loads((preview / f"{name}.timeline.json").read_text()),
        "options": {"endFrame": frame, "workers": 1},
    }
    context.real_events = []
    context.real_output = video_mod.render_job(
        job_input,
        None,
        Path(context.scenario_root) / "real",
        context.real_toolchain,
        emit=context.real_events.append,
        progress_interval=0.2,
    )


@then("a playable MP4 file is produced")
def step_real_mp4(context) -> None:
    header = context.real_output.read_bytes()[:12]
    assert header[4:8] == b"ftyp", header
    assert context.real_output.stat().st_size > 1000


@then("progress was reported while it rendered")
def step_real_progress(context) -> None:
    assert any(
        e.get("event") == "progress" and e["frames"] > 0 for e in context.real_events
    ), context.real_events
