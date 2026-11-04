"""Fallback gate: the only way the timer can reach the Batch queue.

The Step Functions timer calls this function when a job has waited long
enough for a local worker. Cloud compute may start only if every guard passes,
checked in this order, and the first failure ends the check:

1. the job's Account has cloud enabled;
2. Prospectus reserves quota for the job's maximum billable items;
3. the global spending ceiling has room (per attempt, day and month, and the
   one concurrent slot is free);
4. the kill switch is off (the Batch queue is enabled).

Then one conditional write decides that the cloud takes the job: it succeeds
only if the job is still waiting for the same attempt (pending, or holding a
claim that has expired), so a live claim always wins and a job that finished,
failed, was requeued or was deleted never reaches Batch. A success returns a
fresh fencing token that travels to the Batch job.

Any refusal, error, missing setting or unexpected answer starts no compute:
what was taken is given back, the job gets a visible waiting reason, and it
waits for a local worker.
"""

from __future__ import annotations

import logging
import os
import secrets
import time
import uuid
from decimal import Decimal
from typing import Any

import boto3
from babulus_spend_guards import (
    CeilingLimits,
    GuardRefusal,
    ProspectusQuota,
    QuotaConfig,
    SpendCeiling,
    valid_account_id,
)
from botocore.exceptions import ClientError

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)

_jobs = boto3.resource("dynamodb").Table(os.environ["JOBS_TABLE"])
_batch = boto3.client("batch")

DEFAULT_CLAIM_SECONDS = 900
# Never ask the timer to sleep longer than this between checks.
MAX_WAIT_SECONDS = 900
FALLBACK_OWNER = "batch:fallback"
QUOTA_ITEM_KIND = "aws.batch.vcpu_seconds"
# A hold must not reach past the shortest quota week (167 hours).
MAX_RESERVATION_SECONDS = 167 * 3600 - 1
RESERVATION_MARGIN_SECONDS = 900
SLOT_MARGIN_SECONDS = 1800
# The per-attempt gate lock outlives the gate's own Lambda timeout (30
# seconds in the stack), so a gate that crashed holding it cannot block the
# next one for long, and a live gate never loses it mid-run.
GATE_LOCK_SECONDS = 90
_QUOTA_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "babulus:quota-operations")


def _now() -> int:
    return int(time.time())


def operation_id(content_hash: str, job_token: str, attempt: int, step: str) -> str:
    """A client-generated UUID that is the same on every retry of one step."""
    seed = f"{content_hash}:{job_token}:{attempt}:{step}"
    return str(uuid.uuid5(_QUOTA_NAMESPACE, seed))


def _int_setting(name: str) -> int:
    try:
        value = int(os.environ.get(name, ""))
    except ValueError as exc:
        raise GuardRefusal("guards_not_configured") from exc
    if value <= 0:
        raise GuardRefusal("guards_not_configured")
    return value


class _Settings:
    """Everything the guards need from the deployment, or a refusal."""

    def __init__(self) -> None:
        self.quota = QuotaConfig.from_environment()
        self.limits = CeilingLimits.from_environment()
        self.ceiling_table = os.environ.get("SPEND_CEILING_TABLE", "")
        self.sites_table = os.environ.get("SITES_TABLE", "")
        self.queue = os.environ.get("BATCH_JOB_QUEUE_NAME", "")
        if (
            not self.ceiling_table
            or not self.sites_table
            or not self.queue
            or os.environ.get("BUDGET_GUARD_CONFIGURED") != "1"
        ):
            raise GuardRefusal("guards_not_configured")
        self.vcpus = _int_setting("JOB_VCPUS")
        self.timeout_seconds = _int_setting("ATTEMPT_TIMEOUT_SECONDS")
        self.retry_attempts = _int_setting("BATCH_RETRY_ATTEMPTS")
        self.max_cloud_attempts = _int_setting("MAX_CLOUD_ATTEMPTS")

    @property
    def max_vcpu_seconds(self) -> int:
        """The most one submission can run: every try up to its timeout."""
        return self.vcpus * self.timeout_seconds * self.retry_attempts

    @property
    def reservation_seconds(self) -> int:
        """How long Prospectus keeps the hold if nobody settles it."""
        return min(
            MAX_RESERVATION_SECONDS,
            self.timeout_seconds * self.retry_attempts + RESERVATION_MARGIN_SECONDS,
        )


def _quota_client(settings: _Settings) -> ProspectusQuota:
    return ProspectusQuota(settings.quota)


def _ceiling(settings: _Settings) -> SpendCeiling:
    table = boto3.resource("dynamodb").Table(settings.ceiling_table)
    return SpendCeiling(table, boto3.client("dynamodb"), settings.limits)


