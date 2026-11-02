"""HTTP API router Lambda for Auritus job and site-key routes."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import boto3
from auritus_content_hash import content_hash as compute_content_hash
from auritus_content_hash import (
    VIDEO_OUTPUT_OPTIONS,
    normalize_text,
    resolve_voice_id,
)
from auritus_content_hash import video_content_hash as compute_video_hash
from auritus_operator_auth import (
    OperatorTokenError,
    bearer_token,
    verify_operator_token,
)
from botocore.exceptions import BotoCoreError, ClientError


class ConflictError(Exception):
    """Raised when an admin action is invalid for the job's current state."""


_dynamodb = boto3.resource("dynamodb")
_s3 = boto3.client("s3")
_sfn = boto3.client("stepfunctions")

JOBS_TABLE = os.environ["JOBS_TABLE"]
SITES_TABLE = os.environ["SITES_TABLE"]
AUDIO_BUCKET = os.environ["AUDIO_BUCKET"]
CLOUDFRONT_DOMAIN = os.environ.get("CLOUDFRONT_DOMAIN", "")
FALLBACK_STATE_MACHINE_ARN = os.environ.get("FALLBACK_STATE_MACHINE_ARN", "")
FALLBACK_SECONDS = int(os.environ.get("FALLBACK_SECONDS", "900"))
DAILY_SITE_QUOTA = int(os.environ.get("DAILY_SITE_QUOTA", "100"))
# A claim lasts this long unless its holder renews it. Workers renew while
# they work, so a long job never loses its claim; a worker that dies stops
# renewing and the claim lapses after one window.
CLAIM_WINDOW_SECONDS = FALLBACK_SECONDS
# No single claim or renewal may reach further ahead than this.
MAX_CLAIM_SECONDS = 3600
BATCH_JOB_QUEUE_NAME = os.environ.get("BATCH_JOB_QUEUE_NAME", "")
USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
SES_FROM_ADDRESS = os.environ.get("SES_FROM_ADDRESS", "")
ALERTS_TABLE = os.environ.get("ALERTS_TABLE", "")
GPU_HOURLY_RATE_USD = os.environ.get("GPU_HOURLY_RATE_USD", "0.526")
PLATFORM_COST_PER_JOB_USD = os.environ.get("PLATFORM_COST_PER_JOB_USD", "0.0005")
RATE_CARD_VERSION = os.environ.get("RATE_CARD_VERSION", "v1")
COST_ROLLUPS_TABLE = os.environ.get("COST_ROLLUPS_TABLE", "")
COST_ROLLUPS_DATE_INDEX = os.environ.get(
    "COST_ROLLUPS_DATE_INDEX", "date-site_id-index"
)
BACKEND_TIMING_TABLE = os.environ.get("BACKEND_TIMING_TABLE", "")
# Retention window for completed/failed job records and the audio they
# reference, in days. 0 (the default) means retention is disabled -- no
# ``ttl`` attribute is ever written, so no job record or clip ever expires.
# See DEFAULT_RETENTION_DAYS in cdk/stacks/backend.py for why this defaults
# off rather than on.
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "0"))
# Bounds the number of per-day Query calls _get_admin_costs' "all sites"
# path (no site_id filter) will issue for one request -- see that
# function's docstring for why that path queries once per calendar day
# rather than scanning the rollup table.
COST_QUERY_MAX_DAYS = 366
# Default lookback window when /admin/costs is called with no "from"/"to"
# -- matches the "what did last month cost" framing this story exists for
# without forcing every dashboard load to specify an explicit range.
DEFAULT_COST_RANGE_DAYS = 31

# Job kinds. A job with no ``kind`` is a speech job.
JOB_KINDS = ("speech", "video")
# Execution-only render options: accepted, but not part of a video job's
# identity (see ``auritus_content_hash.VIDEO_OUTPUT_OPTIONS``).
VIDEO_EXECUTION_OPTIONS = ("workers", "framePattern")
# A video job's script and timeline travel inside its record; larger inputs
# are refused rather than truncated.
MAX_VIDEO_INPUT_BYTES = 300_000
# Why a job is waiting, shown to whoever looks at it.
WAITING_REASONS = {
    "waiting_for_local_worker": (
        "Waiting for a local worker. Cloud rendering is not enabled for video "
        "jobs, so this job runs when a worker started with `babulus worker` "
        "claims it."
    ),
}
VIDEO_WAITING_REASON = "waiting_for_local_worker"
SHA256_HEX = re.compile(r"^[0-9a-f]{64}$")
# A voice is named in lower case, as the speech package looks it up.
VOICE_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
VOICE_FILE = re.compile(r"^[a-z0-9][a-z0-9_-]*\.(wav|mp3|flac|ogg|m4a|txt)$")
VOICE_AUDIO_SUFFIXES = (".wav", ".mp3", ".flac", ".ogg", ".m4a")
MAX_VOICE_MANIFEST_BYTES = 65536

# The complete set of job lifecycle statuses, as also enumerated in
# _get_admin_overview's counts dict. Shared here so the unfiltered admin
# jobs listing queries the same statuses the overview reports on.
JOB_STATUSES = ("pending", "claimed", "done", "failed")

