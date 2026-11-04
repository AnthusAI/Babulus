"""Spending guards shared by the fallback gate and the quota finisher.

Two guards live here, and neither depends on the other:

* ``ProspectusQuota`` talks to the Prospectus quota service over HTTP, signed
  with SigV4. Products report billable items, never money. Anything other
  than a clean 200 with a recognised body is a refusal.
* ``SpendCeiling`` is our own global ceiling on real spend, kept in a
  DynamoDB table with conditional writes: a limit per attempt, per day and per
  month, and one concurrent slot. Its limits come from the deployment's
  environment. Amounts live only in that table, never on job records.

Every failure is a ``GuardRefusal`` with a short reason code. Callers start no
compute on a refusal.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Callable
from urllib.parse import urlsplit

import boto3
from botocore.exceptions import ClientError

ACCOUNT_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
RESERVATION_ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
MAX_QUOTA_TRIES = 3
HTTP_TIMEOUT_SECONDS = 5

Transport = Callable[[str, str, dict[str, str], bytes], "tuple[int, bytes]"]


class GuardRefusal(Exception):
    """A guard said no, or could not say yes. No compute may start."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def valid_account_id(account_id: Any) -> str:
    """Return ``account_id`` if it is safe to place in a URL path.

    :raises GuardRefusal: ``no_account`` when it is missing or malformed.
    """
    if not isinstance(account_id, str) or not ACCOUNT_ID.match(account_id):
        raise GuardRefusal("no_account")
    return account_id


# --------------------------------------------------------------------------
# Prospectus quota
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class QuotaConfig:
    """Where and as whom to call Prospectus."""

    endpoint: str
    role_arn: str

    @property
    def region(self) -> str:
        """The region API Gateway signs for, read from the endpoint's host."""
        match = re.search(r"\.execute-api\.([a-z0-9-]+)\.amazonaws\.com", self.endpoint)
        return match.group(1) if match else os.environ.get("AWS_REGION", "us-east-1")

    @classmethod
    def from_environment(cls) -> "QuotaConfig":
        """Read the deployment's settings.

        :raises GuardRefusal: ``guards_not_configured`` when either is missing.
        """
        endpoint = os.environ.get("PROSPECTUS_QUOTA_ENDPOINT", "").strip()
        role_arn = os.environ.get("PROSPECTUS_CALLER_ROLE_ARN", "").strip()
        parts = urlsplit(endpoint)
        if not endpoint or not role_arn or parts.scheme != "https" or not parts.netloc:
            raise GuardRefusal("guards_not_configured")
        return cls(endpoint=endpoint.rstrip("/"), role_arn=role_arn)


def _urllib_transport(
    method: str, url: str, headers: dict[str, str], body: bytes
) -> tuple[int, bytes]:
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(  # noqa: S310 - https is checked in QuotaConfig
            request, timeout=HTTP_TIMEOUT_SECONDS
        ) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def assume_caller_role(role_arn: str) -> Any:
    """Return botocore credentials for the registered Prospectus caller role."""
    from botocore.credentials import Credentials

    result = boto3.client("sts").assume_role(
        RoleArn=role_arn,
        RoleSessionName="babulus-quota",
        DurationSeconds=900,
    )["Credentials"]
    return Credentials(
        result["AccessKeyId"], result["SecretAccessKey"], result["SessionToken"]
    )


def sign_request(
    method: str, url: str, body: bytes, credentials: Any, region: str
) -> dict[str, str]:
    """Sign a request for ``execute-api`` with SigV4 and return its headers."""
    from botocore.auth import SigV4Auth
    from botocore.awsrequest import AWSRequest

    request = AWSRequest(
        method=method,
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
    )
    SigV4Auth(credentials, "execute-api", region).add_auth(request)
    return {key: str(value) for key, value in request.headers.items()}