def _account_for(item: dict[str, Any], settings: _Settings) -> str:
    """Return the Account to charge, if its site has cloud turned on."""
    site_id = item.get("site_id")
    if not site_id:
        raise GuardRefusal("cloud_off")
    site = (
        boto3.resource("dynamodb")
        .Table(settings.sites_table)
        .get_item(Key={"site_id": site_id})
        .get("Item")
    )
    if not site or site.get("disabled") or site.get("cloud_enabled") is not True:
        raise GuardRefusal("cloud_off")
    return valid_account_id(site.get("account_id"))


def _kill_switch_off(settings: _Settings) -> None:
    try:
        queues = _batch.describe_job_queues(jobQueues=[settings.queue]).get("jobQueues")
    except Exception as exc:  # noqa: BLE001 - cannot tell: do not run
        raise GuardRefusal("kill_switch") from exc
    if not queues or queues[0].get("state") != "ENABLED":
        raise GuardRefusal("kill_switch")


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
    item = _jobs.get_item(Key={"content_hash": content_hash}, ConsistentRead=True).get(
        "Item"
    )
    waiting = _classify(item, job_token, now)
    if waiting:
        return waiting
    assert item is not None
    attempt = int(item.get("cloud_attempts") or 0) + 1
    # Two gates for one attempt derive the same reservation and lease IDs, so
    # only one may work on it at a time. A gate that cannot take the lock
    # takes nothing and releases nothing.
    lock_owner = secrets.token_urlsafe(12)
    if not _take_lock(content_hash, job_token, lock_owner, now):
        return {"decision": "wait", "wait_seconds": 5, "reason": "contended"}
    taken: dict[str, Any] = {}
    try:
        settings = _Settings()
        account = _account_for(item, settings)
        if attempt > settings.max_cloud_attempts:
            raise GuardRefusal("attempt_limit")
        quota = _quota_client(settings)
        reservation_id = quota.reserve(
            account,
            operation_id(content_hash, job_token, attempt, "reserve"),
            [{"itemKind": QUOTA_ITEM_KIND, "quantity": settings.max_vcpu_seconds}],
            settings.reservation_seconds,
        )
        taken["reservation"] = (quota, account, reservation_id)
        ceiling = _ceiling(settings)
        lease_id = operation_id(content_hash, job_token, attempt, "lease")
        ceiling.acquire(
            lease_id,
            settings.limits.estimate(settings.max_vcpu_seconds),
            now,
            settings.timeout_seconds * settings.retry_attempts + SLOT_MARGIN_SECONDS,
        )
        taken["lease"] = (ceiling, lease_id)
        _kill_switch_off(settings)
        claim_token = secrets.token_urlsafe(24)
        if not _claim(
            content_hash,
            job_token,
            claim_token,
            claim_seconds,
            now,
            attempt,
            account=account,
            reservation_id=reservation_id,
            lease_id=lease_id,
            lock_owner=lock_owner,
        ):
            _give_back(taken, content_hash)
            _release_lock(content_hash, lock_owner)
            return _explain_refusal(content_hash, job_token, now)
    except GuardRefusal as refusal:
        _give_back(taken, content_hash)
        _release_lock(content_hash, lock_owner)
        _record_waiting_reason(content_hash, job_token, refusal.reason)
        return {"decision": "stop", "reason": refusal.reason}
    except Exception:  # noqa: BLE001 - anything unexpected means no compute
        _logger.exception("fallback gate guard check failed for %s", content_hash)
        _give_back(taken, content_hash)
        _release_lock(content_hash, lock_owner)
        _record_waiting_reason(content_hash, job_token, "guards_unavailable")
        return {"decision": "stop", "reason": "guards_unavailable"}
    return {
        "decision": "submit",
        "claim_token": claim_token,
        "claim_deadline": now + claim_seconds,
        "quota_reservation_id": reservation_id,
    }


def _claim(
    content_hash: str,
    job_token: str,
    claim_token: str,
    claim_seconds: int,
    now: int,
    attempt: int,
    *,
    account: str,
    reservation_id: str,
    lease_id: str,
    lock_owner: str,
) -> bool:
    """The one conditional write that gives the job to the cloud.

    It also clears the gate lock, and only succeeds while this gate still
    holds it.
    """
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression=(
                "SET #status = :claimed, claim_owner = :owner, "
                "claimed_by = :owner, worker_type = :wtype, "
                "claimed_at = :now_iso, claimed_at_epoch = :now_epoch, "
                "claim_deadline = :deadline, claim_token = :token, "
                "updated_at = :now_iso, cloud_attempts = :attempt, "
                "quota_account = :account, quota_reservation_id = :reservation, "
                "quota_state = :reserved, ceiling_lease = :lease "
                "REMOVE waiting_reason, gate_lock_owner, gate_lock_expires "
                "ADD claim_generation :one"
            ),
            # The whole guarantee: same attempt, and either nobody has the
            # job or the holder's claim has expired.
            ConditionExpression=(
                "(attribute_not_exists(kind) OR kind = :speech) AND "
                "job_token = :job_token AND gate_lock_owner = :lock_owner AND "
                "(attribute_not_exists(cloud_attempts) OR "
                "cloud_attempts = :seen) AND "
                "(#status = :pending OR "
                "(#status = :claimed AND claim_deadline < :now_epoch))"
            ),
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":claimed": "claimed",
                ":pending": "pending",
                ":speech": "speech",
                ":job_token": job_token,
                ":owner": FALLBACK_OWNER,
                ":wtype": "batch",
                ":token": claim_token,
                ":deadline": Decimal(now + claim_seconds),
                ":now_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
                ":now_epoch": Decimal(now),
                ":one": 1,
                ":attempt": attempt,
                ":seen": attempt - 1,
                ":account": account,
                ":reservation": reservation_id,
                ":reserved": "reserved",
                ":lease": lease_id,
                ":lock_owner": lock_owner,
            },
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        return False
    return True