_jobs = _dynamodb.Table(JOBS_TABLE)
_sites = _dynamodb.Table(SITES_TABLE)
_alerts = _dynamodb.Table(ALERTS_TABLE) if ALERTS_TABLE else None
_cost_rollups = _dynamodb.Table(COST_ROLLUPS_TABLE) if COST_ROLLUPS_TABLE else None
_backend_timing = (
    _dynamodb.Table(BACKEND_TIMING_TABLE) if BACKEND_TIMING_TABLE else None
)
_cognito = boto3.client("cognito-idp")
_ses = boto3.client("ses")
_batch = boto3.client("batch")


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Route API Gateway HTTP API v2 events to handlers.

    :param event: API Gateway proxy event.
    :param _context: Lambda context (unused).
    :returns: API Gateway proxy response.
    """
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path = event.get("rawPath", "")
    path_params = event.get("pathParameters") or {}
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    body_raw = event.get("body") or ""
    body = json.loads(body_raw) if body_raw else {}

    try:
        if method == "POST" and path == "/jobs":
            return _create_job(body, headers)
        if (
            method == "POST"
            and path.startswith("/voices/")
            and path.endswith("/publish")
        ):
            voice_id = path_params.get("voice_id") or path.split("/")[2]
            return _publish_voice(voice_id, body, headers)
        if path.startswith("/store/"):
            sha256 = path_params.get("sha256") or path.split("/")[2]
            if method == "POST" and path.endswith("/presign-upload"):
                return _store_presign_upload(sha256, headers)
            if method == "GET" and path.count("/") == 2:
                return _store_presign_download(sha256, headers)
        if method == "GET" and path.endswith("/input") and path.startswith("/jobs/"):
            content_hash = path_params.get("hash") or path.split("/")[2]
            return _get_job_input(content_hash, headers)
        if method == "GET" and path.startswith("/jobs/") and path != "/jobs/claimable":
            content_hash = path_params.get("hash") or path.removeprefix("/jobs/")
            return _get_job(content_hash, headers)
        if method == "POST" and path.endswith("/redeem"):
            content_hash = path_params.get("hash") or ""
            return _redeem_token(content_hash, body, headers)
        if method == "GET" and path == "/jobs/claimable":
            return _list_claimable(headers)
        if method == "PUT" and path.endswith("/claim"):
            content_hash = path_params.get("hash") or ""
            return _claim_job(content_hash, body, headers)
        if method == "PUT" and path.endswith("/done"):
            content_hash = path_params.get("hash") or ""
            return _mark_done(content_hash, body, headers)
        if method == "PUT" and path.endswith("/failed"):
            content_hash = path_params.get("hash") or ""
            return _mark_failed(content_hash, body, headers)
        if method == "POST" and path.endswith("/presign-upload"):
            content_hash = path_params.get("hash") or ""
            return _presign_upload(content_hash, body, headers)
        if method == "POST" and path == "/alerts/session":
            return _alert_session(body)
        if method == "POST" and path == "/sites":
            return _create_site(body, headers)
        if method == "GET" and path == "/sites":
            return _list_sites(headers)
        if method == "DELETE" and path.startswith("/sites/"):
            site_id = path_params.get("id") or path.removeprefix("/sites/")
            return _delete_site(site_id, headers)
        if method == "GET" and path == "/admin/overview":
            return _get_admin_overview(headers)
        if method == "GET" and path == "/admin/costs":
            query_params = event.get("queryStringParameters") or {}
            return _get_admin_costs(headers, query_params)
        if method == "GET" and path == "/admin/jobs":
            query_params = event.get("queryStringParameters") or {}
            return _list_admin_jobs(headers, query_params)
        if method == "GET" and path.startswith("/admin/jobs/"):
            content_hash = path_params.get("hash") or path.removeprefix("/admin/jobs/")
            return _get_admin_job(content_hash, headers)
        if method == "DELETE" and path.startswith("/admin/jobs/"):
            content_hash = path_params.get("hash") or path.removeprefix("/admin/jobs/")
            return _delete_admin_job(content_hash, headers)
        if method == "POST" and path.endswith("/regenerate"):
            content_hash = path_params.get("hash") or path.removesuffix(
                "/regenerate"
            ).removeprefix("/admin/jobs/")
            return _regenerate_admin_job(content_hash, headers)
        if method == "POST" and path.endswith("/retry"):
            content_hash = path_params.get("hash") or path.removesuffix(
                "/retry"
            ).removeprefix("/admin/jobs/")
            return _retry_admin_job(content_hash, body, headers)
        if method == "POST" and path == "/admin/queue/toggle":
            return _toggle_admin_queue(body, headers)
        if method == "POST" and path == "/admin/jobs/bulk-delete":
            return _bulk_delete_admin_jobs(body, headers)
        return _response(404, {"error": "not_found"})
    except PermissionError as exc:
        return _response(403, {"error": str(exc)})
    except ValueError as exc:
        return _response(400, {"error": str(exc)})
    except ConflictError as exc:
        return _response(409, {"error": str(exc)})
    except LookupError as exc:
        return _response(404, {"error": str(exc)})


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _response(status: int, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload, default=_json_default),
    }


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"not serializable: {type(value)}")


def _require_operator(headers: dict[str, str]) -> None:
    """Require a verified Cognito operator access token on the request.

    Verified here as well as in the API authorizer because the job-mutation
    routes carry no authorizer (Batch workers present a job token instead).

    :param headers: Lower-cased request headers.
    :raises PermissionError: If the bearer token is not a valid operator
        access token.
    """
    try:
        verify_operator_token(bearer_token(headers))
    except OperatorTokenError as exc:
        raise PermissionError("operator_auth_required") from exc


def _check_job_token(headers: dict[str, str], content_hash: str) -> bool:
    """Return whether the request has the token belonging to a job.

    Checks both the ``X-Auritus-Job-Token`` header and the ``Authorization:
    Bearer <token>`` header for the job token.
    """
    token = headers.get("x-auritus-job-token", "") or bearer_token(headers)
    if not token:
        return False
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    return _job_token_matches(item, token)


def _job_token_matches(item: dict[str, Any] | None, token: str) -> bool:
    """Compare a presented job token to a job's stored token in constant time.

    :param item: The job record, or ``None`` when the job does not exist.
    :param token: The token the caller presented.
    :returns: Whether the job exists, has a token, and the tokens match.
    """
    stored_token = str((item or {}).get("job_token") or "")
    return bool(stored_token) and hmac.compare_digest(
        stored_token.encode("utf-8"), str(token).encode("utf-8")
    )


def _site_from_headers(headers: dict[str, str]) -> dict[str, Any]:
    site_key = headers.get("x-auritus-site-key", "").strip()
    if not site_key:
        raise PermissionError("site_key_required")
    result = _sites.query(
        IndexName="site_key-index",
        KeyConditionExpression="site_key = :sk",
        ExpressionAttributeValues={":sk": site_key},
        Limit=1,
    )
    items = result.get("Items") or []
    if not items:
        raise PermissionError("invalid_site_key")
    site = items[0]
    if site.get("disabled"):
        raise PermissionError("site_disabled")
    return site


def _reserve_quota(site: dict[str, Any]) -> None:
    """Count one job against a site's daily quota, atomically, before it exists.

    The increment itself enforces the limit (``daily_usage < quota``), so
    concurrent creates cannot exceed it. The counter belongs to a UTC day: the
    first reservation of a later day starts it again at one. The reset only
    applies when the stored day is strictly earlier, so a worker with a slow
    clock cannot reset a day that has already moved on.

    :param site: The site record.
    :raises PermissionError: ``daily_quota_exceeded`` when the day is full.
    """
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    quota = int(site.get("daily_quota") or DAILY_SITE_QUOTA)
    if quota < 1:
        raise PermissionError("daily_quota_exceeded")
    key = {"site_id": site["site_id"]}
    for _ in range(3):
        try:
            _sites.update_item(
                Key=key,
                UpdateExpression="ADD daily_usage :one",
                ConditionExpression=(
                    "attribute_exists(site_id) AND usage_day = :day "
                    "AND daily_usage < :quota"
                ),
                ExpressionAttributeValues={":day": day, ":one": 1, ":quota": quota},
            )
            return
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise
        try:
            _sites.update_item(
                Key=key,
                UpdateExpression="SET usage_day = :day, daily_usage = :one",
                ConditionExpression=(
                    "attribute_exists(site_id) AND "
                    "(attribute_not_exists(usage_day) OR usage_day < :day)"
                ),
                ExpressionAttributeValues={":day": day, ":one": 1},
            )
            return
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise
            current = _sites.get_item(Key=key, ConsistentRead=True).get("Item")
            if (
                current
                and current.get("usage_day") == day
                and int(current.get("daily_usage") or 0) >= quota
            ):
                raise PermissionError("daily_quota_exceeded") from exc
    raise PermissionError("daily_quota_exceeded")


def _release_quota(site_id: str) -> None:
    """Give back a reservation for a job that was not created."""
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        _sites.update_item(
            Key={"site_id": site_id},
            UpdateExpression="ADD daily_usage :minus",
            ConditionExpression="usage_day = :day AND daily_usage > :zero",
            ExpressionAttributeValues={":day": day, ":minus": -1, ":zero": 0},
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise


def _record_rollup_contribution(
    content_hash: str,
    flag_attr: str,
    rollup_key: dict[str, Any],
    add_expression: str,
    add_values: dict[str, Any],
) -> bool:
    """Idempotently apply one job's cost contribution to its daily rollup.

    A single job's cost can reach the rollup from more than one caller
    (this router's own completion routes, plus batch_telemetry's
    independent, at-least-once-delivered write for the same job). Blindly
    running ``ADD`` against the rollup row every time a caller runs would
    double-count real money on any retry or redelivery.

    The fix: before touching the rollup table at all, this claims a flag
    (``flag_attr``) on the JOB record itself via a conditional
    ``UpdateItem`` that only succeeds if the flag is not already set.
    DynamoDB's single-item conditional writes are strongly consistent and
    atomic, so for a given job and a given ``flag_attr``, exactly one
    caller -- ever, across any number of concurrent or retried
    invocations -- can win that write. Only the winner proceeds to apply
    the ``ADD`` to the rollup table; every other (or later, retried)
    caller sees ``ConditionalCheckFailedException`` and returns having
    changed nothing.

    The two steps are deliberately ordered flag-first, rollup-second: if a
    crash happens between them, the job is left flagged as rolled up but
    the rollup total is short by that one contribution. That is
    under-counting, not double-counting -- the safer failure direction for
    a cost ledger, and one a reconciliation pass can in principle detect
    and repair, unlike a double-counted total which looks indistinguishable
    from a correct one.

    :param content_hash: The job whose contribution is being recorded.
    :param flag_attr: Name of the boolean flag attribute on the job record
        that guards this specific contribution (callers use distinct flags
        for distinct contributions, e.g. the flat platform allowance vs.
        Batch GPU cost, so one does not block the other).
    :param rollup_key: The rollup table's key, e.g. ``{"site_id": ...,
        "date": ...}``.
    :param add_expression: A DynamoDB ``UpdateExpression`` starting with
        ``ADD`` for the rollup table.
    :param add_values: ``ExpressionAttributeValues`` for ``add_expression``.
    :returns: True if this call actually applied the contribution, False
        if it was a no-op because an earlier call already had.
    """
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression=f"SET {flag_attr} = :true_val",
            ConditionExpression=f"attribute_not_exists({flag_attr})",
            ExpressionAttributeValues={":true_val": True},
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return False
        raise

    _cost_rollups.update_item(
        Key=rollup_key,
        UpdateExpression=add_expression,
        ExpressionAttributeValues=add_values,
    )
    return True


def _compute_avoided_cost(
    *, tts_backend: str | None, local_duration_seconds: int
) -> tuple[Decimal, str]:
    """Compute a local job's counterfactual "avoided cost".

    Auritus exists so a publisher can run synthesis on their own GPU and
    pay AWS nothing for it. This estimates what that same synthesis would
    have cost had the Batch fallback won the race instead of the local
    worker.

    The naive approach -- multiply this job's own local wall-clock
    ``duration_seconds`` by the GPU hourly rate -- measures "what this would
    cost if Batch were exactly as fast as my machine", not "what Batch
    would actually charge". The operator's hardware may be faster or slower
    than the ``g4dn.xlarge`` Batch uses, so that figure is only weakly
    defensible.

    A better basis: the running AVERAGE of real, observed Batch
    ``billed_seconds`` for the same ``tts_backend``, maintained by
    ``batch_telemetry``'s ``_roll_up_backend_timing`` in
    ``AuritusBackendTiming``. This is deliberately an average, not a true
    median -- see that function's docstring for the trade-off -- but it is
    still a far more defensible "typical Batch cost for this backend" than
    one local machine's own timing.

    Fallback: when there is no observed Batch sample yet for this backend
    (``batch_sample_count`` is zero or the row doesn't exist), fall back to
    this job's own local ``duration_seconds`` -- the simpler, less
    defensible counterfactual -- rather than reporting no avoided cost at
    all. Which basis was used is returned alongside the figure so it's
    always auditable, not opaque.

    :param tts_backend: The job's TTS backend, or ``None`` if unknown (goes
        straight to the local-duration fallback, since there's no backend
        row to look up).
    :param local_duration_seconds: The job's own local wall-clock duration,
        used verbatim as the fallback basis.
    :returns: ``(avoided_cost_usd, basis)`` where ``basis`` is
        ``"batch_average"`` or ``"local_duration_fallback"``.
    """
    avg_billed_seconds: Decimal | None = None
    if tts_backend and _backend_timing is not None:
        row = _backend_timing.get_item(Key={"tts_backend": tts_backend}).get("Item")
        if row:
            sample_count = row.get("batch_sample_count") or 0
            if sample_count > 0:
                avg_billed_seconds = (
                    row.get("batch_billed_seconds_sum") or Decimal(0)
                ) / Decimal(sample_count)

    if avg_billed_seconds is not None:
        basis = "batch_average"
        basis_seconds = avg_billed_seconds
    else:
        basis = "local_duration_fallback"
        basis_seconds = Decimal(local_duration_seconds)

    avoided_cost_usd = basis_seconds * Decimal(GPU_HOURLY_RATE_USD) / Decimal(3600)
    return avoided_cost_usd, basis


def _roll_up_request_path_cost(
    content_hash: str,
    *,
    site_id: str | None,
    worker_type: str | None,
    date: str,
    platform_cost: Decimal,
    local_duration_seconds: int | None,
    avoided_cost: Decimal | None = None,
) -> None:
    """Roll up the flat platform allowance charged on every job completion.

    Called from both ``_mark_done`` and ``_mark_failed`` -- every job that
    finishes via this router (success or failure, local or Batch) is
    charged the same flat platform allowance, so this always contributes
    ``platform_cost_usd``. Batch GPU cost is NOT rolled up here: it isn't
    known on the request path at all (see the cost-accounting comment on
    ``_mark_done``), and is rolled up separately by batch_telemetry.

    ``batch_job_count`` is likewise NOT incremented here for Batch jobs,
    even though this path does run for them. batch_telemetry is the
    authoritative counter for Batch jobs (see its module docstring and
    ``_roll_up_gpu_cost`` there) -- incrementing here too would double
    count. The trade-off, stated plainly: if a Batch job completes via
    this router but batch_telemetry's EventBridge event never arrives or
    never correlates (e.g. the job never actually reached Batch), that job
    contributes its platform cost to the rollup but never increments
    ``batch_job_count``. That is an accepted, documented gap rather than a
    silent double-count.

    ``avoided_cost_usd`` rides along on this SAME contribution and the SAME
    ``platform_cost_rolled_up`` flag, rather than a new flag of its own.
    Both figures are written to the job record by the same caller
    (``_mark_done``, unconditionally, in the same update) at the same point
    in the request path -- there is no independent retry/redelivery source
    for avoided cost the way batch_telemetry is an independent source for
    GPU cost. Since the two figures are always known and finalized
    together, gating them behind one flag is correct: whichever call wins
    the flag claims both contributions atomically, and a retry that loses
    the flag skips both, exactly as it already skips ``platform_cost_usd``
    and ``local_job_count``. Introducing a third flag here would add
    complexity without buying any additional safety, since nothing can
    contribute ``avoided_cost_usd`` independently of this same call.

    :param content_hash: The job whose contribution is being recorded.
    :param site_id: The job's site, or ``None`` if unknown (skips the
        rollup entirely -- there is no key to roll up under).
    :param worker_type: ``"local"`` or ``"batch"``, or ``None``.
    :param date: The rollup date (``YYYY-MM-DD``), derived from the same
        completion timestamp already used for the job record.
    :param platform_cost: The flat platform allowance charged.
    :param local_duration_seconds: ``duration_seconds`` for a local job
        (``_mark_done`` only), or ``None`` when not applicable.
    :param avoided_cost: ``avoided_cost_usd`` for this job (``_mark_done``
        only -- zero for Batch jobs, a computed figure for local jobs), or
        ``None`` when not applicable (e.g. ``_mark_failed``, which does not
        set ``avoided_cost_usd`` at all).
    """
    if not site_id or _cost_rollups is None:
        return

    add_parts = ["platform_cost_usd :platform_cost"]
    add_values: dict[str, Any] = {":platform_cost": platform_cost}
    if worker_type == "local":
        add_parts.append("local_job_count :one")
        add_values[":one"] = 1
        if local_duration_seconds is not None:
            add_parts.append("local_duration_seconds :duration")
            add_values[":duration"] = Decimal(local_duration_seconds)
    if avoided_cost is not None:
        add_parts.append("avoided_cost_usd :avoided_cost")
        add_values[":avoided_cost"] = avoided_cost

    _record_rollup_contribution(
        content_hash,
        "platform_cost_rolled_up",
        {"site_id": site_id, "date": date},
        "ADD " + ", ".join(add_parts),
        add_values,
    )


def _arm_fallback(
    content_hash: str, job_token: str, tts_backend: str, kind: str = "speech"
) -> None:
    """Start the Step Functions fallback timer for a job, once per job token.

    The execution name is derived from the job token, so arming the same
    job twice (a retried request, a repeated event) is refused by Step
    Functions instead of starting a second timer. Requeueing a job issues a
    new token and therefore a new timer.

    :param content_hash: The content hash identifying the job.
    :param job_token: The job's current single-use token.
    :param tts_backend: The TTS backend the job will use.
    :param kind: The job kind. Only speech jobs have a cloud fallback; a video
        job waits for a local worker and never gets a timer.
    """
    if not FALLBACK_STATE_MACHINE_ARN or kind != "speech":
        return
    baseline_epoch = int(time.time())
    token_digest = hashlib.sha256(job_token.encode("utf-8")).hexdigest()[:16]
    try:
        _sfn.start_execution(
            stateMachineArn=FALLBACK_STATE_MACHINE_ARN,
            name=f"auritus-{content_hash[:16]}-{token_digest}",
            input=json.dumps(
                {
                    "content_hash": content_hash,
                    "job_token": job_token,
                    "tts_backend": tts_backend,
                    "baseline_epoch": baseline_epoch,
                    "fallback_seconds": FALLBACK_SECONDS,
                }
            ),
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ExecutionAlreadyExists":
            raise


def _create_job(body: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    kind = body.get("kind") or "speech"
    if kind not in JOB_KINDS:
        raise ValueError("unsupported_kind")
    if kind == "video":
        return _create_video_job(body, headers)
    site = _site_from_headers(headers)

    text = body.get("text") or ""
    tts_backend = body.get("tts_backend") or "kokoro"
    voice_id = resolve_voice_id(body.get("voice_id"), tts_backend)
    name = body.get("name") or ""
    byline = body.get("byline") or ""
    normalized = normalize_text(text)
    if not normalized:
        raise ValueError("text_required")

    content_hash = compute_content_hash(text, body.get("voice_id"), tts_backend)
    claimed_hash = body.get("content_hash")
    if claimed_hash and claimed_hash != content_hash:
        raise ValueError("content_hash_mismatch")
    now = _utc_now_iso()
    job_token = secrets.token_urlsafe(32)

    item = {
        "content_hash": content_hash,
        "kind": "speech",
        "status": "pending",
        "tts_backend": tts_backend,
        "voice_id": voice_id,
        "text": normalized,
        "name": name,
        "byline": byline,
        "site_key": site["site_key"],
        "site_id": site["site_id"],
        "job_token": job_token,
        "created_at": now,
        "updated_at": now,
    }
    voice_manifest = _published_voice_manifest(voice_id, tts_backend)
    if voice_manifest:
        item["voice_manifest"] = voice_manifest

    def already_there() -> dict[str, Any] | None:
        existing = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
        if not existing:
            return None
        return _response(
            200,
            {
                "content_hash": content_hash,
                "status": existing.get("status"),
                "existing": True,
            },
        )

    # An identical job costs no quota.
    duplicate = already_there()
    if duplicate:
        return duplicate

    # The quota is taken first and enforced by the increment itself. A job is
    # only written after its reservation, so a failure here leaves no job.
    _reserve_quota(site)
    try:
        _jobs.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(content_hash)",
        )
    except ClientError as exc:
        _release_quota(site["site_id"])
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        duplicate = already_there()
        if duplicate:
            return duplicate
        raise
    except Exception:
        _release_quota(site["site_id"])
        raise

    try:
        _arm_fallback(content_hash, job_token, tts_backend)
    except Exception:
        # A job with no timer could wait for the cloud forever. Take it back
        # (only while it is still ours) so the caller retries the whole create.
        _jobs.delete_item(
            Key={"content_hash": content_hash},
            ConditionExpression="job_token = :token",
            ExpressionAttributeValues={":token": job_token},
        )
        _release_quota(site["site_id"])
        raise

    return _response(
        201,
        {"content_hash": content_hash, "status": "pending"},
    )


def _waiting_message(item: dict[str, Any]) -> str | None:
    """Return the human-readable reason a job is waiting, if it has one."""
    reason = item.get("waiting_reason")
    return WAITING_REASONS.get(reason) if reason else None


def _validated_video_input(
    body: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any] | None, str | None, dict[str, Any]]:
    """Validate a video job's script, timeline, audio reference and options.

    :raises ValueError: With a stable error code for anything unusable.
    """
    script = body.get("script")
    if not isinstance(script, dict) or not script:
        raise ValueError("script_required")
    timeline = body.get("timeline")
    if timeline is not None and not isinstance(timeline, dict):
        raise ValueError("timeline_must_be_an_object")
    audio_sha256 = body.get("audio_sha256")
    if audio_sha256 is not None and not (
        isinstance(audio_sha256, str) and SHA256_HEX.match(audio_sha256)
    ):
        raise ValueError("audio_sha256_invalid")
    options = body.get("options") or {}
    if not isinstance(options, dict):
        raise ValueError("options_must_be_an_object")
    allowed = set(VIDEO_OUTPUT_OPTIONS) | set(VIDEO_EXECUTION_OPTIONS)
    unknown = sorted(set(options) - allowed)
    if unknown:
        raise ValueError(f"unsupported_option:{unknown[0]}")
    size = len(json.dumps([script, timeline, options]).encode("utf-8"))
    if size > MAX_VIDEO_INPUT_BYTES:
        raise ValueError("video_input_too_large")
    return script, timeline, audio_sha256, options


def _store_object_exists(sha256: str) -> bool:
    try:
        _s3.head_object(Bucket=AUDIO_BUCKET, Key=f"store/{sha256}")
    except ClientError as exc:
        if exc.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
            return False
        raise
    return True


def _voice_pointer_key(voice_id: str) -> str:
    return f"voices/{voice_id}.json"


def _published_voice_manifest(voice_id: str | None, backend: str) -> str | None:
    """Return the manifest SHA-256 published for a named voice, if any.

    Only voices a cloning backend would read are looked up; the default
    voice has no recording to publish.
    """
    clean = (voice_id or "").strip().lower()
    if not clean or clean == "default" or not VOICE_ID.match(clean):
        return None
    try:
        pointer = _s3.get_object(Bucket=AUDIO_BUCKET, Key=_voice_pointer_key(clean))
    except ClientError as exc:
        if exc.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise
    return json.loads(pointer["Body"].read()).get("manifest_sha256")


def _publish_voice(
    voice_id: str, body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    """Make a cloned voice available to every worker, Batch included.

    The voice's recording and transcript, and a manifest naming them by
    SHA-256, are uploaded to the content store first. Publishing is the last
    step and the only one that makes the voice visible: it checks that the
    manifest is exactly the object its SHA-256 says, that it describes this
    voice, and that every file it lists is in the store, and only then writes
    the pointer jobs look up. Anything missing is refused by name, so a voice
    is never half published.
    """
    _require_operator(headers)
    clean = voice_id.strip().lower()
    if not VOICE_ID.match(clean):
        raise ValueError("voice_id_invalid")
    manifest_sha = body.get("manifest_sha256")
    if not isinstance(manifest_sha, str) or not SHA256_HEX.match(manifest_sha):
        raise ValueError("manifest_sha256_invalid")
    try:
        raw = _s3.get_object(Bucket=AUDIO_BUCKET, Key=f"store/{manifest_sha}")[
            "Body"
        ].read(MAX_VOICE_MANIFEST_BYTES + 1)
    except ClientError as exc:
        if exc.response["Error"]["Code"] in ("NoSuchKey", "404"):
            raise ValueError("voice_manifest_not_uploaded") from exc
        raise
    if len(raw) > MAX_VOICE_MANIFEST_BYTES or (
        hashlib.sha256(raw).hexdigest() != manifest_sha
    ):
        raise ValueError("voice_manifest_hash_mismatch")
    try:
        manifest = json.loads(raw)
        files = manifest["files"]
        named = manifest["voice_id"]
    except (ValueError, KeyError, TypeError) as exc:
        raise ValueError("voice_manifest_invalid") from exc
    if named != clean or not isinstance(files, dict):
        raise ValueError("voice_manifest_invalid")
    if not any(name.endswith(VOICE_AUDIO_SUFFIXES) for name in files):
        raise ValueError("voice_manifest_has_no_recording")
    for name, sha in sorted(files.items()):
        if not VOICE_FILE.match(name) or not name.startswith(clean):
            raise ValueError("voice_manifest_invalid")
        if not isinstance(sha, str) or not SHA256_HEX.match(sha):
            raise ValueError("voice_manifest_invalid")
        if not _store_object_exists(sha):
            raise ValueError(f"voice_file_not_uploaded:{name}")
    _s3.put_object(
        Bucket=AUDIO_BUCKET,
        Key=_voice_pointer_key(clean),
        Body=json.dumps(
            {"manifest_sha256": manifest_sha, "published_at": _utc_now_iso()}
        ).encode("utf-8"),
        ContentType="application/json",
    )
    return _response(
        200,
        {"voice_id": clean, "manifest_sha256": manifest_sha, "files": sorted(files)},
    )


def _voice_files_for(item: dict[str, Any]) -> list[dict[str, str]]:
    """Return download URLs for the files of a job's published voice."""
    manifest_sha = item.get("voice_manifest") or _published_voice_manifest(
        item.get("voice_id"), item.get("tts_backend", "kokoro")
    )
    if not manifest_sha:
        return []
    manifest = json.loads(
        _s3.get_object(Bucket=AUDIO_BUCKET, Key=f"store/{manifest_sha}")["Body"].read()
    )
    return [
        {
            "name": name,
            "sha256": sha,
            "url": _s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": AUDIO_BUCKET, "Key": f"store/{sha}"},
                ExpiresIn=900,
            ),
        }
        for name, sha in sorted(manifest["files"].items())
    ]


