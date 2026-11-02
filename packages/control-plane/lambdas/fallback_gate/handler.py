"""Fallback gate: the only way the timer can reach the Batch queue.

The Step Functions timer calls this function when a job has waited long
enough for a local worker. It decides, with one conditional write, whether
the cloud may take the job. The write succeeds only if the job is still
waiting for the same attempt (pending, or holding a claim that has expired),
so a live claim always wins and a job that finished, failed, was requeued or
was deleted never reaches Batch. A success returns a fresh fencing token that
travels to the Batch job; every other outcome starts no compute.
"""

from __future__ import annotations

import os
import secrets
import time
from decimal import Decimal
from typing import Any

import boto3
from botocore.exceptions import ClientError

_jobs = boto3.resource("dynamodb").Table(os.environ["JOBS_TABLE"])

DEFAULT_CLAIM_SECONDS = 900
# Never ask the timer to sleep longer than this between checks.
MAX_WAIT_SECONDS = 900
FALLBACK_OWNER = "batch:fallback"


def _now() -> int:
    return int(time.time())


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Decide whether the fallback may start a Batch job for this timer.

    :param event: ``content_hash`` and ``job_token`` from the timer's input,
        and optionally ``claim_seconds`` for the reservation window.
    :returns: ``{"decision": "submit", "claim_token": ...}`` when the cloud
        holds the job, ``{"decision": "wait", "wait_seconds": n}`` when a live
        claim must be waited out, or ``{"decision": "stop", "reason": ...}``.
    """
    content_hash = str(event["content_hash"])
    job_token = str(event["job_token"])
    claim_seconds = int(event.get("claim_seconds") or DEFAULT_CLAIM_SECONDS)
    now = _now()
    claim_token = secrets.token_urlsafe(24)
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression=(
                "SET #status = :claimed, claim_owner = :owner, "
                "claimed_by = :owner, worker_type = :wtype, "
                "claimed_at = :now_iso, claimed_at_epoch = :now_epoch, "
                "claim_deadline = :deadline, claim_token = :token, "
                "updated_at = :now_iso ADD claim_generation :one"
            ),
            # The whole guarantee: same attempt, and either nobody has the
            # job or the holder's claim has expired.
            ConditionExpression=(
                "job_token = :job_token AND "
                "(#status = :pending OR "
                "(#status = :claimed AND claim_deadline < :now_epoch))"
            ),
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":claimed": "claimed",
                ":pending": "pending",
                ":job_token": job_token,
                ":owner": FALLBACK_OWNER,
                ":wtype": "batch",
                ":token": claim_token,
                ":deadline": Decimal(now + claim_seconds),
                ":now_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
                ":now_epoch": Decimal(now),
                ":one": 1,
            },
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        return _explain_refusal(content_hash, job_token, now)
    return {
        "decision": "submit",
        "claim_token": claim_token,
        "claim_deadline": now + claim_seconds,
    }


def _explain_refusal(content_hash: str, job_token: str, now: int) -> dict[str, Any]:
    """Say why the write was refused and what the timer should do next."""
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not item:
        return {"decision": "stop", "reason": "job_gone"}
    status = item.get("status")
    if status in ("done", "failed"):
        return {"decision": "stop", "reason": f"job_{status}"}
    if item.get("job_token") != job_token:
        return {"decision": "stop", "reason": "requeued"}
    if status == "claimed":
        remaining = int(item.get("claim_deadline") or 0) - now
        wait = max(1, min(remaining + 1, MAX_WAIT_SECONDS))
        return {"decision": "wait", "wait_seconds": wait, "reason": "live_claim"}
    return {"decision": "wait", "wait_seconds": 5, "reason": "contended"}
