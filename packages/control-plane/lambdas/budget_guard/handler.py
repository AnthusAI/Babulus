"""Disable the Batch job queues when a budget notification fires."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import boto3

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)

_batch = boto3.client("batch")
QUEUE_ARN = os.environ.get("BATCH_JOB_QUEUE_ARN", "")
QUEUE_NAME = os.environ.get("BATCH_JOB_QUEUE_NAME", "")
# Every queue a cloud job can use (GPU for speech, CPU for video), comma
# separated. The single-queue settings above still work on their own.
QUEUE_NAMES = os.environ.get("BATCH_JOB_QUEUE_NAMES", "")


def _queue_names() -> list[str]:
    names = [name.strip() for name in QUEUE_NAMES.split(",") if name.strip()]
    if names:
        return names
    single = QUEUE_NAME
    if not single and QUEUE_ARN:
        single = QUEUE_ARN.rsplit("/", 1)[-1]
    if not single:
        raise ValueError(
            "BATCH_JOB_QUEUE_NAMES, BATCH_JOB_QUEUE_NAME or BATCH_JOB_QUEUE_ARN "
            "is required"
        )
    return [single]


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Set every configured Batch job queue to DISABLED.

    A queue that cannot be found or disabled raises after the others were
    tried, so the notification is retried and the failure is visible.

    :param event: SNS or EventBridge budget notification payload.
    :param _context: Lambda context (unused).
    :returns: Summary of the queue updates.
    """
    _logger.info("budget_guard_event=%s", json.dumps(event))

    disabled = []
    failures = []
    for queue_name in _queue_names():
        try:
            describe = _batch.describe_job_queues(jobQueues=[queue_name])
            queues = describe.get("jobQueues") or []
            if not queues:
                raise LookupError(f"job queue not found: {queue_name}")
            queue_arn = queues[0]["jobQueueArn"]
            _batch.update_job_queue(jobQueue=queue_arn, state="DISABLED")
        except Exception as exc:  # noqa: BLE001 - try the rest, then fail loudly
            _logger.error("could not disable %s: %s", queue_name, exc)
            failures.append(exc)
            continue
        _logger.info("disabled_batch_queue=%s", queue_arn)
        disabled.append(queue_arn)
    if failures:
        raise failures[0]
    if len(disabled) == 1:
        return {"jobQueueArn": disabled[0], "state": "DISABLED"}
    return {"jobQueueArns": disabled, "state": "DISABLED"}
