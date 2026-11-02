"""Steps for the video commands' text, JSON and Fix-line output."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from behave import given, then, when
from typer.testing import CliRunner

from babulus_speech.api import AuritusApiError, AuritusSessionExpiredError
from babulus_speech.cli import app
from babulus_speech.commands import video as video_cmd
from babulus_speech.worker import video as video_mod

HASH = "c" * 64


@given("a script file and a timeline file")
def step_files(context) -> None:
    root = Path(context.scenario_root)
    (root / "script.json").write_text(json.dumps({"id": "intro"}))
    (root / "timeline.json").write_text(json.dumps({"tracks": []}))
    context.client = MagicMock()
    context.setup_error = None


def _client(context) -> MagicMock:
    if not hasattr(context, "client"):
        context.client = MagicMock()
        context.setup_error = None
    return context.client


@given("the API accepts new video jobs")
def step_accepts(context) -> None:
    _client(context).create_video_job.return_value = {
        "content_hash": HASH,
        "status": "pending",
        "waiting_reason": "waiting_for_local_worker",
        "waiting_message": "Waiting for a local worker.",
    }


@given("the API already has that video job")
def step_existing(context) -> None:
    _client(context).create_video_job.return_value = {
        "content_hash": HASH,
        "status": "pending",
        "existing": True,
    }


@given("the API says the session expired")
def step_expired(context) -> None:
    _client(context).create_video_job.side_effect = AuritusSessionExpiredError(
        "Session expired."
    )


@given("this machine has no Node.js")
def step_no_node(context) -> None:
    _client(context)
    context.setup_error = video_mod.VideoSetupError(
        "Node.js is not installed, and video rendering needs it.",
        "Install Node.js 20 or newer, then run this again.",
    )


@when('the user runs "{command}"')
def step_run(context, command: str) -> None:
    root = Path(context.scenario_root)
    words = command.format(
        script=root / "script.json", timeline=root / "timeline.json"
    ).split()
    client = _client(context)

    def find_root(*_args, **_kwargs):
        if context.setup_error is not None:
            raise context.setup_error
        return Path("/spec/babulus")

    with (
        patch.object(video_cmd, "AuritusClient", return_value=client),
        patch.object(video_cmd.video_mod, "find_video_root", side_effect=find_root),
    ):
        context.result = CliRunner().invoke(app, words)
    _ = AuritusApiError


@then("the video command succeeds")
def step_succeeds(context) -> None:
    assert context.result.exit_code == 0, context.result.output


@then("the video command fails")
def step_fails(context) -> None:
    assert context.result.exit_code != 0, context.result.output


@then('the output mentions the content hash and "{text}"')
def step_mentions(context, text: str) -> None:
    assert HASH in context.result.output, context.result.output
    assert text in context.result.output, context.result.output


def _json_output(context) -> dict:
    lines = [ln for ln in context.result.stdout.splitlines() if ln.strip()]
    assert len(lines) == 1, context.result.stdout
    return json.loads(lines[0])


@then(
    'the output is one JSON object with "ok" true, kind "video" and a "waiting_reason"'
)
def step_json_ok(context) -> None:
    data = _json_output(context)
    assert data["ok"] is True and data["kind"] == "video", data
    assert data["waiting_reason"] == "waiting_for_local_worker", data


@then('the output is one JSON object with "existing" true')
def step_json_existing(context) -> None:
    assert _json_output(context)["existing"] is True


@then('the output is one JSON object with "ok" false and a "fix"')
def step_json_fail(context) -> None:
    data = _json_output(context)
    assert data["ok"] is False and data["fix"] and data["error"], data
    context.fix_text = data["fix"]


@then('the error output has an "Error:" line and a "Fix:" line')
def step_error_lines(context) -> None:
    text = context.result.stderr
    assert any(line.startswith("Error:") for line in text.splitlines()), text
    fixes = [line for line in text.splitlines() if line.startswith("Fix:")]
    assert fixes, text
    context.fix_text = fixes[0]


@then('the fix mentions "{text}"')
def step_fix_mentions(context, text: str) -> None:
    assert text in context.fix_text, context.fix_text