def _take_lock(content_hash: str, job_token: str, owner: str, now: int) -> bool:
    """Take the per-attempt gate lock with one conditional write.

    Succeeds only for the job's current attempt and only if nobody holds the
    lock or the holder's lock has expired.
    """
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression="SET gate_lock_owner = :owner, gate_lock_expires = :expires",
            ConditionExpression=(
                "job_token = :job_token AND "
                "(attribute_not_exists(gate_lock_expires) OR "
                "gate_lock_expires < :now)"
            ),
            ExpressionAttributeValues={
                ":owner": owner,
                ":expires": Decimal(now + GATE_LOCK_SECONDS),
                ":job_token": job_token,
                ":now": Decimal(now),
            },
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        return False
    return True


def _release_lock(content_hash: str, owner: str) -> None:
    """Clear the gate lock if this gate still holds it."""
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression="REMOVE gate_lock_owner, gate_lock_expires",
            ConditionExpression="gate_lock_owner = :owner",
            ExpressionAttributeValues={":owner": owner},
        )
    except ClientError:
        pass  # lost or gone; it expires on its own


def _give_back(taken: dict[str, Any], content_hash: str) -> None:
    """Return the reservation and the ceiling slot taken for a refused run.

    Skips anything the job record already holds: a repeated gate for the same
    attempt derives the same IDs and must not release the first one's hold.
    """
    if not taken:
        return
    held = (
        _jobs.get_item(Key={"content_hash": content_hash}, ConsistentRead=True).get(
            "Item"
        )
        or {}
    )
    if "reservation" in taken:
        quota, account, rid = taken["reservation"]
        if held.get("quota_reservation_id") != rid:
            try:
                quota.release(account, rid, release_operation_id(rid))
            except GuardRefusal:
                pass  # the hold expires on its own; nothing runs meanwhile
    if "lease" in taken:
        ceiling, lid = taken["lease"]
        if held.get("ceiling_lease") != lid:
            try:
                ceiling.finish(lid, ran=False)
            except Exception:  # noqa: BLE001 - the slot expires on its own
                pass


def release_operation_id(reservation_id: str) -> str:
    """The operation ID for releasing a reservation, the same on every retry."""
    return str(uuid.uuid5(_QUOTA_NAMESPACE, f"release:{reservation_id}"))


def _record_waiting_reason(content_hash: str, job_token: str, reason: str) -> None:
    """Tell whoever looks at the job why the cloud did not take it."""
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression="SET waiting_reason = :reason, updated_at = :now",
            ConditionExpression="job_token = :token AND #status = :pending",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":reason": reason,
                ":token": job_token,
                ":pending": "pending",
                ":now": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(_now())),
            },
        )
    except ClientError:
        pass  # the job moved on; the reason would be stale anyway


def _classify(
    item: dict[str, Any] | None, job_token: str, now: int
) -> dict[str, Any] | None:
    """Return the timer's answer if the job is not takeable, else ``None``."""
    if not item:
        return {"decision": "stop", "reason": "job_gone"}
    status = item.get("status")
    if status in ("done", "failed"):
        return {"decision": "stop", "reason": f"job_{status}"}
    kind = item.get("kind", "speech")
    if kind == "video":
        # No video image exists yet, so a video job waits for a local worker.
        return {"decision": "stop", "reason": "video_image_missing"}
    if kind != "speech":
        return {"decision": "stop", "reason": "local_worker_only"}
    if item.get("job_token") != job_token:
        return {"decision": "stop", "reason": "requeued"}
    if status == "claimed" and int(item.get("claim_deadline") or 0) >= now:
        remaining = int(item.get("claim_deadline") or 0) - now
        wait = max(1, min(remaining + 1, MAX_WAIT_SECONDS))
        return {"decision": "wait", "wait_seconds": wait, "reason": "live_claim"}
    if status in ("pending", "claimed"):
        return None
    return {"decision": "wait", "wait_seconds": 5, "reason": "contended"}


def _explain_refusal(content_hash: str, job_token: str, now: int) -> dict[str, Any]:
    """Say why the claim write was refused and what the timer should do next."""
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    return _classify(item, job_token, now) or {
        "decision": "wait",
        "wait_seconds": 5,
        "reason": "contended",
    }
