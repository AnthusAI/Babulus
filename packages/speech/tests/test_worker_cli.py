"""Tests for the auritus worker CLI flag wiring."""

from __future__ import annotations

from unittest.mock import patch

from typer.testing import CliRunner

from babulus_speech.cli import app

runner = CliRunner()


def test_worker_without_once_passes_false() -> None:
    with patch("babulus_speech.commands.worker_cmd.run_worker") as mock:
        result = runner.invoke(app, ["worker"])
    assert result.exit_code == 0
    mock.assert_called_once_with(once=False, video=None, json_output=False)


def test_worker_once_flag_passes_true() -> None:
    with patch("babulus_speech.commands.worker_cmd.run_worker") as mock:
        result = runner.invoke(app, ["worker", "--once"])
    assert result.exit_code == 0
    mock.assert_called_once_with(once=True, video=None, json_output=False)


def test_worker_video_and_json_flags_are_passed_through() -> None:
    with patch("babulus_speech.commands.worker_cmd.run_worker") as mock:
        result = runner.invoke(app, ["worker", "--video", "--json"])
    assert result.exit_code == 0
    mock.assert_called_once_with(once=False, video=True, json_output=True)


def test_worker_no_video_flag_ignores_video_jobs() -> None:
    with patch("babulus_speech.commands.worker_cmd.run_worker") as mock:
        result = runner.invoke(app, ["worker", "--no-video"])
    assert result.exit_code == 0
    mock.assert_called_once_with(once=False, video=False, json_output=False)
