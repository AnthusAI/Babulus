from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Iterable

import requests

from .errors import CompileError


@dataclass(frozen=True)
class PronunciationRule:
    string_to_replace: str
    type: str  # "phoneme" | "alias"
    phoneme: str | None = None
    alphabet: str | None = None
    alias: str | None = None

    def to_api(self) -> dict[str, Any]:
        if self.type == "phoneme":
            if not self.phoneme or not self.alphabet:
                raise CompileError("Phoneme rule requires phoneme and alphabet")
            return {
                "string_to_replace": self.string_to_replace,
                "type": "phoneme",
                "phoneme": self.phoneme,
                "alphabet": self.alphabet,
            }
        if self.type == "alias":
            if not self.alias:
                raise CompileError("Alias rule requires alias")
            return {
                "string_to_replace": self.string_to_replace,
                "type": "alias",
                "alias": self.alias,
            }
        raise CompileError(f"Unknown pronunciation rule type: {self.type}")


def rules_hash(rules: list[PronunciationRule]) -> str:
    payload = [r.to_api() for r in rules]
    data = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _headers(api_key: str) -> dict[str, str]:
    return {"xi-api-key": api_key, "accept": "application/json"}


def _post(base_url: str, api_key: str, path: str, payload: dict[str, Any], timeout: int = 60) -> dict[str, Any]:
    r = requests.post(
        f"{base_url}{path}",
        headers=_headers(api_key),
        json=payload,
        timeout=timeout,
    )
    if r.status_code >= 400:
        raise CompileError(f"ElevenLabs pronunciation API failed ({r.status_code}): {r.text[:400]}")
    obj = r.json()
    if not isinstance(obj, dict):
        raise CompileError("Unexpected ElevenLabs response")
    return obj


def _get(base_url: str, api_key: str, path: str, timeout: int = 60) -> dict[str, Any]:
    r = requests.get(
        f"{base_url}{path}",
        headers=_headers(api_key),
        timeout=timeout,
    )
    if r.status_code >= 400:
        raise CompileError(f"ElevenLabs pronunciation API failed ({r.status_code}): {r.text[:400]}")
    obj = r.json()
    if not isinstance(obj, dict):
        raise CompileError("Unexpected ElevenLabs response")
    return obj


def find_dictionary_by_name(base_url: str, api_key: str, name: str) -> tuple[str, str] | None:
    # Returns (dictionary_id, latest_version_id)
    data = _get(base_url, api_key, "/v1/pronunciation-dictionaries", timeout=60)
    items = data.get("pronunciation_dictionaries")
    if not isinstance(items, list):
        return None
    for item in items:
        if not isinstance(item, dict):
            continue
        if item.get("name") == name and isinstance(item.get("id"), str) and isinstance(
            item.get("latest_version_id"), str
        ):
            return item["id"], item["latest_version_id"]
    return None


def ensure_dictionary_from_rules(
    *,
    base_url: str,
    api_key: str,
    name: str,
    rules: list[PronunciationRule],
    manifest: dict[str, Any],
    workspace_access: str | None = None,
    description: str | None = None,
) -> tuple[str, str]:
    """
    Ensure a pronunciation dictionary exists and reflects the desired rules.

    Uses the local manifest to avoid fetching full rule sets from ElevenLabs.
    Strategy:
      - If no cached dict_id/version: create a new dictionary from rules.
      - If rules hash changed: remove all prior graphemes and add current ones (idempotent for "DSL is source of truth").
    Returns (dictionary_id, version_id).
    """
    if not rules:
        raise CompileError("No pronunciation rules provided")

    want_hash = rules_hash(rules)
    state = manifest.setdefault("elevenlabs_pronunciation", {})
    if not isinstance(state, dict):
        raise CompileError("Invalid manifest pronunciation section")

    cached_name = state.get("name")
    cached_id = state.get("dictionary_id")
    cached_version = state.get("version_id")
    cached_hash = state.get("rules_hash")
    cached_graphemes = state.get("graphemes")

    # If manifest doesn't have a dictionary, try find by name (useful when moving output dirs).
    if not isinstance(cached_id, str) or cached_name != name:
        found = find_dictionary_by_name(base_url, api_key, name)
        if found is not None:
            cached_id, cached_version = found
            cached_name = name

    if not isinstance(cached_id, str):
        payload: dict[str, Any] = {
            "name": name,
            "rules": [r.to_api() for r in rules],
        }
        if description is not None:
            payload["description"] = description
        if workspace_access is not None:
            payload["workspace_access"] = workspace_access
        resp = _post(base_url, api_key, "/v1/pronunciation-dictionaries/add-from-rules", payload, timeout=120)
        did = resp.get("id")
        vid = resp.get("version_id")
        if not isinstance(did, str) or not isinstance(vid, str):
            raise CompileError("Unexpected ElevenLabs create pronunciation dictionary response")
        state.update(
            {
                "name": name,
                "dictionary_id": did,
                "version_id": vid,
                "rules_hash": want_hash,
                "graphemes": sorted({r.string_to_replace for r in rules}),
            }
        )
        return did, vid

    # Up to date?
    if cached_hash == want_hash and isinstance(cached_version, str):
        return cached_id, cached_version

    # If we don't know the previous graphemes, conservatively do a full re-create by name.
    if not isinstance(cached_graphemes, list) or not all(isinstance(x, str) for x in cached_graphemes):
        payload = {"name": name, "rules": [r.to_api() for r in rules]}
        resp = _post(base_url, api_key, "/v1/pronunciation-dictionaries/add-from-rules", payload, timeout=120)
        did = resp.get("id")
        vid = resp.get("version_id")
        if not isinstance(did, str) or not isinstance(vid, str):
            raise CompileError("Unexpected ElevenLabs create pronunciation dictionary response")
        state.update(
            {
                "name": name,
                "dictionary_id": did,
                "version_id": vid,
                "rules_hash": want_hash,
                "graphemes": sorted({r.string_to_replace for r in rules}),
            }
        )
        return did, vid

    # Remove all previous graphemes, then add desired ones.
    # This keeps the cloud dictionary aligned with the DSL as the single source of truth.
    remove_payload = {"rule_strings": list(cached_graphemes)}
    _post(
        base_url,
        api_key,
        f"/v1/pronunciation-dictionaries/{cached_id}/remove-rules",
        remove_payload,
        timeout=120,
    )
    add_payload = {"rules": [r.to_api() for r in rules]}
    add_resp = _post(
        base_url,
        api_key,
        f"/v1/pronunciation-dictionaries/{cached_id}/add-rules",
        add_payload,
        timeout=120,
    )
    vid = add_resp.get("version_id")
    if not isinstance(vid, str):
        raise CompileError("Unexpected ElevenLabs add-rules response")
    state.update(
        {
            "name": name,
            "dictionary_id": cached_id,
            "version_id": vid,
            "rules_hash": want_hash,
            "graphemes": sorted({r.string_to_replace for r in rules}),
        }
    )
    return cached_id, vid

