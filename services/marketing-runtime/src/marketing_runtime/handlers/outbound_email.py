from __future__ import annotations

import datetime
from typing import Any

import boto3

from ..config import get_optional_env
from ..graphql_client import GraphQLClient

CREATE_INTERACTION_MUTATION = """
mutation CreateMarketingInteraction($input: CreateMarketingInteractionInput!) {
  createMarketingInteraction(input: $input) {
    id
  }
}
"""


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    ses_region = get_optional_env("SES_REGION", "us-east-1")
    ses_client = boto3.client("ses", region_name=ses_region)

    to_address = event["toAddress"]
    subject = event["subject"]
    body_text = event.get("bodyText", "")
    body_html = event.get("bodyHtml")
    source = event.get("source")

    response = ses_client.send_email(
        Source=source,
        Destination={"ToAddresses": [to_address]},
        Message={
            "Subject": {"Data": subject},
            "Body": {
                "Text": {"Data": body_text},
                **({"Html": {"Data": body_html}} if body_html else {}),
            },
        },
    )

    lead_id = event.get("leadId")
    program_id = event.get("programId")
    enrollment_id = event.get("enrollmentId")

    if lead_id:
        client = GraphQLClient.from_env()
        occurred_at = datetime.datetime.utcnow().isoformat() + "Z"
        client.execute(
            CREATE_INTERACTION_MUTATION,
            {
                "input": {
                    "leadId": lead_id,
                    "programId": program_id,
                    "enrollmentId": enrollment_id,
                    "channel": "email",
                    "direction": "outbound",
                    "subject": subject,
                    "body": body_text or body_html,
                    "messageId": response.get("MessageId"),
                    "occurredAt": occurred_at,
                }
            },
        )

    return {"ok": True, "messageId": response.get("MessageId")}
