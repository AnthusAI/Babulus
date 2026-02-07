from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

from .config import get_env


@dataclass
class GraphQLClient:
    endpoint: str
    api_key: str

    @classmethod
    def from_env(cls) -> "GraphQLClient":
        return cls(
            endpoint=get_env("MARKETING_GQL_ENDPOINT"),
            api_key=get_env("MARKETING_GQL_API_KEY"),
        )

    def execute(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        response = requests.post(
            self.endpoint,
            json={"query": query, "variables": variables or {}},
            headers={"x-api-key": self.api_key},
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        if "errors" in payload:
            raise RuntimeError(f"GraphQL errors: {payload['errors']}")
        return payload.get("data", {})
