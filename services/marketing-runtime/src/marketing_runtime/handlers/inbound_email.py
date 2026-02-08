from __future__ import annotations

import datetime
import hashlib
import json
from typing import Any

from ..graphql_client import GraphQLClient

CREATE_LEAD_MUTATION = """
mutation CreateMarketingLead($input: CreateMarketingLeadInput!) {
  createMarketingLead(input: $input) {
    id
  }
}
"""

CREATE_INTERACTION_MUTATION = """
mutation CreateMarketingInteraction($input: CreateMarketingInteractionInput!) {
  createMarketingInteraction(input: $input) {
    id
  }
}
"""


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _lead_id_for(email: str) -> str:
    normalized = _normalize_email(email)
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return f"lead_{digest}"


def _extract_ses_mail(event: dict[str, Any]) -> dict[str, Any]:
    records = event.get("Records", [])
    if not records:
        raise ValueError("No SES records found.")
    ses = records[0].get("ses", {})
    return ses.get("mail", {})


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    mail = _extract_ses_mail(event)
    headers = mail.get("commonHeaders", {})
    from_address = (headers.get("from") or [""])[0]
    subject = headers.get("subject")
    message_id = mail.get("messageId")

    if not from_address:
        raise ValueError("Missing from address.")

    lead_id = _lead_id_for(from_address)
    client = GraphQLClient.from_env()

    try:
        client.execute(
            CREATE_LEAD_MUTATION,
            {
                "input": {
                    "id": lead_id,
                    "email": _normalize_email(from_address),
                    "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
                }
            },
        )
    except Exception:
        # Lead already exists or create failed; continue to log interaction.
        pass

    client.execute(
        CREATE_INTERACTION_MUTATION,
        {
            "input": {
                "leadId": lead_id,
                "channel": "email",
                "direction": "inbound",
                "subject": subject,
                "body": None,
                "messageId": message_id,
                "occurredAt": datetime.datetime.utcnow().isoformat() + "Z",
                "metadata": json.dumps({"from": from_address}),
            }
        },
    )

    return {"ok": True, "leadId": lead_id}