def _create_video_job(body: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    """Create a video render job, or return the identical job already stored.

    Video jobs are created by an operator, cost the cloud nothing, need no
    quota, and get no fallback timer: they wait, with a visible reason, until
    a local worker claims them. The content hash covers the script, timeline,
    narration audio and output-affecting options, so equal inputs share one
    job; creation is a conditional write.
    """
    _require_operator(headers)
    script, timeline, audio_sha256, options = _validated_video_input(body)
    if audio_sha256 and not _store_object_exists(audio_sha256):
        # The audio must be in the store before a job may refer to it.
        raise ValueError("audio_not_uploaded")
    content_hash = compute_video_hash(script, timeline, audio_sha256, options)
    claimed_hash = body.get("content_hash")
    if claimed_hash and claimed_hash != content_hash:
        raise ValueError("content_hash_mismatch")
    now = _utc_now_iso()
    item = {
        "content_hash": content_hash,
        "kind": "video",
        "status": "pending",
        "name": body.get("name") or "",
        "video_input": json.dumps(
            {"script": script, "timeline": timeline, "options": options},
            separators=(",", ":"),
        ),
        "waiting_reason": VIDEO_WAITING_REASON,
        "created_at": now,
        "updated_at": now,
    }
    if audio_sha256:
        item["audio_sha256"] = audio_sha256
    try:
        _jobs.put_item(
            Item=item, ConditionExpression="attribute_not_exists(content_hash)"
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        existing = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
        if existing:
            return _response(
                200,
                {
                    "content_hash": content_hash,
                    "kind": "video",
                    "status": existing.get("status"),
                    "existing": True,
                },
            )
        raise
    return _response(
        201,
        {
            "content_hash": content_hash,
            "kind": "video",
            "status": "pending",
            "waiting_reason": VIDEO_WAITING_REASON,
            "waiting_message": WAITING_REASONS[VIDEO_WAITING_REASON],
        },
    )


def _store_presign_upload(sha256: str, headers: dict[str, str]) -> dict[str, Any]:
    """Give an operator a URL to upload one object to the content store.

    Objects live at ``store/<sha256>`` and are immutable: an object that
    already exists is reported, not offered for upload again. Readers verify
    the SHA-256 of what they download.
    """
    _require_operator(headers)
    if not SHA256_HEX.match(sha256):
        raise ValueError("sha256_invalid")
    if _store_object_exists(sha256):
        return _response(200, {"sha256": sha256, "exists": True})
    upload_url = _s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": AUDIO_BUCKET, "Key": f"store/{sha256}"},
        ExpiresIn=900,
        HttpMethod="PUT",
    )
    return _response(200, {"sha256": sha256, "exists": False, "upload_url": upload_url})


def _store_presign_download(sha256: str, headers: dict[str, str]) -> dict[str, Any]:
    """Give an operator a URL to download one object from the content store."""
    _require_operator(headers)
    if not SHA256_HEX.match(sha256):
        raise ValueError("sha256_invalid")
    if not _store_object_exists(sha256):
        raise LookupError("object_not_found")
    url = _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": AUDIO_BUCKET, "Key": f"store/{sha256}"},
        ExpiresIn=900,
    )
    return _response(200, {"sha256": sha256, "download_url": url})


