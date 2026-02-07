from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Trigger:
    type: str
    event_type: str | None = None
    delay_seconds: int | None = None
    attribute_key: str | None = None
    operator: str | None = None
    attribute_value: str | None = None


def evaluate_attribute_condition(trigger: Trigger, lead: dict[str, Any]) -> bool:
    key = trigger.attribute_key or ""
    value = lead.get(key)
    op = trigger.operator or "eq"

    if op == "exists":
        return value is not None
    if op == "not_exists":
        return value is None

    if value is None:
        return False

    if isinstance(value, bool):
        value_str = str(value).lower()
    else:
        value_str = str(value)
    target = trigger.attribute_value or ""

    if op == "eq":
        return value_str == target
    if op == "neq":
        return value_str != target
    if op == "contains":
        return target in value_str

    return False


def rule_matches_event(triggers: list[Trigger], event_type: str, lead: dict[str, Any]) -> bool:
    event_triggers = [t for t in triggers if t.type == "event"]
    if not event_triggers:
        return False
    if not any(t.event_type == event_type for t in event_triggers):
        return False

    attribute_triggers = [t for t in triggers if t.type == "attribute"]
    for trigger in attribute_triggers:
        if not evaluate_attribute_condition(trigger, lead):
            return False

    return True


def has_time_trigger(triggers: list[Trigger]) -> bool:
    return any(t.type == "time" for t in triggers)
