from __future__ import annotations

from typing import Any

from ..rules import Trigger, rule_matches_event, has_time_trigger


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    lead = event.get("lead") or {}
    event_type = event.get("eventType")
    rules = event.get("rules") or []
    triggers = event.get("triggers") or []

    triggers_by_rule: dict[str, list[Trigger]] = {}
    for raw in triggers:
        rule_id = raw.get("ruleId")
        if not rule_id:
            continue
        triggers_by_rule.setdefault(rule_id, []).append(
            Trigger(
                type=raw.get("type"),
                event_type=raw.get("eventType"),
                delay_seconds=raw.get("delaySeconds"),
                attribute_key=raw.get("attributeKey"),
                operator=raw.get("operator"),
                attribute_value=raw.get("attributeValue"),
            )
        )

    matched_rules: list[dict[str, Any]] = []
    pending_time_rules: list[dict[str, Any]] = []

    for rule in rules:
        rule_id = rule.get("id")
        rule_triggers = triggers_by_rule.get(rule_id, [])

        if has_time_trigger(rule_triggers):
            pending_time_rules.append(rule)

        if event_type and rule_matches_event(rule_triggers, event_type, lead):
            matched_rules.append(rule)

    return {"matchedRules": matched_rules, "pendingTimeRules": pending_time_rules}
