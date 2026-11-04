"""Unit tests for the quota finisher's arithmetic and the budget guard."""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest

LAMBDAS = Path(__file__).resolve().parents[1] / "lambdas"
LAYER = str(LAMBDAS / "spend_guards_layer" / "python")
if LAYER not in sys.path:
    sys.path.insert(0, LAYER)


def _load(name: str, relative: str):
    spec = importlib.util.spec_from_file_location(name, LAMBDAS / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def finisher(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("JOBS_TABLE", "jobs")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    return _load("quota_finish_under_test", "quota_finish/handler.py")


def test_actual_items_are_whole_vcpu_seconds_rounded_up(finisher) -> None:
    detail = {"startedAt": 1_000, "stoppedAt": 1_000 + 600_001}
    assert finisher.actual_vcpu_seconds(detail, 2) == 1202


def test_a_job_that_never_started_ran_nothing(finisher) -> None:
    assert finisher.actual_vcpu_seconds({}, 2) == 0
    assert (
        finisher.actual_vcpu_seconds({"startedAt": 5_000, "stoppedAt": 5_000}, 2) == 0
    )


def test_every_attempt_of_a_retried_job_counts(finisher) -> None:
    detail = {
        "attempts": [
            {"startedAt": 0, "stoppedAt": 100_000},
            {"startedAt": 200_000, "stoppedAt": 250_000},
        ]
    }
    assert finisher.actual_vcpu_seconds(detail, 2) == 300


def test_events_that_are_not_ours_or_not_final_are_ignored(finisher) -> None:
    running = {"detail": {"status": "RUNNING", "jobName": "babulus-abc"}}
    other = {"detail": {"status": "FAILED", "jobName": "somebody-else-abc"}}
    assert finisher.handler(running, None) == {"result": "ignored"}
    assert finisher.handler(other, None) == {"result": "ignored"}


def test_budget_guard_disables_every_queue_and_fails_loudly_on_one_miss(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    guard = _load("budget_guard_under_test", "budget_guard/handler.py")
    guard.QUEUE_NAMES = "gpu,cpu"
    batch = Mock()
    batch.describe_job_queues.side_effect = lambda jobQueues: {
        "jobQueues": (
            [{"jobQueueArn": f"arn:{jobQueues[0]}"}] if jobQueues[0] == "gpu" else []
        )
    }
    guard._batch = batch
    with pytest.raises(LookupError):
        guard.handler({}, None)
    # The queue that could be found was still disabled before it raised.
    batch.update_job_queue.assert_called_once_with(jobQueue="arn:gpu", state="DISABLED")


def test_budget_guard_keeps_working_with_a_single_queue(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    guard = _load("budget_guard_single", "budget_guard/handler.py")
    guard.QUEUE_NAMES = ""
    guard.QUEUE_NAME = "only"
    batch = Mock()
    batch.describe_job_queues.return_value = {
        "jobQueues": [{"jobQueueArn": "arn:only"}]
    }
    guard._batch = batch
    assert guard.handler({}, None) == {"jobQueueArn": "arn:only", "state": "DISABLED"}
    assert os.environ.get("BATCH_JOB_QUEUE_NAMES") is None
