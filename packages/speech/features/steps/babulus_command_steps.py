"""Behave steps for the babulus command and the auritus compatibility names."""

from __future__ import annotations

import importlib
import json
import subprocess
import sys
import tomllib
from pathlib import Path

from behave import given, then, when

SPEECH_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(SPEECH_DIR / "src"))


@given("the babulus-speech package metadata")
def step_metadata(context) -> None:
    context.pyproject = tomllib.loads(
        (SPEECH_DIR / "pyproject.toml").read_text(encoding="utf-8")
    )


@then('the "{command}" command runs "{target}"')
def step_command_target(context, command: str, target: str) -> None:
    assert context.pyproject["project"]["scripts"][command] == target


@when('I run the babulus command with "{arguments}"')
def step_run_babulus(context, arguments: str) -> None:
    context.completed = subprocess.run(
        [sys.executable, "-m", "babulus_speech.cli", *arguments.split()],
        capture_output=True,
        text=True,
        env={"PYTHONPATH": str(SPEECH_DIR / "src"), "PATH": "/usr/bin:/bin"},
        check=False,
    )


@then("the command succeeds")
def step_command_succeeds(context) -> None:
    assert context.completed.returncode == 0, context.completed.stderr


@then('the command output lists "{word}"')
def step_command_lists(context, word: str) -> None:
    assert word in context.completed.stdout, context.completed.stdout


@when('I import "{alias}" and "{real}"')
def step_import_both(context, alias: str, real: str) -> None:
    context.alias_module = importlib.import_module(alias)
    context.real_module = importlib.import_module(real)


@then("both names refer to the same module")
def step_same_module(context) -> None:
    assert context.alias_module is context.real_module


@then('"{alias}" and "{real}" refer to the same module')
def step_other_same_module(context, alias: str, real: str) -> None:
    assert importlib.import_module(alias) is importlib.import_module(real)


@given('the text "{text}"')
def step_request_text(context, text: str) -> None:
    context.request_text = text


@when('the speech request key is computed for backend "{backend}" and voice "{voice}"')
def step_compute_request_key(context, backend: str, voice: str) -> None:
    from babulus_speech.speech import Voice, request_key

    context.request_key = request_key(context.request_text, Voice(backend, voice))


@then('the speech request key is "{key}"')
def step_request_key(context, key: str) -> None:
    assert context.request_key == key, context.request_key


@when(
    'I start the speech bridge as module "{module}" and ask for capabilities of '
    'voice "{voice}"'
)
def step_start_bridge(context, module: str, voice: str) -> None:
    request = json.dumps(
        {"protocol": 1, "id": "check-1", "op": "capabilities", "voice": voice}
    )
    context.completed = subprocess.run(
        [sys.executable, "-m", module],
        input=request + "\n",
        capture_output=True,
        text=True,
        env={"PYTHONPATH": str(SPEECH_DIR / "src"), "PATH": "/usr/bin:/bin"},
        check=False,
    )


@then('the bridge answers ok for the voice "{voice}"')
def step_bridge_ok(context, voice: str) -> None:
    assert context.completed.returncode == 0, context.completed.stderr
    answer = json.loads(context.completed.stdout.splitlines()[0])
    assert answer["ok"] is True, answer
    assert answer["result"]["voice"] == voice, answer
