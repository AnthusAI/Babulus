"""Shared fixtures for router Lambda tests.

Puts the ``packages/speech/features`` directory on ``sys.path`` so tests mint
operator tokens with the same ``support.operator_tokens`` helper the behave
specs use, which also puts the operator auth layer on ``sys.path``.
"""

import importlib
import json
import os
import sys
from typing import Any
from unittest.mock import Mock

import boto3
import pytest
from moto import mock_aws

FEATURES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "speech", "features"
)
if FEATURES_PATH not in sys.path:
    sys.path.insert(0, FEATURES_PATH)


@pytest.fixture(autouse=True)
def no_network(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make any attempt to open a network connection fail the test.

    Paid services are replaced by mocks everywhere in this suite; this makes
    a test that forgot one fail instead of reaching the real service.
    """

    def refuse(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("tests must never open a network connection")

    monkeypatch.setattr("socket.socket.connect", refuse)
    # Never pick up a developer's real AWS profile or credentials.
    for name in ("AWS_PROFILE", "AWS_SESSION_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test-secret")
    monkeypatch.setenv("AWS_CONFIG_FILE", os.devnull)
    monkeypatch.setenv("AWS_SHARED_CREDENTIALS_FILE", os.devnull)


@pytest.fixture
def router_resources() -> dict[str, Any]:
    """Provide mocked AWS resources, environment, and API event builders."""
    with mock_aws():
        dynamodb = boto3.client("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="jobs",
            KeySchema=[{"AttributeName": "content_hash", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "content_hash", "AttributeType": "S"},
                {"AttributeName": "status", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "status-created_at-index",
                    "KeySchema": [
                        {"AttributeName": "status", "KeyType": "HASH"},
                        {"AttributeName": "created_at", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 1,
                        "WriteCapacityUnits": 1,
                    },
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        dynamodb.create_table(
            TableName="sites",
            KeySchema=[{"AttributeName": "site_id", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "site_id", "AttributeType": "S"},
                {"AttributeName": "site_key", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "site_key-index",
                    "KeySchema": [{"AttributeName": "site_key", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 1,
                        "WriteCapacityUnits": 1,
                    },
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="audio")
        os.environ.update(
            {
                "JOBS_TABLE": "jobs",
                "SITES_TABLE": "sites",
                "AUDIO_BUCKET": "audio",
                "CLOUDFRONT_DOMAIN": "audio.example.com",
                "FALLBACK_STATE_MACHINE_ARN": "arn:aws:states:us-east-1:123456789012:stateMachine:fallback",
                "FALLBACK_SECONDS": "900",
                "DAILY_SITE_QUOTA": "100",
                "BATCH_JOB_QUEUE_NAME": "test-queue",
                "AWS_DEFAULT_REGION": "us-east-1",
            }
        )
        sites = boto3.resource("dynamodb", region_name="us-east-1").Table("sites")
        sites.put_item(
            Item={
                "site_id": "site-1",
                "site_key": "test-key-123",
                "origin": "https://example.com",
                "allowed_origins": ["https://example.com"],
                "daily_quota": 100,
                "disabled": False,
            }
        )
        sys.modules.pop("handler", None)
        sys.path.insert(
            0, os.path.join(os.path.dirname(__file__), "..", "lambdas", "router")
        )
        handler = importlib.import_module("handler")
        handler._sfn = Mock()
        handler._batch = Mock()

        def event(
            method: str,
            path: str,
            *,
            body: dict[str, Any] | None = None,
            headers: dict[str, str] | None = None,
            path_parameters: dict[str, str] | None = None,
            query_string_parameters: dict[str, str] | None = None,
        ) -> dict[str, Any]:
            """Build an API Gateway HTTP API v2 event."""
            return {
                "requestContext": {"http": {"method": method}},
                "rawPath": path,
                "headers": headers or {},
                "body": json.dumps(body) if body is not None else None,
                "pathParameters": path_parameters,
                "queryStringParameters": query_string_parameters,
            }

        def response_body(response: dict[str, Any]) -> dict[str, Any]:
            """Decode a router response body."""
            return json.loads(response["body"])

        yield {
            "handler": handler,
            "jobs": boto3.resource("dynamodb", region_name="us-east-1").Table("jobs"),
            "sites": sites,
            "event": event,
            "response_body": response_body,
        }
        sys.path.remove(
            os.path.join(os.path.dirname(__file__), "..", "lambdas", "router")
        )