def _get_job_input(content_hash: str, headers: dict[str, str]) -> dict[str, Any]:
    """Return a video job's inputs to the worker that claimed it."""
    _require_operator(headers)
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not item:
        raise LookupError("job_not_found")
    if item.get("kind", "speech") != "video":
        raise ValueError("job_has_no_video_input")
    payload = json.loads(item.get("video_input") or "{}")
    audio_sha256 = item.get("audio_sha256")
    return _response(
        200,
        {
            "content_hash": content_hash,
            "kind": "video",
            "name": item.get("name", ""),
            **payload,
            "audio_sha256": audio_sha256,
            "audio_url": (
                _s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": AUDIO_BUCKET, "Key": f"store/{audio_sha256}"},
                    ExpiresIn=900,
                )
                if audio_sha256
                else None
            ),
        },
    )


def _audio_url(audio_key: str | None) -> str | None:
    if not audio_key:
        return None
    return _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": AUDIO_BUCKET, "Key": audio_key},
        ExpiresIn=3600,
    )


def _get_job(content_hash: str, headers: dict[str, str]) -> dict[str, Any]:
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not item:
        raise LookupError("job_not_found")
    kind = item.get("kind", "speech")
    if kind == "video":
        _require_operator(headers)
    elif not _check_job_token(headers, content_hash):
        site = _site_from_headers(headers)
        if item.get("site_id") and item["site_id"] != site["site_id"]:
            raise PermissionError("site_mismatch")

    payload = {
        "content_hash": content_hash,
        "kind": kind,
        "status": item.get("status"),
        "waiting_reason": item.get("waiting_reason"),
        "waiting_message": _waiting_message(item),
        "tts_backend": item.get("tts_backend"),
        "audio_url": _audio_url(item.get("audio_key")),
        "output_url": _audio_url(item.get("output_key")),
        "name": item.get("name"),
        "byline": item.get("byline"),
        "worker_type": item.get("worker_type"),
        "claimed_by": item.get("claimed_by") or item.get("claim_owner"),
        "claimed_at": item.get("claimed_at"),
        "completed_at": item.get("completed_at"),
        "failed_at": item.get("failed_at"),
        "duration_seconds": item.get("duration_seconds"),
        "error_message": item.get("error_message"),
    }
    return _response(200, payload)


def _list_claimable(headers: dict[str, str]) -> dict[str, Any]:
    _require_operator(headers)
    now = int(time.time())
    result = _jobs.query(
        IndexName="status-created_at-index",
        KeyConditionExpression="#s = :pending",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":pending": "pending"},
        Limit=50,
    )
    items = list(result.get("Items") or [])
    stale = _jobs.query(
        IndexName="status-created_at-index",
        KeyConditionExpression="#s = :claimed",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":claimed": "claimed"},
        Limit=50,
    )
    for row in stale.get("Items") or []:
        deadline = int(row.get("claim_deadline") or 0)
        if deadline < now:
            items.append(row)

    return _response(
        200,
        {
            "jobs": [
                {
                    "content_hash": row["content_hash"],
                    "kind": row.get("kind", "speech"),
                    "status": row["status"],
                    "tts_backend": row.get("tts_backend"),
                    "voice_id": row.get("voice_id"),
                    "claim_deadline": row.get("claim_deadline"),
                    "text": row.get("text", ""),
                    "name": row.get("name", ""),
                    "byline": row.get("byline", ""),
                }
                for row in items
            ]
        },
    )


def _deadline_iso(epoch: int) -> str:
    """Format a claim deadline as an ISO-8601 UTC timestamp with milliseconds.

    The fixed-width form sorts like time, which lets the fallback state
    machine compare it with its own clock inside a DynamoDB condition.
    """
    stamp = datetime.fromtimestamp(epoch, tz=timezone.utc)
    return stamp.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _claim_window(body: dict[str, Any], now_epoch: int) -> int:
    """Return the epoch second a new or renewed claim lasts until.

    :param body: Request body; ``claim_seconds`` asks for a window, and the
        older ``claim_deadline`` epoch is still accepted.
    :param now_epoch: The current epoch second.
    :returns: The deadline, never more than ``MAX_CLAIM_SECONDS`` ahead.
    """
    if body.get("claim_seconds"):
        window = int(body["claim_seconds"])
    elif body.get("claim_deadline"):
        window = int(body["claim_deadline"]) - now_epoch
    else:
        window = CLAIM_WINDOW_SECONDS
    return now_epoch + max(1, min(window, MAX_CLAIM_SECONDS))


def _claim_job(
    content_hash: str, body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    """Claim a job, or renew a claim, with a conditional DynamoDB write.

    A claim succeeds only when the job is pending or its previous claim has
    expired, and it returns a fencing token. Every later write by the holder
    (renewal, upload, result, failure) must present that token, and a write
    carrying any other token is refused, so a worker that lost its claim can
    never change the job. Renewal extends the deadline only for the current
    token.

    :param content_hash: The content hash identifying the job.
    :param body: Request body with ``claim_owner``; ``renew`` and
        ``claim_token`` to renew; optional ``claim_seconds``.
    :param headers: Request headers for auth.
    :returns: 200 with the claim token, 409 if the job is already claimed
        (or, on renewal, the claim was lost).
    """
    if not _check_job_token(headers, content_hash):
        _require_operator(headers)
    claim_owner = body.get("claim_owner")
    if not claim_owner:
        raise ValueError("claim_owner_required")
    now = _utc_now_iso()
    now_int = int(time.time())
    deadline_epoch = _claim_window(body, now_int)
    worker_type = "batch" if claim_owner.startswith("batch:") else "local"
    if body.get("renew"):
        return _renew_claim(
            content_hash,
            body,
            owner=claim_owner,
            worker_type=worker_type,
            deadline_epoch=deadline_epoch,
            now=now,
        )
    claim_token = secrets.token_urlsafe(24)
    try:
        updated = _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression=(
                "SET #status = :claimed, claim_owner = :owner, "
                "claimed_by = :owner, worker_type = :wtype, "
                "claimed_at = :now, claimed_at_epoch = :now_epoch, "
                "claim_deadline = :deadline, claim_deadline_at = :deadline_at, "
                "claim_token = :token, updated_at = :now "
                "REMOVE waiting_reason "
                "ADD claim_generation :one"
            ),
            # A claimant may take a job that is pending, or reclaim one
            # whose existing claim has genuinely expired. That is the whole
            # mutex, and it holds the same way for every claimant, Batch
            # included: nothing may take a claim that has not expired.
            ConditionExpression=(
                "#status = :pending OR "
                "(#status = :claimed AND claim_deadline < :now_epoch)"
            ),
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":claimed": "claimed",
                ":pending": "pending",
                ":owner": claim_owner,
                ":wtype": worker_type,
                ":deadline": Decimal(deadline_epoch),
                ":deadline_at": _deadline_iso(deadline_epoch),
                ":token": claim_token,
                ":one": 1,
                ":now": now,
                ":now_epoch": Decimal(now_int),
            },
            ReturnValues="UPDATED_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(409, {"error": "already_claimed"})
        raise
    return _response(
        200,
        {
            "content_hash": content_hash,
            "status": "claimed",
            "worker_type": worker_type,
            "claimed_by": claim_owner,
            "claimed_at": now,
            "claim_token": claim_token,
            "claim_deadline": deadline_epoch,
            "claim_generation": int(
                (updated.get("Attributes") or {}).get("claim_generation") or 1
            ),
        },
    )


def _renew_claim(
    content_hash: str,
    body: dict[str, Any],
    *,
    owner: str,
    worker_type: str,
    deadline_epoch: int,
    now: str,
) -> dict[str, Any]:
    """Extend a live claim for the holder of its fencing token.

    The write succeeds only while the job is still claimed under exactly the
    presented token. A claim that lapsed and was taken by someone else, or a
    job that was requeued, finished or failed, refuses the renewal, which
    tells the holder it has lost the job and must stop.

    :returns: 200 with the new deadline, or 409 ``claim_lost``.
    """
    token = body.get("claim_token")
    if not token:
        raise ValueError("claim_token_required")
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression=(
                "SET claim_deadline = :deadline, claim_deadline_at = :deadline_at, "
                "claim_owner = :owner, claimed_by = :owner, "
                "worker_type = :wtype, updated_at = :now"
            ),
            ConditionExpression="#status = :claimed AND claim_token = :token",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":claimed": "claimed",
                ":token": token,
                ":owner": owner,
                ":wtype": worker_type,
                ":deadline": Decimal(deadline_epoch),
                ":deadline_at": _deadline_iso(deadline_epoch),
                ":now": now,
            },
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(409, {"error": "claim_lost"})
        raise
    return _response(
        200,
        {
            "content_hash": content_hash,
            "status": "claimed",
            "claim_token": token,
            "claim_deadline": deadline_epoch,
            "renewed": True,
        },
    )


def _holder_condition(claim_token: str | None) -> str:
    """Return the condition under which a worker may write a job's outcome.

    A worker that presents its fencing token may write only while it still
    holds that exact claim. A caller with no token may write only to a
    claimed job that no token guards (a record from before tokens existed);
    a pending, requeued or finished job refuses it.

    :param claim_token: The token the caller presented, if any.
    :returns: A DynamoDB condition expression using ``#status`` and, when a
        token was presented, ``:holder_token``.
    """
    if claim_token:
        return "#status = :claimed AND claim_token = :holder_token"
    return "#status = :claimed AND attribute_not_exists(claim_token)"


def _retention_ttl_epoch() -> int | None:
    """Return the DynamoDB ``ttl`` value to stamp on a job reaching a terminal
    state (done or failed), or ``None`` when retention is disabled.

    A DynamoDB TTL attribute must be a Unix epoch second integer -- DynamoDB
    reads it as "expire this item at or after this timestamp", not before.
    That expiry is enforced by a background sweep, not immediately at the
    stroke of the timestamp: AWS documents item deletion as typically
    happening within 48 hours of expiry, not instantaneously. Any downstream
    behavior that depends on an expired record being gone the instant its
    ``ttl`` passes (rather than "eventually, usually within two days") is
    relying on a guarantee DynamoDB does not make.
    """
    if RETENTION_DAYS <= 0:
        return None
    return int(time.time()) + RETENTION_DAYS * 86400


def _platform_cost(is_video: bool) -> Decimal:
    """The flat platform allowance charged to a finished job.

    A video job runs on a local worker and costs the cloud nothing, so it is
    charged nothing.
    """
    return Decimal(0) if is_video else Decimal(PLATFORM_COST_PER_JOB_USD)


