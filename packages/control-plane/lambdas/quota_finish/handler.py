"""Finish a cloud run's quota: settle what ran, release what did not.

Two things call this function:

* The Batch "Job State Change" rule, when a cloud job ends. The reservation is
  settled from the items that really ran (vCPU seconds from the job's own
  start and stop times). If the job never started, nothing ran and the
  reservation is released.
* The fallback state machine, with ``{"action": "release", ...}``, when Batch
  refuses the submission, so nothing ran.

Either way the global ceiling's slot is freed, and the amount is given back
when nothing ran. Each Prospectus call carries an operation ID derived from
the reservation, so a repeated event repeats the same call. Products report
items, never money: nothing here writes an amount to a job record.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

import boto3
from babulus_spend_guards import (
    CeilingLimits,
    GuardRefusal,
    ProspectusQuota,
    QuotaConfig,
    SpendCeiling,
)

_jobs = boto3.resource("dynamodb").Table(os.environ["JOBS_TABLE"])

QUOTA_ITEM_KIND = "aws.batch.vcpu_seconds"
JOB_NAME_PREFIX = os.environ.get("BATCH_JOB_NAME_PREFIX", "auritus-")
_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "babulus:quota-operations")


def _quota_client() -> ProspectusQuota:
    return ProspectusQuota(QuotaConfig.from_environment())


def _operation_id(reservation_id: str, step: str) -> str:
    return str(uuid.uuid5(_NAMESPACE, f"{step}:{reservation_id}"))


def actual_vcpu_seconds(detail: dict[str, Any], vcpus: int) -> int:
    """Whole vCPU seconds that really ran, summed over every attempt."""
    spans = []
    for attempt in detail.get("attempts") or []:
        spans.append((attempt.get("startedAt"), attempt.get("stoppedAt")))
    if not spans:
        spans = [(detail.get("startedAt"), detail.get("stoppedAt"))]
    seconds = 0
    for started, stopped in spans:
        if started is not None and stopped is not None and stopped > started:
            seconds += -(-(int(stopped) - int(started)) // 1000)
    return seconds * vcpus


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Settle or release the reservation for a cloud job that has ended.

    :raises GuardRefusal: when Prospectus cannot be reached, so the async
        invocation is retried; the reservation expires by itself regardless.
    """
    if event.get("action") == "release":
        return _finish(
            str(event["content_hash"]),
            detail=None,
            claim_token=str(event.get("claim_token") or ""),
        )
    detail = event.get("detail") or {}
    if detail.get("status") not in ("SUCCEEDED", "FAILED"):
        return {"result": "ignored"}
    name = str(detail.get("jobName") or "")
    if not name.startswith(JOB_NAME_PREFIX):
        return {"result": "ignored"}
    return _finish(name.removeprefix(JOB_NAME_PREFIX), detail=detail)


def _finish(
    content_hash: str, detail: dict[str, Any] | None, claim_token: str | None = None
) -> dict[str, Any]:
    item = _jobs.get_item(Key={"content_hash": content_hash}, ConsistentRead=True).get(
        "Item"
    )
    if not item or item.get("quota_state") != "reserved":
        return {"result": "nothing_to_finish"}
    if claim_token is not None and item.get("claim_token") != claim_token:
        # Not the attempt the caller reserved for; leave it to its own finish.
        return {"result": "nothing_to_finish"}
    account = item["quota_account"]
    reservation_id = item["quota_reservation_id"]
    lease_id = item.get("ceiling_lease")
    quota = _quota_client()
    vcpus = int(os.environ.get("JOB_VCPUS") or 0)
    ran_seconds = actual_vcpu_seconds(detail, vcpus) if detail else 0
    if ran_seconds > 0:
        quota.settle(
            account,
            reservation_id,
            _operation_id(reservation_id, "settle"),
            [{"itemKind": QUOTA_ITEM_KIND, "quantity": ran_seconds}],
        )
        state = "settled"
    else:
        quota.release(account, reservation_id, _operation_id(reservation_id, "release"))
        state = "released"
    if lease_id:
        table = boto3.resource("dynamodb").Table(os.environ["SPEND_CEILING_TABLE"])
        SpendCeiling(
            table, boto3.client("dynamodb"), CeilingLimits.from_environment()
        ).finish(lease_id, ran=ran_seconds > 0)
    _jobs.update_item(
        Key={"content_hash": content_hash},
        UpdateExpression="SET quota_state = :state",
        ConditionExpression="quota_reservation_id = :reservation",
        ExpressionAttributeValues={":state": state, ":reservation": reservation_id},
    )
    return {"result": state}


__all__ = ["handler", "actual_vcpu_seconds", "GuardRefusal"]