class ProspectusQuota:
    """The Prospectus quota HTTP contract, with fail-closed handling."""

    def __init__(
        self,
        config: QuotaConfig,
        *,
        transport: Transport | None = None,
        credentials: Callable[[], Any] | None = None,
        region: str | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._config = config
        self._transport = transport or _urllib_transport
        self._credentials = credentials or (lambda: assume_caller_role(config.role_arn))
        self._region = region or config.region
        self._sleep = sleep

    def _post(
        self, path: str, payload: dict[str, Any], expected_status: str, id_field: str
    ) -> dict[str, Any]:
        """POST with the same body on every try; accept only a clean 200."""
        url = f"{self._config.endpoint}{path}"
        body = json.dumps(payload, sort_keys=True).encode("utf-8")
        refusal = "quota_unavailable"
        for attempt in range(MAX_QUOTA_TRIES):
            if attempt:
                self._sleep(0.25 * attempt)
            try:
                headers = sign_request(
                    "POST", url, body, self._credentials(), self._region
                )
                status, raw = self._transport("POST", url, headers, body)
            except Exception:  # noqa: BLE001 - any failure to ask means no
                refusal = "quota_unavailable"
                continue
            try:
                parsed = json.loads(raw.decode("utf-8")) if raw else {}
            except (UnicodeDecodeError, ValueError):
                parsed = {}
            if status == 200:
                if (
                    isinstance(parsed, dict)
                    and parsed.get("status") == expected_status
                    and isinstance(parsed.get(id_field), str)
                    and RESERVATION_ID.match(parsed[id_field])
                ):
                    return parsed
                raise GuardRefusal("quota_unavailable")
            error = parsed.get("error") if isinstance(parsed, dict) else None
            if status == 402:
                raise GuardRefusal("quota_exhausted")
            if status in (403, 404):
                raise GuardRefusal("quota_forbidden")
            if status >= 500 or (status == 409 and error == "busy"):
                # Uncertain outcome or contention: repeat with the same
                # operation ID and body.
                refusal = "quota_unavailable"
                continue
            raise GuardRefusal("quota_unavailable")
        raise GuardRefusal(refusal)

    def reserve(
        self,
        account_id: str,
        operation_id: str,
        items: list[dict[str, Any]],
        expires_in_seconds: int,
    ) -> str:
        """Reserve ``items`` and return the reservation ID."""
        account = valid_account_id(account_id)
        reply = self._post(
            f"/v1/quota/accounts/{account}/reservations",
            {
                "operationId": operation_id,
                "items": items,
                "expiresInSeconds": expires_in_seconds,
            },
            "reserved",
            "reservationId",
        )
        if reply["reservationId"] != operation_id:
            raise GuardRefusal("quota_unavailable")
        return str(reply["reservationId"])

    def settle(
        self,
        account_id: str,
        reservation_id: str,
        operation_id: str,
        items: list[dict[str, Any]],
    ) -> None:
        """Charge the reservation for the items that really ran."""
        account = valid_account_id(account_id)
        self._post(
            f"/v1/quota/accounts/{account}/reservations/{reservation_id}/settle",
            {"operationId": operation_id, "items": items},
            "settled",
            "reservationId",
        )

    def release(self, account_id: str, reservation_id: str, operation_id: str) -> None:
        """Give back a reservation when nothing ran."""
        account = valid_account_id(account_id)
        self._post(
            f"/v1/quota/accounts/{account}/reservations/{reservation_id}/release",
            {"operationId": operation_id},
            "released",
            "reservationId",
        )


# --------------------------------------------------------------------------
# Global spending ceiling
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class CeilingLimits:
    """The ceiling's limits and the estimate of one attempt, all from config."""

    per_attempt: Decimal
    per_day: Decimal
    per_month: Decimal
    rate_per_vcpu_second: Decimal

    @classmethod
    def from_environment(cls) -> "CeilingLimits":
        """Read the limits; nothing here has a default.

        :raises GuardRefusal: ``guards_not_configured`` if any is missing,
            unparseable or not positive.
        """
        names = (
            "SPEND_CEILING_PER_ATTEMPT",
            "SPEND_CEILING_PER_DAY",
            "SPEND_CEILING_PER_MONTH",
            "SPEND_ESTIMATE_RATE_PER_VCPU_SECOND",
        )
        try:
            values = [Decimal(os.environ.get(name, "").strip()) for name in names]
        except InvalidOperation as exc:
            raise GuardRefusal("guards_not_configured") from exc
        if any(not value.is_finite() or value <= 0 for value in values):
            raise GuardRefusal("guards_not_configured")
        return cls(*values)

    def estimate(self, vcpu_seconds: int) -> Decimal:
        """The most one attempt can cost, from its maximum vCPU seconds."""
        return self.rate_per_vcpu_second * Decimal(vcpu_seconds)


def _day_key(now: int) -> str:
    return "day#" + time.strftime("%Y-%m-%d", time.gmtime(now))


def _month_key(now: int) -> str:
    return "month#" + time.strftime("%Y-%m", time.gmtime(now))


class SpendCeiling:
    """Per-attempt, per-day, per-month and one-slot limits on real spend."""

    def __init__(self, table: Any, client: Any, limits: CeilingLimits) -> None:
        """``table`` reads with native types; ``client`` is the low-level
        DynamoDB client used for transactions, which take typed values."""
        self._table = table
        self._limits = limits
        self._client = client
        self._name = table.name

    def _update(self, key: str, expression: str, condition: str, values: dict) -> dict:
        return {
            "Update": {
                "TableName": self._name,
                "Key": {"ledger_key": {"S": key}},
                "UpdateExpression": expression,
                "ConditionExpression": condition,
                "ExpressionAttributeValues": values,
            }
        }

    @staticmethod
    def _n(value: Decimal | int) -> dict[str, str]:
        return {"N": str(value)}

    def acquire(
        self, lease_id: str, estimate: Decimal, now: int, slot_seconds: int
    ) -> None:
        """Take one attempt's worth of ceiling and the one slot, or refuse.

        Repeating the call for a lease already held is a no-op, so a retried
        gate does not refuse itself.

        :raises GuardRefusal: ``ceiling_reached`` when any limit has no room.
        """
        limits = self._limits
        if estimate > limits.per_attempt:
            raise GuardRefusal("ceiling_reached")
        day_room = limits.per_day - estimate
        month_room = limits.per_month - estimate
        lease_key = f"lease#{lease_id}"
        add = "ADD spent :amount"
        fits = "attribute_not_exists(spent) OR spent <= :room"
        transaction = [
            self._update(
                _day_key(now),
                add,
                fits,
                {":amount": self._n(estimate), ":room": self._n(day_room)},
            ),
            self._update(
                _month_key(now),
                add,
                fits,
                {":amount": self._n(estimate), ":room": self._n(month_room)},
            ),
            self._update(
                "slot",
                "SET holder = :lease, holder_expires = :expires",
                "attribute_not_exists(holder) OR holder_expires < :now",
                {
                    ":lease": {"S": lease_id},
                    ":expires": self._n(now + slot_seconds),
                    ":now": self._n(now),
                },
            ),
            {
                "Put": {
                    "TableName": self._name,
                    "Item": {
                        "ledger_key": {"S": lease_key},
                        "amount": self._n(estimate),
                        "day": {"S": _day_key(now)},
                        "month": {"S": _month_key(now)},
                    },
                    "ConditionExpression": "attribute_not_exists(ledger_key)",
                }
            },
        ]
        if day_room < 0 or month_room < 0:
            raise GuardRefusal("ceiling_reached")
        try:
            self._client.transact_write_items(TransactItems=transaction)
        except ClientError as exc:
            code = exc.response["Error"]["Code"]
            if code not in ("TransactionCanceledException", "ConditionalCheckFailed"):
                raise GuardRefusal("ceiling_unavailable") from exc
            if self._holds(lease_id):
                return
            reasons = exc.response.get("CancellationReasons") or []
            if any(reason.get("Code") == "TransactionConflict" for reason in reasons):
                # Another writer was mid-transaction: the ceiling could not be
                # read, which is not the same as having no room.
                raise GuardRefusal("ceiling_unavailable") from exc
            raise GuardRefusal("ceiling_reached") from exc
        except Exception as exc:  # noqa: BLE001
            raise GuardRefusal("ceiling_unavailable") from exc

    def _holds(self, lease_id: str) -> bool:
        lease = self._table.get_item(Key={"ledger_key": f"lease#{lease_id}"}).get(
            "Item"
        )
        slot = self._table.get_item(Key={"ledger_key": "slot"}).get("Item") or {}
        return bool(lease) and slot.get("holder") == lease_id

    def finish(self, lease_id: str, *, ran: bool) -> None:
        """Free the slot and the lease; give the amount back if nothing ran."""
        lease = self._table.get_item(Key={"ledger_key": f"lease#{lease_id}"}).get(
            "Item"
        )
        if not lease:
            return
        transaction: list[dict[str, Any]] = [
            {
                "Delete": {
                    "TableName": self._name,
                    "Key": {"ledger_key": {"S": f"lease#{lease_id}"}},
                    "ConditionExpression": "attribute_exists(ledger_key)",
                }
            }
        ]
        slot = self._table.get_item(Key={"ledger_key": "slot"}).get("Item") or {}
        if slot.get("holder") == lease_id:
            transaction.append(
                self._update(
                    "slot",
                    "REMOVE holder, holder_expires",
                    "holder = :lease",
                    {":lease": {"S": lease_id}},
                )
            )
        if not ran:
            for field in ("day", "month"):
                transaction.append(
                    self._update(
                        str(lease[field]),
                        "ADD spent :refund",
                        "attribute_exists(spent)",
                        {":refund": self._n(-Decimal(lease["amount"]))},
                    )
                )
        try:
            self._client.transact_write_items(TransactItems=transaction)
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "TransactionCanceledException":
                raise
            # Another finisher got there first; the lease is already gone.