def _mark_done(
    content_hash: str, body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    if not _check_job_token(headers, content_hash):
        _require_operator(headers)
    audio_key = body.get("output_key") or body.get("audio_key")
    if not audio_key:
        raise ValueError("audio_key_required")
    now = _utc_now_iso()
    now_epoch = int(time.time())

    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    is_video = bool(item) and item.get("kind", "speech") == "video"
    claimed_epoch = int(item.get("claimed_at_epoch", now_epoch)) if item else now_epoch
    duration_seconds = max(1, now_epoch - claimed_epoch)
    worker_type = item.get("worker_type") if item else None

    # avoided_cost_usd: the counterfactual "what would this synthesis have
    # cost had the Batch fallback won the race instead". Only meaningful
    # for a local job -- a Batch job that actually ran on Batch didn't
    # avoid anything, so it always gets zero (written unconditionally below
    # so the field reads as zero rather than absent, distinct from a failed
    # job -- see _mark_failed -- where it is left unset because there is no
    # completed synthesis to have a counterfactual for at all).
    if is_video:
        # A local render costs nothing and avoids no GPU time.
        avoided_cost_usd, avoided_cost_basis = Decimal(0), "not_applicable"
    elif worker_type == "local":
        avoided_cost_usd, avoided_cost_basis = _compute_avoided_cost(
            tts_backend=item.get("tts_backend") if item else None,
            local_duration_seconds=duration_seconds,
        )
    else:
        avoided_cost_usd, avoided_cost_basis = Decimal(0), "batch_job"

    # Cost accounting, written on every completion path (local or Batch):
    #
    # - gpu_cost_usd starts at 0 here. For a local job this is correct and
    #   final -- local jobs never run on Batch, so there is no GPU cost to
    #   add. For a Batch job, this is a placeholder that batch_telemetry
    #   (triggered independently by an EventBridge "Batch Job State Change"
    #   event) will overwrite with the real figure computed from
    #   billed_seconds. In practice the Batch container calls this route
    #   itself just before it exits, and AWS only emits the state-change
    #   event once the container has actually stopped, so mark_done's write
    #   usually lands first and batch_telemetry's corrected value lands
    #   after it. That ordering is not a documented guarantee, though --
    #   Lambda cold starts or EventBridge delivery delays could plausibly
    #   let the telemetry event's Lambda invocation complete first. Either
    #   order is safe here: the two writers touch disjoint concerns
    #   (gpu_cost_usd here is a placeholder for Batch jobs; batch_telemetry
    #   recomputes it independently and does not read this value), so
    #   whichever runs second for a Batch job still leaves the record with
    #   batch_telemetry's correct figure once its event arrives -- it just
    #   means the placeholder may be briefly visible first. This is a known
    #   limitation of the current design, not a proven-safe guarantee.
    # - platform_cost_usd, cost_rate_usd_per_hour, and rate_card_version are
    #   charged/stamped on every job via the request path, since the flat
    #   platform allowance applies regardless of who processed the job and
    #   batch_telemetry never fires for local jobs.
    set_clauses = [
        "#status = :done",
        "output_key = :key" if is_video else "audio_key = :key",
        "updated_at = :now",
        "completed_at = :now",
        "duration_seconds = :duration",
        "gpu_cost_usd = :gpu_cost",
        "platform_cost_usd = :platform_cost",
        "cost_rate_usd_per_hour = :cost_rate",
        "rate_card_version = :rate_card_version",
        "avoided_cost_usd = :avoided_cost",
        "avoided_cost_basis = :avoided_cost_basis",
    ]
    attr_values = {
        ":done": "done",
        ":key": audio_key,
        ":now": now,
        ":duration": duration_seconds,
        ":claimed": "claimed",
        ":pending": "pending",
        ":gpu_cost": Decimal(0),
        ":platform_cost": _platform_cost(is_video),
        ":cost_rate": Decimal(GPU_HOURLY_RATE_USD),
        ":rate_card_version": RATE_CARD_VERSION,
        ":avoided_cost": avoided_cost_usd,
        ":avoided_cost_basis": avoided_cost_basis,
    }
    # Retention TTL: only stamped when RETENTION_DAYS > 0 (see
    # _retention_ttl_epoch). Left unset entirely when retention is disabled,
    # rather than written as some far-future sentinel, so the job record
    # never expires by default.
    attr_names = {"#status": "status"}
    ttl_epoch = _retention_ttl_epoch()
    if ttl_epoch is not None:
        set_clauses.append("#ttl = :ttl")
        attr_values[":ttl"] = ttl_epoch
        attr_names["#ttl"] = "ttl"

    claim_token = body.get("claim_token")
    if claim_token:
        attr_values[":holder_token"] = claim_token
    attr_values.pop(":pending", None)
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression=(
                f"SET {', '.join(set_clauses)} "
                "REMOVE claim_deadline, claim_deadline_at, claim_token, job_token"
            ),
            ConditionExpression=_holder_condition(claim_token),
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values,
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(409, {"error": "stale_claim"})
        raise

    _roll_up_request_path_cost(
        content_hash,
        site_id=item.get("site_id") if item else None,
        worker_type=worker_type,
        date=now[:10],
        platform_cost=_platform_cost(is_video),
        local_duration_seconds=duration_seconds,
        avoided_cost=avoided_cost_usd,
    )

    return _response(
        200,
        {
            "content_hash": content_hash,
            "status": "done",
            "completed_at": now,
            "duration_seconds": duration_seconds,
        },
    )


def _mark_failed(
    content_hash: str, body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    if not _check_job_token(headers, content_hash):
        _require_operator(headers)
    reason = body.get("reason") or "unknown_error"
    owner = body.get("owner")
    now = _utc_now_iso()
    # Loaded only for the rollup's site_id/worker_type -- the update below
    # is still the sole source of truth for the job record itself, guarded
    # by its own ConditionExpression exactly as before this story.
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    is_video = bool(item) and item.get("kind", "speech") == "video"
    # See the comment in _mark_done: a failed job is still costed. GPU cost
    # starts at 0 (correct and final for local jobs; a placeholder for
    # Batch jobs, overwritten by batch_telemetry's independent, correct
    # write once its EventBridge event arrives). The flat platform
    # allowance and rate-card stamp apply regardless of outcome.
    set_clauses = [
        "#status = :failed",
        "error_message = :reason",
        "failed_at = :now",
        "updated_at = :now",
        "gpu_cost_usd = :gpu_cost",
        "platform_cost_usd = :platform_cost",
        "cost_rate_usd_per_hour = :cost_rate",
        "rate_card_version = :rate_card_version",
    ]
    attr_values: dict[str, Any] = {
        ":failed": "failed",
        ":reason": reason,
        ":now": now,
        ":claimed": "claimed",
        ":pending": "pending",
        ":gpu_cost": Decimal(0),
        ":platform_cost": _platform_cost(is_video),
        ":cost_rate": Decimal(GPU_HOURLY_RATE_USD),
        ":rate_card_version": RATE_CARD_VERSION,
    }
    attr_names: dict[str, str] = {"#status": "status"}
    if owner:
        worker_type = "batch" if owner.startswith("batch:") else "local"
        set_clauses.extend(["claimed_by = :owner", "worker_type = :wtype"])
        attr_values[":owner"] = owner
        attr_values[":wtype"] = worker_type

    # A failed job is a terminal outcome too, and the story's underlying
    # concern -- the full extracted text of a narrated page sitting in the
    # job record forever -- applies whether the job ended in "done" or
    # "failed". The original Gherkin only spells out "a completed job", but
    # scoping retention to done-only would leave every failed job's text
    # exempt from the exact privacy/cost policy this story exists to
    # enforce, for no principled reason. A failed job stays retryable right
    # up until this ttl actually sweeps it (DynamoDB TTL deletion is a
    # background pass, not instantaneous -- see _retention_ttl_epoch), and
    # both _regenerate_admin_job and _retry_admin_job clear this ttl the
    # moment the job is reset to pending, so retrying well before expiry is
    # unaffected either way.
    ttl_epoch = _retention_ttl_epoch()
    if ttl_epoch is not None:
        set_clauses.append("#ttl = :ttl")
        attr_values[":ttl"] = ttl_epoch
        attr_names["#ttl"] = "ttl"

    update_expr = (
        f"SET {', '.join(set_clauses)} "
        "REMOVE claim_deadline, claim_deadline_at, claim_token, job_token"
    )

    claim_token = body.get("claim_token")
    if claim_token:
        attr_values[":holder_token"] = claim_token
    attr_values.pop(":pending", None)
    try:
        _jobs.update_item(
            Key={"content_hash": content_hash},
            UpdateExpression=update_expr,
            ConditionExpression=_holder_condition(claim_token),
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values,
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(409, {"error": "stale_claim"})
        raise

    resolved_worker_type = attr_values.get(":wtype") or (
        item.get("worker_type") if item else None
    )
    _roll_up_request_path_cost(
        content_hash,
        site_id=item.get("site_id") if item else None,
        worker_type=resolved_worker_type,
        date=now[:10],
        platform_cost=_platform_cost(is_video),
        local_duration_seconds=None,
    )

    return _response(
        200,
        {
            "content_hash": content_hash,
            "status": "failed",
            "error_message": reason,
            "failed_at": now,
        },
    )


def _redeem_token(
    content_hash: str, body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    """Validate a job token and return job details plus a bearer token."""
    token = body.get("job_token") or headers.get("x-auritus-job-token", "")
    if not token:
        raise ValueError("job_token required")
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not _job_token_matches(item, token):
        raise LookupError("invalid job token")
    return _response(
        200,
        {
            "content_hash": content_hash,
            "text": item.get("text", ""),
            "voice_id": resolve_voice_id(
                item.get("voice_id"), item.get("tts_backend", "kokoro")
            ),
            "tts_backend": item.get("tts_backend", "kokoro"),
            "name": item.get("name", ""),
            "byline": item.get("byline", ""),
            "voice_files": _voice_files_for(item),
            "bearer": token,
        },
    )


def _presign_upload(
    content_hash: str, body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    """Generate a presigned S3 PUT URL for audio upload.

    The audio lives at a key derived from the content hash, so an upload
    from a worker that lost its claim could overwrite a good result. A caller
    presenting a fencing token therefore gets a URL only while it still
    holds that exact claim.

    :param content_hash: The content hash identifying the job.
    :param body: Request body; ``claim_token`` is the holder's fencing token.
    :param headers: Request headers for auth.
    :returns: 200 with ``upload_url``, ``audio_key``, and ``content_type``,
        or 409 ``stale_claim``.
    """
    job_authorized = _check_job_token(headers, content_hash)
    if not job_authorized:
        _require_operator(headers)
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item") or {}
    presented = body.get("claim_token")
    stored = item.get("claim_token")
    if presented and (item.get("status") != "claimed" or presented != stored):
        return _response(409, {"error": "stale_claim"})
    if stored and not presented and item.get("status") == "claimed":
        return _response(409, {"error": "claim_token_required"})
    if job_authorized and item.get("status") != "claimed":
        raise PermissionError("job_not_claimed")
    if item.get("kind", "speech") == "video":
        output_key, content_type = f"video/{content_hash}.mp4", "video/mp4"
    else:
        output_key, content_type = f"audio/{content_hash}.wav", "audio/wav"
    upload_url = _s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": AUDIO_BUCKET, "Key": output_key},
        ExpiresIn=300 if content_type == "audio/wav" else 3600,
        HttpMethod="PUT",
    )
    return _response(
        200,
        {
            "upload_url": upload_url,
            "audio_key": output_key,
            "output_key": output_key,
            "content_type": content_type,
        },
    )


def _create_site(body: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    _require_operator(headers)
    label = (body.get("label") or "site").strip()
    allowed_origins = body.get("allowed_origins") or []
    site_id = str(uuid.uuid4())
    site_key = secrets.token_urlsafe(24)
    now = _utc_now_iso()
    _sites.put_item(
        Item={
            "site_id": site_id,
            "site_key": site_key,
            "label": label,
            "allowed_origins": allowed_origins,
            "disabled": False,
            "created_at": now,
            "updated_at": now,
            "daily_usage": 0,
            "usage_day": "",
        }
    )
    return _response(201, {"site_id": site_id, "site_key": site_key, "label": label})


def _list_sites(headers: dict[str, str]) -> dict[str, Any]:
    _require_operator(headers)
    scan = _sites.scan(Limit=100)
    items = scan.get("Items") or []
    return _response(
        200,
        {
            "sites": [
                {
                    "site_id": row["site_id"],
                    "label": row.get("label"),
                    "disabled": bool(row.get("disabled")),
                    "created_at": row.get("created_at"),
                }
                for row in items
            ]
        },
    )


def _delete_site(site_id: str, headers: dict[str, str]) -> dict[str, Any]:
    """Delete a site key.

    :param site_id: The site key identifier to delete.
    :param headers: Request headers for auth (operator-only).
    :returns: 200 with the deleted site id.
    :raises LookupError: If no site exists for the given id.
    """
    _require_operator(headers)
    item = _sites.get_item(Key={"site_id": site_id}).get("Item")
    if not item:
        raise LookupError("site_not_found")
    _sites.delete_item(Key={"site_id": site_id})
    return _response(200, {"site_id": site_id, "deleted": True})


ALERT_MIN_INTERVAL_SECONDS = 6 * 60 * 60


def _alert_session(body: dict[str, Any]) -> dict[str, Any]:
    """Email the operator when a worker session is near expiry or dead.

    Unauthenticated on purpose: a worker whose refresh token is already dead
    cannot present a bearer token, yet that is exactly when it needs help.
    Abuse is bounded by verifying the email is a real Cognito user and
    rate-limiting per email/kind via a DynamoDB TTL item.

    :param body: ``{"operator_email", "kind", "machine"}``.
    :returns: 200 on send, 404 for unknown user, 429 when rate-limited.
    """
    operator_email = str(body.get("operator_email") or "").strip().lower()
    kind = str(body.get("kind") or "").strip()
    machine = str(body.get("machine") or "")
    if not operator_email or kind not in ("warning", "expired"):
        return _response(400, {"error": "invalid_request"})

    if not USER_POOL_ID:
        return _response(503, {"error": "alerts_not_configured"})
    try:
        _cognito.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=operator_email,
        )
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("UserNotFoundException", "ResourceNotFoundException"):
            return _response(404, {"error": "unknown_operator"})
        return _response(500, {"error": "lookup_failed"})

    rate_key = f"alert:{operator_email}:{kind}"
    now = int(time.time())
    if _alerts is None:
        return _response(503, {"error": "alerts_not_configured"})
    try:
        _alerts.put_item(
            Item={
                "alert_key": rate_key,
                "ttl": now + ALERT_MIN_INTERVAL_SECONDS,
            },
            ConditionExpression="attribute_not_exists(alert_key)",
        )
    except ClientError as exc:
        if (
            exc.response.get("Error", {}).get("Code")
            == "ConditionalCheckFailedException"
        ):
            return _response(429, {"error": "rate_limited"})
        return _response(500, {"error": "rate_limit_failed"})

    if not SES_FROM_ADDRESS or SES_FROM_ADDRESS == "auritus@example.com":
        return _response(200, {"sent": False, "reason": "ses_not_configured"})
    subject = (
        "Auritus worker session expiring soon"
        if kind == "warning"
        else "Auritus worker session expired"
    )
    action = "renew soon" if kind == "warning" else "re-authenticate now"
    body_text = (
        f"The Auritus local worker on {machine or 'an unknown machine'} reports "
        f"that its operator session is {'near expiry' if kind == 'warning' else 'expired'}. "
        f"Run `auritus login` to {action} and resume unattended operation."
    )
    try:
        _ses.send_email(
            Source=SES_FROM_ADDRESS,
            Destination={"ToAddresses": [operator_email]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body_text}},
            },
        )
    except ClientError:
        return _response(200, {"sent": False, "reason": "send_failed"})
    return _response(200, {"sent": True})


def _get_admin_overview(headers: dict[str, str]) -> dict[str, Any]:
    """Return high-level KPIs: job status counts, worker race split, and queue health."""
    _require_operator(headers)
    counts = {"pending": 0, "claimed": 0, "done": 0, "failed": 0}
    worker_counts = {"local": 0, "batch": 0}
    durations: list[float] = []

    res = _jobs.scan(Limit=100)
    items = res.get("Items") or []
    for item in items:
        status = item.get("status", "unknown")
        if status in counts:
            counts[status] += 1
        wtype = item.get("worker_type")
        if wtype in worker_counts:
            worker_counts[wtype] += 1
        dur = item.get("duration_seconds")
        if dur is not None:
            durations.append(float(dur))

    avg_duration = round(sum(durations) / len(durations), 2) if durations else 0.0

    queue_state = "UNKNOWN"
    if BATCH_JOB_QUEUE_NAME:
        try:
            q_res = _batch.describe_job_queues(jobQueues=[BATCH_JOB_QUEUE_NAME])
            queues = q_res.get("jobQueues") or []
            if queues:
                queue_state = queues[0].get("state", "UNKNOWN")
        except (BotoCoreError, ClientError):
            queue_state = "UNKNOWN"

    return _response(
        200,
        {
            "counts": counts,
            "worker_breakdown": worker_counts,
            "avg_duration_seconds": avg_duration,
            "batch_queue_state": queue_state,
            "total_sampled_jobs": len(items),
        },
    )


def _daterange(from_date: str, to_date: str) -> list[str]:
    """Return every ``YYYY-MM-DD`` date from ``from_date`` to ``to_date``, inclusive."""
    start = datetime.strptime(from_date, "%Y-%m-%d")
    end = datetime.strptime(to_date, "%Y-%m-%d")
    if end < start:
        return []
    days = []
    current = start
    while current <= end:
        days.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)
    return days


_COST_TOTAL_FIELDS = (
    "gpu_cost_usd",
    "platform_cost_usd",
    "batch_job_count",
    "local_job_count",
    "billed_seconds",
    "local_duration_seconds",
    "avoided_cost_usd",
)

# Reserved site_id sentinel for the account-wide reconciliation row written
# by the cost_reconciliation Lambda (see its module docstring). Real site
# ids are UUID4 strings minted by _create_site, so this can never collide.
ACCOUNT_SENTINEL_SITE_ID = "__account__"


def _get_admin_costs(
    headers: dict[str, str], query_params: dict[str, str]
) -> dict[str, Any]:
    """Return daily cost rollups, optionally scoped to one site.

    Reads only the pre-aggregated ``AuritusCostRollups`` table, written
    incrementally by ``_mark_done``/``_mark_failed`` and by
    ``batch_telemetry`` on every job completion -- never the jobs table.
    See ``_get_admin_overview`` above for the defect class this
    deliberately avoids: a size-limited ``Scan`` over jobs silently misses
    recent data as the table grows (auritus-294fa6).

    Query shape depends on whether ``site_id`` is given, because the
    rollup table's key (partition ``site_id``, sort ``date``) is built for
    the single-site case:

    * With ``site_id``: one native ``Query`` -- ``site_id = X AND date
      BETWEEN from AND to`` -- against the table's own key. Cheap
      regardless of how much history exists.
    * Without ``site_id`` (the "all sites" summary): there is no query
      that returns every site for a date range off of a (site_id, date)
      key. Instead this queries the ``date-site_id-index`` GSI once per
      calendar day in the requested range (capped at
      ``COST_QUERY_MAX_DAYS``) -- bounded by the number of days asked
      for, never by the number of sites or the size of the rollup table.
      An operator requesting a full year of unfiltered history pays for
      ~365 cheap indexed Query calls rather than for a table Scan; see
      ``_bulk_delete_admin_jobs``'s docstring for the same site_id-only
      tension resolved the other way there, because the jobs table has no
      per-day index to exploit and this rollup table does.

    :param headers: Request headers for auth (operator-only).
    :param query_params: ``site_id`` (optional), ``from``/``to`` (optional,
        ISO date strings ``YYYY-MM-DD``, inclusive range). Defaults to the
        trailing ``DEFAULT_COST_RANGE_DAYS`` days ending today (UTC) when
        omitted.
    :returns: ``{"daily": [...], "total": {...}, "reconciliation": [...]}``.
        ``reconciliation`` is a new, purely additive top-level key (see
        ``_ACCOUNT_SENTINEL`` handling below) rather than folding the
        account-wide actual-cost row into ``daily`` -- ``daily`` is a list
        of real per-site rows that the CLI (``packages/speech/src/babulus_speech/commands/
        cost.py``) and console (``console/app/costs/page.tsx``) both already
        sum, format, and render as one row per real site; mixing in one
        more row keyed by the ``"__account__"`` sentinel would silently
        double-count in every existing sum and require both of those
        already-shipped consumers to learn to recognize and special-case
        it. A new key changes neither existing consumer's behavior at all
        unless they choose to read it. ``reconciliation`` is only populated
        for the unfiltered ("all sites") query, since AWS Cost Explorer
        cannot attribute actual spend to one site at all -- an actual-cost
        figure has no meaning scoped to ``site_id``.
    :raises ValueError: If the resolved date range spans more than
        ``COST_QUERY_MAX_DAYS`` days.
    """
    _require_operator(headers)
    if _cost_rollups is None:
        raise ValueError("cost_rollups_not_configured")

    site_id = query_params.get("site_id")
    to_date = query_params.get("to") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    from_date = query_params.get("from")
    if not from_date:
        from_dt = datetime.strptime(to_date, "%Y-%m-%d") - timedelta(
            days=DEFAULT_COST_RANGE_DAYS - 1
        )
        from_date = from_dt.strftime("%Y-%m-%d")

    days = _daterange(from_date, to_date)
    if len(days) > COST_QUERY_MAX_DAYS:
        raise ValueError("date_range_too_large")

    daily: list[dict[str, Any]] = []
    reconciliation: list[dict[str, Any]] = []
    if site_id:
        result = _cost_rollups.query(
            KeyConditionExpression=(
                "site_id = :sid AND #d BETWEEN :from_date AND :to_date"
            ),
            ExpressionAttributeNames={"#d": "date"},
            ExpressionAttributeValues={
                ":sid": site_id,
                ":from_date": from_date,
                ":to_date": to_date,
            },
        )
        daily = list(result.get("Items") or [])
    else:
        for day in days:
            result = _cost_rollups.query(
                IndexName=COST_ROLLUPS_DATE_INDEX,
                KeyConditionExpression="#d = :day",
                ExpressionAttributeNames={"#d": "date"},
                ExpressionAttributeValues={":day": day},
            )
            for row in result.get("Items") or []:
                if row.get("site_id") == ACCOUNT_SENTINEL_SITE_ID:
                    # The account-wide reconciliation row written by the
                    # cost_reconciliation Lambda. It is not a real site's
                    # cost data, so it is surfaced separately below instead
                    # of joining `daily`'s per-site rows (see the
                    # docstring's ``reconciliation`` explanation).
                    reconciliation.append(row)
                else:
                    daily.append(row)

    # Rollup rows are written incrementally by field (_record_rollup_contribution
    # ADDs only the fields the completing job's path touches), so a
    # local-only day's row has no gpu_cost_usd/batch_job_count/billed_seconds
    # key at all, and a Batch-only day's row has no local_job_count/
    # local_duration_seconds key -- DynamoDB items are sparse, not
    # zero-filled. Every consumer (CLI, console) expects a complete row, so
    # backfill missing fields to 0 here rather than pushing that defaulting
    # duty onto every caller.
    for row in daily:
        for field in _COST_TOTAL_FIELDS:
            row.setdefault(field, Decimal(0))

    total: dict[str, Any] = {field: Decimal(0) for field in _COST_TOTAL_FIELDS}
    for row in daily:
        for field in _COST_TOTAL_FIELDS:
            total[field] += row.get(field) or Decimal(0)

    daily.sort(key=lambda r: (str(r.get("date", "")), str(r.get("site_id", ""))))
    reconciliation.sort(key=lambda r: str(r.get("date", "")))

    return _response(
        200, {"daily": daily, "total": total, "reconciliation": reconciliation}
    )


def _encode_cursor(key: dict[str, Any] | None) -> str | None:
    """Encode a DynamoDB LastEvaluatedKey to a URL-safe base64 string."""
    if not key:
        return None
    raw = json.dumps(key, default=_json_default).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def _decode_cursor(token: str | None) -> dict[str, Any] | None:
    """Decode a URL-safe base64 pagination cursor to a DynamoDB key dict."""
    if not token:
        return None
    try:
        raw = base64.urlsafe_b64decode(token.encode("ascii"))
        data = json.loads(raw.decode("utf-8"))
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return None


def _query_jobs_by_status(
    status: str, *, limit: int, start_key: dict[str, Any] | None
) -> dict[str, Any]:
    """Query one status partition of ``status-created_at-index``, newest first."""
    query_kwargs: dict[str, Any] = {
        "IndexName": "status-created_at-index",
        "KeyConditionExpression": "#s = :status",
        "ExpressionAttributeNames": {"#s": "status"},
        "ExpressionAttributeValues": {":status": status},
        "ScanIndexForward": False,
        "Limit": limit,
    }
    if start_key:
        query_kwargs["ExclusiveStartKey"] = start_key
    return _jobs.query(**query_kwargs)


def _list_admin_jobs_unfiltered(
    limit: int, cursor: dict[str, Any] | None
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """Return the ``limit`` most recent jobs across every status, newest first.

    A plain ``Scan`` with a ``Limit`` returns an arbitrary page of items in
    whatever internal partition order DynamoDB happens to read them in --
    NOT the most recently created items -- and sorting only that arbitrary
    page by ``created_at`` afterwards does not fix that: a newly created job
    can be entirely absent from the scanned page and never surface as
    "most recent" at all. This was confirmed in production: a job that
    ``GET /jobs/{hash}`` correctly reported as ``pending`` never appeared in
    this unfiltered listing, even though every job the listing did return
    was strictly older by ``created_at``.

    Instead, since ``status-created_at-index`` (partition key ``status``,
    sort key ``created_at``) is already queried correctly for the
    status-filtered case, query it once per known status with
    ``ScanIndexForward=False`` -- each such query IS genuinely sorted
    newest-first -- and merge the (at most four) results in Python.

    Pagination across a merge of independently paginated queries has no
    single natural cursor. The approach here keeps, per status, a small
    buffer of already-fetched-but-not-yet-emitted items alongside that
    status's own DynamoDB ``ExclusiveStartKey``: on every page, any status
    whose buffer is smaller than ``limit`` (the worst case, where every
    emitted item could come from one status) is topped up with one more
    query before merging, so a fetched item is only ever discarded from the
    buffer once it has actually been emitted on some page. Page one is
    always exactly correct; because nothing fetched is discarded before
    being emitted, later pages are complete and free of both gaps and
    duplicates too, modulo the ordinary snapshot-consistency caveat that
    applies to any multi-query pagination against a table that is still
    being written to between page fetches (a status's relative rank can
    shift if enough new rows land in a different status between two of the
    caller's page requests).

    The buffer is deliberately two-tier so the cursor stays small: a
    buffered-but-unemitted item is carried across pages as just its
    ``content_hash`` and ``created_at`` (the only two fields the merge/sort
    step actually needs), never its full body. Full bodies only exist
    transiently in-memory for the current request, in two ways -- freshly
    queried items arrive with a full body straight from the ``Query`` call
    (query results are never trimmed), and items surviving from a prior
    page's minimal cursor buffer get their full body fetched individually,
    but ONLY for the ones that end up on this page's emitted set. Items that
    remain buffered (fetched or carried over, but not emitted this page)
    have any full body dropped again before being written back into the
    next cursor. Without this, the cursor would embed up to
    ``limit * len(JOB_STATUSES)`` full job records -- including untruncated
    ``text`` and ``job_token`` -- base64-encoded into a ``next_token`` query
    parameter, which risks exceeding real request/URL size limits that the
    moto-based test suite has no way to catch.
    """
    per_status = cursor.get("per_status", {}) if cursor else {}

    # buffers[status] holds "buffer entries": dicts always carrying
    # content_hash and created_at (enough to sort), and carrying "item"
    # (the full DynamoDB body) only when it is already in hand for free --
    # i.e. for entries fetched fresh this request. Entries restored from
    # the cursor's minimal buffer never carry "item" yet.
    buffers: dict[str, list[dict[str, Any]]] = {}
    start_keys: dict[str, Any] = {}
    for status in JOB_STATUSES:
        state = per_status.get(status) or {}
        buffers[status] = [dict(entry) for entry in (state.get("buffer") or [])]
        start_keys[status] = state.get("start_key")

    for status in JOB_STATUSES:
        exhausted = per_status.get(status) is not None and not start_keys[status]
        if len(buffers[status]) < limit and not exhausted:
            res = _query_jobs_by_status(
                status, limit=limit, start_key=start_keys[status]
            )
            for item in res.get("Items") or []:
                buffers[status].append(
                    {
                        "content_hash": item["content_hash"],
                        "created_at": item.get("created_at", ""),
                        "item": item,
                    }
                )
            start_keys[status] = res.get("LastEvaluatedKey")

    merged: list[dict[str, Any]] = []
    for status in JOB_STATUSES:
        merged.extend(buffers[status])
    merged.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    page_entries = merged[:limit]

    # Only now -- once it's known which buffered entries actually make it
    # onto this page -- fetch full bodies for the ones that don't already
    # have one (i.e. those that came from the cursor's minimal buffer
    # rather than from a fresh query this request).
    page: list[dict[str, Any]] = []
    for entry in page_entries:
        full_item = entry.get("item")
        if full_item is None:
            full_item = _jobs.get_item(Key={"content_hash": entry["content_hash"]}).get(
                "Item"
            )
        if full_item is not None:
            page.append(full_item)

    emitted_ids = {entry["content_hash"] for entry in page_entries}
    next_per_status: dict[str, Any] = {}
    has_more = False
    for status in JOB_STATUSES:
        leftover = [
            {
                "content_hash": entry["content_hash"],
                "created_at": entry.get("created_at", ""),
            }
            for entry in buffers[status]
            if entry["content_hash"] not in emitted_ids
        ]
        next_per_status[status] = {"buffer": leftover, "start_key": start_keys[status]}
        if leftover or start_keys[status]:
            has_more = True

    next_cursor = {"multi": True, "per_status": next_per_status} if has_more else None
    return page, next_cursor


def _list_admin_jobs(
    headers: dict[str, str], query_params: dict[str, str]
) -> dict[str, Any]:
    """Return a list of generation jobs with full telemetry metadata and pagination."""
    _require_operator(headers)
    status_filter = query_params.get("status")
    limit = min(100, max(1, int(query_params.get("limit") or 25)))
    cursor = _decode_cursor(query_params.get("next_token"))

    if status_filter:
        start_key = (
            cursor if isinstance(cursor, dict) and not cursor.get("multi") else None
        )
        res = _query_jobs_by_status(status_filter, limit=limit, start_key=start_key)
        items = list(res.get("Items") or [])
        next_token = _encode_cursor(res.get("LastEvaluatedKey"))
    else:
        multi_cursor = (
            cursor if isinstance(cursor, dict) and cursor.get("multi") else None
        )
        items, next_cursor = _list_admin_jobs_unfiltered(limit, multi_cursor)
        next_token = _encode_cursor(next_cursor)

    formatted_jobs = []
    for item in items:
        audio_key = item.get("audio_key")
        formatted_jobs.append(
            {
                "content_hash": item["content_hash"],
                "kind": item.get("kind", "speech"),
                "status": item.get("status"),
                "waiting_reason": item.get("waiting_reason"),
                "tts_backend": item.get("tts_backend"),
                "voice_id": item.get("voice_id"),
                "text": str(item.get("text", ""))[:120],
                "name": item.get("name", ""),
                "byline": item.get("byline", ""),
                "site_id": item.get("site_id"),
                "worker_type": item.get("worker_type"),
                "claimed_by": item.get("claimed_by") or item.get("claim_owner"),
                "created_at": item.get("created_at"),
                "claimed_at": item.get("claimed_at"),
                "completed_at": item.get("completed_at"),
                "failed_at": item.get("failed_at"),
                "duration_seconds": item.get("duration_seconds"),
                "error_message": item.get("error_message"),
                "audio_url": _audio_url(audio_key) if audio_key else None,
                "output_url": _audio_url(item.get("output_key")),
            }
        )

    return _response(200, {"jobs": formatted_jobs, "next_token": next_token})


def _get_admin_job(content_hash: str, headers: dict[str, str]) -> dict[str, Any]:
    """Return full inspection details for a single job."""
    _require_operator(headers)
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not item:
        raise LookupError("job_not_found")
    audio_key = item.get("audio_key")
    return _response(
        200,
        {
            "content_hash": content_hash,
            "kind": item.get("kind", "speech"),
            "status": item.get("status"),
            "waiting_reason": item.get("waiting_reason"),
            "waiting_message": _waiting_message(item),
            "output_url": _audio_url(item.get("output_key")),
            "tts_backend": item.get("tts_backend"),
            "voice_id": item.get("voice_id"),
            "text": item.get("text", ""),
            "name": item.get("name", ""),
            "byline": item.get("byline", ""),
            "site_id": item.get("site_id"),
            "site_key": item.get("site_key"),
            "worker_type": item.get("worker_type"),
            "claimed_by": item.get("claimed_by") or item.get("claim_owner"),
            "created_at": item.get("created_at"),
            "claimed_at": item.get("claimed_at"),
            "completed_at": item.get("completed_at"),
            "failed_at": item.get("failed_at"),
            "duration_seconds": item.get("duration_seconds"),
            "error_message": item.get("error_message"),
            "audio_url": _audio_url(audio_key) if audio_key else None,
            "gpu_cost_usd": item.get("gpu_cost_usd"),
            "platform_cost_usd": item.get("platform_cost_usd"),
            "cost_rate_usd_per_hour": item.get("cost_rate_usd_per_hour"),
            "rate_card_version": item.get("rate_card_version"),
            "avoided_cost_usd": item.get("avoided_cost_usd"),
            "avoided_cost_basis": item.get("avoided_cost_basis"),
        },
    )


def _delete_job_record_and_audio(item: dict[str, Any]) -> None:
    """Delete one job's S3 audio object (if any) and its DynamoDB record.

    Shared deletion core for both the single-job and bulk-delete admin
    routes. Callers are responsible for auth and for having already
    loaded ``item`` -- this does not re-fetch or re-check anything, so a
    bulk caller iterating many already-fetched items can invoke this
    directly instead of paying for a redundant per-item ``get_item`` and
    ``_require_operator`` call the way looping over ``_delete_admin_job``
    itself would.

    :param item: A full job record (must include ``content_hash``).
    """
    for key_attr in ("audio_key", "output_key"):
        if item.get(key_attr):
            _s3.delete_object(Bucket=AUDIO_BUCKET, Key=item[key_attr])
    _jobs.delete_item(Key={"content_hash": item["content_hash"]})


def _delete_admin_job(content_hash: str, headers: dict[str, str]) -> dict[str, Any]:
    """Delete a job record and its audio artifact.

    :param content_hash: The content hash identifying the job.
    :param headers: Request headers for auth (operator-only).
    :returns: 200 with the deleted content hash.
    :raises LookupError: If no job exists for the given content hash.
    """
    _require_operator(headers)
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not item:
        raise LookupError("job_not_found")
    _delete_job_record_and_audio(item)
    return _response(200, {"content_hash": content_hash, "deleted": True})


BULK_DELETE_MAX_MATCHES = 1000


def _bulk_delete_admin_jobs(
    body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    """Delete jobs matching a filter, dry-run by default.

    This is the most destructive route in the product, so it is built to
    fail safe in two independent ways: ``dry_run`` defaults to ``True``
    when absent from the body (the caller must explicitly pass
    ``dry_run: false`` to delete anything -- a typo'd or missing key never
    deletes), and an unfiltered call is rejected outright rather than
    treated as "match everything".

    Matching strategy and its cost, spelled out because there is
    deliberately NO index on ``site_id`` alone (see ``AuritusJobs`` in
    ``cdk/stacks/backend.py`` -- only ``status-created_at-index`` and
    ``claimed_by-index`` exist):

    * If ``status`` is given, candidates come from a single, efficient
      ``_query_jobs_by_status`` call against that status partition --
      cheap regardless of table size.
    * If ``status`` is NOT given (a bulk purge scoped only by ``site_id``
      and/or ``older_than_days``), there is no query path that can filter
      by ``site_id`` directly: doing so requires reading every job in
      every status partition and filtering client-side in Python. This
      implementation reuses ``_query_jobs_by_status`` across all
      ``JOB_STATUSES`` for that read (rather than a raw ``Scan``) so it
      goes through the same tested, correctly-paginated query path the
      rest of this file already relies on, but it is NOT cheaper than a
      full scan -- it still reads the entire table. This is acceptable
      for a bulk admin operation that is invoked rarely (retiring a
      publisher, cleaning up a bad backend), not on any hot path, but it
      is not free, and it will get slower as the table grows. A
      dedicated ``site_id`` GSI would fix this properly; it was not added
      here because doing so is a live infrastructure change requiring a
      real ``cdk deploy`` before it would work (the same caveat that
      applied to the recently-added ``claimed_by-index``), which is out
      of scope for landing this route.

    :param body: ``{"site_id": str?, "status": str?, "older_than_days":
        int?, "dry_run": bool}``. At least one of ``site_id``, ``status``,
        or ``older_than_days`` is required.
    :param headers: Request headers for auth (operator-only).
    :returns: ``{"matched": int, "deleted": int, "dry_run": bool,
        "truncated": bool}``. ``deleted`` equals ``matched`` when
        ``dry_run`` is true (nothing is actually deleted in that case);
        otherwise it is the number of jobs actually deleted. ``truncated``
        is true when more jobs may match than the ``matched`` count
        reported -- a single call caps how many candidate jobs it will
        process (``BULK_DELETE_MAX_MATCHES``) to stay well inside a
        Lambda's execution time budget; run the same filter again after a
        truncated non-dry-run delete to remove the rest.
    :raises ValueError: If no filter is supplied.
    """
    _require_operator(headers)

    site_id = body.get("site_id")
    status = body.get("status")
    older_than_days = body.get("older_than_days")
    dry_run = body.get("dry_run", True)

    if not site_id and not status and older_than_days is None:
        raise ValueError("filter_required")

    cutoff_iso = None
    if older_than_days is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=int(older_than_days))
        cutoff_iso = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")

    def _matches(candidate: dict[str, Any]) -> bool:
        if site_id and candidate.get("site_id") != site_id:
            return False
        if (
            cutoff_iso is not None
            and str(candidate.get("created_at", "")) >= cutoff_iso
        ):
            return False
        return True

    matched: list[dict[str, Any]] = []
    truncated = False

    if status:
        start_key: dict[str, Any] | None = None
        while len(matched) < BULK_DELETE_MAX_MATCHES:
            res = _query_jobs_by_status(
                status,
                limit=min(100, BULK_DELETE_MAX_MATCHES - len(matched)),
                start_key=start_key,
            )
            for candidate_item in res.get("Items") or []:
                if _matches(candidate_item):
                    matched.append(candidate_item)
                    if len(matched) >= BULK_DELETE_MAX_MATCHES:
                        break
            start_key = res.get("LastEvaluatedKey")
            if not start_key:
                break
        if start_key:
            truncated = True
    else:
        # No status filter: every status partition must be read in full to
        # honor a site_id/age-only filter -- see the docstring above for
        # why this cannot be made cheaper without a new GSI.
        for one_status in JOB_STATUSES:
            start_key = None
            while True:
                res = _query_jobs_by_status(one_status, limit=100, start_key=start_key)
                for candidate_item in res.get("Items") or []:
                    if _matches(candidate_item):
                        if len(matched) >= BULK_DELETE_MAX_MATCHES:
                            truncated = True
                            break
                        matched.append(candidate_item)
                start_key = res.get("LastEvaluatedKey")
                if not start_key or len(matched) >= BULK_DELETE_MAX_MATCHES:
                    if start_key:
                        truncated = True
                    break
            if len(matched) >= BULK_DELETE_MAX_MATCHES:
                break

    deleted_count = 0
    if not dry_run:
        for job_item in matched:
            _delete_job_record_and_audio(job_item)
            deleted_count += 1

    return _response(
        200,
        {
            "matched": len(matched),
            "deleted": len(matched) if dry_run else deleted_count,
            "dry_run": bool(dry_run),
            "truncated": truncated,
        },
    )


def _regenerate_admin_job(content_hash: str, headers: dict[str, str]) -> dict[str, Any]:
    """Force regeneration of a job, resetting it to pending in place.

    The content hash is kept stable so an embedding page's existing
    reference keeps resolving; only the job's state is reset.

    :param content_hash: The content hash identifying the job.
    :param headers: Request headers for auth (operator-only).
    :returns: 200 with the job reset to pending.
    :raises LookupError: If no job exists for the given content hash.
    :raises ConflictError: If the job is already pending or claimed.
    """
    _require_operator(headers)
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not item:
        raise LookupError("job_not_found")
    status = item.get("status")
    if status in ("pending", "claimed"):
        raise ConflictError(f"job_is_{status}")

    for key_attr in ("audio_key", "output_key"):
        if item.get(key_attr):
            _s3.delete_object(Bucket=AUDIO_BUCKET, Key=item[key_attr])

    job_token = secrets.token_urlsafe(32)
    now = _utc_now_iso()
    # ttl is REMOVEd here alongside the other terminal-state attributes: a
    # regenerated job is pending again, not done, so any ttl left over from
    # its PREVIOUS completion would expire the record based on when it
    # finished last time, not this time -- an off-by-one-lifecycle bug that
    # could delete an in-flight (or freshly completed) job's record early.
    # The new ttl gets set the normal way by the next _mark_done/_mark_failed.
    _jobs.update_item(
        Key={"content_hash": content_hash},
        UpdateExpression=(
            "SET #status = :pending, job_token = :token, updated_at = :now"
            + (", waiting_reason = :waiting" if item.get("kind") == "video" else "")
            + " REMOVE audio_key, output_key, claimed_by, claim_owner, claimed_at, "
            "claimed_at_epoch, claim_deadline, claim_deadline_at, claim_token, completed_at, failed_at, "
            "duration_seconds, error_message, worker_type, "
            "gpu_cost_usd, platform_cost_usd, cost_rate_usd_per_hour, "
            "rate_card_version, avoided_cost_usd, avoided_cost_basis, "
            "platform_cost_rolled_up, gpu_cost_rolled_up, "
            "backend_timing_rolled_up, batch_created_at, batch_started_at, "
            "batch_stopped_at, instance_type, container_seconds, "
            "provisioning_seconds, billed_seconds, #ttl"
        ),
        ExpressionAttributeNames={"#status": "status", "#ttl": "ttl"},
        ExpressionAttributeValues={
            ":pending": "pending",
            ":token": job_token,
            ":now": now,
            **(
                {":waiting": VIDEO_WAITING_REASON}
                if item.get("kind") == "video"
                else {}
            ),
        },
    )

    _arm_fallback(
        content_hash,
        job_token,
        item.get("tts_backend", "kokoro"),
        item.get("kind", "speech"),
    )

    return _response(200, {"content_hash": content_hash, "status": "pending"})


def _retry_admin_job(
    content_hash: str, body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    """Retry a failed job, or release a stuck claim, resetting it to pending.

    A failed job is always eligible. A claimed job is eligible only if its
    stored claim deadline has passed (the worker holding it is presumed
    dead), unless the caller explicitly forces the release of a live claim.

    :param content_hash: The content hash identifying the job.
    :param body: Request body; ``force: true`` releases a live claim.
    :param headers: Request headers for auth (operator-only).
    :returns: 200 with the job reset to pending.
    :raises LookupError: If no job exists for the given content hash.
    :raises ConflictError: If the job's status makes it ineligible.
    """
    _require_operator(headers)
    item = _jobs.get_item(Key={"content_hash": content_hash}).get("Item")
    if not item:
        raise LookupError("job_not_found")

    status = item.get("status")
    force = bool(body.get("force"))

    if status == "claimed":
        deadline = item.get("claim_deadline")
        now_epoch = Decimal(int(time.time()))
        is_stale = deadline is not None and Decimal(deadline) < now_epoch
        if not is_stale and not force:
            raise ConflictError("claim_still_live")
    elif status != "failed":
        raise ConflictError(f"job_is_{status}")

    job_token = secrets.token_urlsafe(32)
    now = _utc_now_iso()
    # ttl is REMOVEd for the same reason as in _regenerate_admin_job: a
    # retried job (from "failed", which -- per this story's scope decision
    # in _mark_failed -- may itself carry a ttl from when it failed) is
    # pending again, and a stale ttl from the previous outcome must not
    # survive to expire the record at the wrong time. A stuck "claimed" job
    # never had a ttl set in the first place (only _mark_done/_mark_failed
    # set one), so this REMOVE is a no-op for that path and only matters for
    # the "failed" path -- but it's harmless and correct to always include.
    _jobs.update_item(
        Key={"content_hash": content_hash},
        UpdateExpression=(
            "SET #status = :pending, job_token = :token, updated_at = :now"
            + (", waiting_reason = :waiting" if item.get("kind") == "video" else "")
            + " REMOVE claimed_by, claim_owner, claimed_at, claimed_at_epoch, "
            "claim_deadline, claim_deadline_at, claim_token, failed_at, error_message, worker_type, "
            "gpu_cost_usd, platform_cost_usd, cost_rate_usd_per_hour, "
            "rate_card_version, avoided_cost_usd, avoided_cost_basis, "
            "platform_cost_rolled_up, gpu_cost_rolled_up, "
            "backend_timing_rolled_up, batch_created_at, batch_started_at, "
            "batch_stopped_at, instance_type, container_seconds, "
            "provisioning_seconds, billed_seconds, #ttl"
        ),
        ExpressionAttributeNames={"#status": "status", "#ttl": "ttl"},
        ExpressionAttributeValues={
            ":pending": "pending",
            ":token": job_token,
            ":now": now,
            **(
                {":waiting": VIDEO_WAITING_REASON}
                if item.get("kind") == "video"
                else {}
            ),
        },
    )

    _arm_fallback(
        content_hash,
        job_token,
        item.get("tts_backend", "kokoro"),
        item.get("kind", "speech"),
    )

    return _response(200, {"content_hash": content_hash, "status": "pending"})


def _toggle_admin_queue(
    body: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    """Toggle or set the AWS Batch GPU job queue state."""
    _require_operator(headers)
    if not BATCH_JOB_QUEUE_NAME:
        raise ValueError("batch_queue_not_configured")

    desired_state = body.get("state")
    if not desired_state:
        q_res = _batch.describe_job_queues(jobQueues=[BATCH_JOB_QUEUE_NAME])
        queues = q_res.get("jobQueues") or []
        current_state = queues[0].get("state", "ENABLED") if queues else "ENABLED"
        desired_state = "DISABLED" if current_state == "ENABLED" else "ENABLED"
    else:
        desired_state = str(desired_state).upper()
        if desired_state not in ("ENABLED", "DISABLED"):
            raise ValueError("invalid_state")

    _batch.update_job_queue(
        jobQueue=BATCH_JOB_QUEUE_NAME,
        state=desired_state,
    )
    return _response(200, {"queue_name": BATCH_JOB_QUEUE_NAME, "state": desired_state})
