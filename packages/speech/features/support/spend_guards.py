"""Stand-ins for the spending guards, so specs never reach a paid service.

Everything here is local: DynamoDB is moto, Batch is a ``Mock``, and Prospectus
is ``FakeProspectus``, a recorder that answers like the quota HTTP contract.
Nothing opens a socket or calls AWS. The limits are made-up numbers that exist
only in these specs.
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from unittest.mock import Mock, patch

import boto3

CONTROL_PLANE = Path(__file__).resolve().parents[4] / "packages" / "control-plane"
LAMBDAS = CONTROL_PLANE / "lambdas"
LAYER_PATH = LAMBDAS / "spend_guards_layer" / "python"

ACCOUNT = "account-spec"
SITE_ID = "site-fencing"
ENDPOINT = "https://quota.spec.test/prod"
ROLE_ARN = "arn:aws:iam::111122223333:role/spec-quota-caller"
# Made-up numbers for the specs: one attempt costs 2 * 1800 vCPU seconds at
# the made-up rate, and each limit is a multiple of that.
SPEC_ENVIRONMENT = {
    "PROSPECTUS_QUOTA_ENDPOINT": ENDPOINT,
    "PROSPECTUS_CALLER_ROLE_ARN": ROLE_ARN,
    "SPEND_CEILING_PER_ATTEMPT": "10",
    "SPEND_CEILING_PER_DAY": "25",
    "SPEND_CEILING_PER_MONTH": "60",
    "SPEND_ESTIMATE_RATE_PER_VCPU_SECOND": "0.001",
    "BUDGET_GUARD_CONFIGURED": "1",
    "JOB_VCPUS": "2",
    "ATTEMPT_TIMEOUT_SECONDS": "1800",
    "BATCH_RETRY_ATTEMPTS": "1",
    "MAX_CLOUD_ATTEMPTS": "3",
    "BATCH_JOB_QUEUE_NAME": "spec-queue",
    "AWS_CONFIG_FILE": os.devnull,
    "AWS_SHARED_CREDENTIALS_FILE": os.devnull,
    "AWS_ACCESS_KEY_ID": "spec-key",
    "AWS_SECRET_ACCESS_KEY": "spec-secret",
}


def _refuse_network(*_args: Any, **_kwargs: Any) -> None:
    raise AssertionError("specs must never open a network connection")


class FakeCredentials:
    """Credentials that sign nothing real."""

    access_key = "spec-key"
    secret_key = "spec-secret"
    token = "spec-token"

    def get_frozen_credentials(self) -> "FakeCredentials":
        return self


@dataclass
class FakeProspectus:
    """Answers the quota contract and records every call it receives."""

    mode: str = "ok"
    calls: list[dict[str, Any]] = field(default_factory=list)
    reservations: dict[str, dict[str, Any]] = field(default_factory=dict)

    def transport(
        self, method: str, url: str, headers: dict[str, str], body: bytes
    ) -> tuple[int, bytes]:
        """Stand in for the HTTPS call."""
        payload = json.loads(body)
        route = url.removeprefix(ENDPOINT)
        self.calls.append({"route": route, "body": payload, "headers": headers})
        if self.mode == "unreachable":
            raise ConnectionError("no route to Prospectus")
        if self.mode == "garbage":
            return 200, b"not json at all"
        if self.mode == "unexpected":
            return 200, json.dumps({"status": "something_else"}).encode()
        if self.mode == "empty":
            return 402, json.dumps({"error": "quota_exhausted"}).encode()
        if self.mode == "down":
            return 503, json.dumps({"error": "quota_unavailable"}).encode()
        return self._answer(route, payload)

    def _answer(self, route: str, payload: dict[str, Any]) -> tuple[int, bytes]:
        parts = route.strip("/").split("/")
        if parts[-1] == "reservations":
            operation = payload["operationId"]
            self.reservations.setdefault(
                operation, {"items": payload["items"], "state": "reserved"}
            )
            return (
                200,
                json.dumps(
                    {
                        "reservationId": operation,
                        "accountId": parts[3],
                        "status": "reserved",
                        "expiresAt": "2030-01-01T00:00:00Z",
                    }
                ).encode(),
            )
        reservation, action = parts[-2], parts[-1]
        entry = self.reservations.setdefault(reservation, {"state": "reserved"})
        entry["state"] = "settled" if action == "settle" else "released"
        entry["final_items"] = payload.get("items", [])
        return (
            200,
            json.dumps(
                {
                    "reservationId": reservation,
                    "accountId": parts[3],
                    "status": entry["state"],
                }
            ).encode(),
        )

    def routes(self, suffix: str) -> list[dict[str, Any]]:
        """Calls whose route ends with ``suffix``."""
        return [call for call in self.calls if call["route"].endswith(suffix)]


def _load(name: str, relative: str) -> Any:
    if str(LAYER_PATH) not in sys.path:
        sys.path.insert(0, str(LAYER_PATH))
    spec = importlib.util.spec_from_file_location(name, LAMBDAS / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@dataclass
class Guards:
    """The loaded guard modules and their stand-ins."""

    prospectus: FakeProspectus
    batch: Mock
    ceiling_table: Any
    module: Any


def install_guards(context, gate: Any, router: Any, clock: Any = None) -> Guards:
    """Wire a loaded fallback gate to local stand-ins and make cloud allowed.

    Creates the ceiling table, registers an Account with cloud enabled for the
    spec job's site, and points the gate's Prospectus client at the fake.
    """
    environment = patch.dict(os.environ, SPEC_ENVIRONMENT)
    environment.start()
    context.add_cleanup(environment.stop)
    # A spec that tried to reach a real service would fail here, not spend.
    block = patch("socket.socket.connect", _refuse_network)
    block.start()
    context.add_cleanup(block.stop)
    suffix = uuid.uuid4().hex[:12]
    table_name = f"spec-ceiling-{suffix}"
    os.environ["SPEND_CEILING_TABLE"] = table_name
    os.environ["SITES_TABLE"] = router.sites_table.name
    os.environ["JOBS_TABLE"] = router.jobs_table.name
    boto3.client("dynamodb", region_name="us-east-1").create_table(
        TableName=table_name,
        KeySchema=[{"AttributeName": "ledger_key", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "ledger_key", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    router.sites_table.put_item(
        Item={
            "site_id": SITE_ID,
            "site_key": "spec-site-key",
            "allowed_origins": ["https://example.com"],
            "daily_quota": 100,
            "disabled": False,
            "cloud_enabled": True,
            "account_id": ACCOUNT,
        }
    )
    prospectus = FakeProspectus()
    babulus = sys.modules["babulus_spend_guards"]
    gate._quota_client = lambda settings: babulus.ProspectusQuota(
        settings.quota,
        transport=prospectus.transport,
        credentials=lambda: FakeCredentials(),
        sleep=lambda _seconds: None,
    )
    finisher = load_finisher()
    finisher._quota_client = lambda: babulus.ProspectusQuota(
        babulus.QuotaConfig.from_environment(),
        transport=prospectus.transport,
        credentials=lambda: FakeCredentials(),
        sleep=lambda _seconds: None,
    )
    context.finisher = finisher
    batch = Mock()
    batch.describe_job_queues.return_value = {"jobQueues": [{"state": "ENABLED"}]}
    gate._batch = batch
    return Guards(
        prospectus=prospectus,
        batch=batch,
        ceiling_table=boto3.resource("dynamodb", region_name="us-east-1").Table(
            table_name
        ),
        module=gate,
    )


def load_gate() -> Any:
    """Load a fresh copy of the fallback gate."""
    return _load("fallback_gate_handler", "fallback_gate/handler.py")


def load_budget_guard() -> Any:
    """Load a fresh copy of the budget guard (Batch is replaced by the spec)."""
    with patch.dict(os.environ, {"AWS_DEFAULT_REGION": "us-east-1"}):
        return _load("budget_guard_handler", "budget_guard/handler.py")


def load_finisher() -> Any:
    """Load a fresh copy of the quota finisher."""
    return _load("quota_finish_handler", "quota_finish/handler.py")
