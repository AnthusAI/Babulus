"""Run the deployed fallback state machine against mocked AWS.

The machine definition is synthesized from the real CDK stack, so what runs
here is what would be deployed. A small interpreter walks its states with a
fake clock: ``Wait`` advances the clock, the fallback gate Lambda runs
against moto tables, and ``SubmitGpuJob`` only records the call. Nothing
reaches AWS, Batch or a clock.
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

CONTROL_PLANE = Path(__file__).resolve().parents[4] / "packages" / "control-plane"


def synthesize_fallback_definition() -> dict[str, Any]:
    """Synthesize the backend stack and return the fallback state machine."""
    if str(CONTROL_PLANE) not in sys.path:
        sys.path.insert(0, str(CONTROL_PLANE))
    from aws_cdk import App, Environment
    from aws_cdk.assertions import Template
    from stacks.backend import BackendStack

    stack = BackendStack(
        App(),
        "FallbackSpecBackend",
        env=Environment(account="111122223333", region="us-east-1"),
    )
    machines = Template.from_stack(stack).find_resources(
        "AWS::StepFunctions::StateMachine"
    )
    for machine in machines.values():
        parts = machine["Properties"]["DefinitionString"]["Fn::Join"][1]
        definition = json.loads(
            "".join(part if isinstance(part, str) else "TOKEN" for part in parts)
        )
        if "SubmitGpuJob" in definition["States"]:
            return definition
    raise AssertionError("no state machine submits the Batch GPU job")


class FakeClock:
    """A controllable clock that fires scheduled events as time passes."""

    def __init__(self, start: int = 1_800_000_000) -> None:
        self.now = start
        self._events: list[tuple[int, Callable[[], None]]] = []

    def time(self) -> float:
        """Return the current fake epoch second."""
        return float(self.now)

    def at(self, when: int, action: Callable[[], None]) -> None:
        """Run ``action`` when the clock reaches ``when``."""
        self._events.append((when, action))

    def advance(self, seconds: int) -> None:
        """Move time forward, running due events in order at their own times."""
        target = self.now + max(0, int(seconds))
        while True:
            due = sorted(
                (e for e in self._events if e[0] <= target), key=lambda e: e[0]
            )
            if not due:
                break
            when, action = due[0]
            self._events.remove(due[0])
            self.now = max(self.now, when)
            action()
        self.now = target


def _resolve(path: str, data: dict[str, Any]) -> Any:
    value: Any = data
    for part in path.removeprefix("$.").split("."):
        value = value[part]
    return value


def _resolve_params(value: Any, data: dict[str, Any], clock: FakeClock) -> Any:
    """Resolve ``.$`` references in a state's parameters."""
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if key.endswith(".$"):
                if item == "$$.State.EnteredTime":
                    out[key[:-2]] = time.strftime(
                        "%Y-%m-%dT%H:%M:%SZ", time.gmtime(clock.now)
                    )
                else:
                    out[key[:-2]] = _resolve(item, data)
            else:
                out[key] = _resolve_params(item, data, clock)
        return out
    return value


def _compare(rule: dict[str, Any], data: dict[str, Any]) -> bool:
    actual = _resolve(rule["Variable"], data)
    if "StringEquals" in rule:
        return actual == rule["StringEquals"]
    raise AssertionError(f"unsupported choice rule {rule}")


@dataclass
class Execution:
    """One run of the fallback machine."""

    visited: list[str] = field(default_factory=list)
    outcome: str = ""
    data: dict[str, Any] = field(default_factory=dict)


def run_machine(
    definition: dict[str, Any],
    execution_input: dict[str, Any],
    *,
    clock: FakeClock,
    gate: Callable[[dict[str, Any]], dict[str, Any]],
    submit: Callable[[dict[str, Any]], None],
    start_at: str | None = None,
    dynamo: Callable[[dict[str, Any]], None] | None = None,
    max_steps: int = 500,
) -> Execution:
    """Interpret the fallback machine until it ends.

    :param definition: The synthesized state machine.
    :param execution_input: The timer's input (content hash, job token, ...).
    :param clock: The fake clock that ``Wait`` states advance.
    :param gate: Runs the gate Lambda for a payload and returns its result.
    :param submit: Called with the Batch container environment on submit.
    :param dynamo: Runs a DynamoDB ``UpdateItem`` task with its resolved
        parameters; it may raise, which follows the state's ``Catch``.
    :param start_at: Begin at this state instead of the machine's first one
        (a timer that has already waited out its race window).
    :returns: The visited states and how the execution ended.
    """
    states = definition["States"]
    execution = Execution(data=dict(execution_input))
    name = start_at or definition["StartAt"]
    for _ in range(max_steps):
        execution.visited.append(name)
        state = states[name]
        kind = state["Type"]
        if kind == "Wait":
            if "SecondsPath" in state:
                seconds = int(_resolve(state["SecondsPath"], execution.data))
            else:
                seconds = int(state["Seconds"])
            clock.advance(seconds)
        elif (
            kind == "Task"
            and "JobDefinition" not in state["Parameters"]
            and "UpdateExpression" not in state["Parameters"]
        ):
            payload = {
                key.removesuffix(".$"): (
                    _resolve(value, execution.data) if key.endswith(".$") else value
                )
                for key, value in state["Parameters"].items()
            }
            try:
                execution.data["gate"] = gate(payload)
            except Exception:  # noqa: BLE001 - any gate error must stop the run
                name = state["Catch"][0]["Next"]
                continue
        elif kind == "Task" and "UpdateExpression" in state["Parameters"]:
            assert dynamo is not None, "no DynamoDB stand-in given"
            try:
                dynamo(_resolve_params(state["Parameters"], execution.data, clock))
            except Exception:  # noqa: BLE001 - follows the state's Catch
                name = state["Catch"][0]["Next"]
                continue
        elif kind == "Task":
            env = {
                item["Name"]: (
                    _resolve(item["Value.$"], execution.data)
                    if "Value.$" in item
                    else item["Value"]
                )
                for item in state["Parameters"]["ContainerOverrides"]["Environment"]
            }
            try:
                submit(env)
            except Exception as exc:  # noqa: BLE001 - follows the state's Catch
                execution.data["submit_error"] = str(exc)
                name = state["Catch"][0]["Next"]
                continue
            execution.data["batch"] = {"JobId": "spec-batch-job"}
        elif kind == "Choice":
            for choice in state["Choices"]:
                if _compare(choice, execution.data):
                    name = choice["Next"]
                    break
            else:
                name = state["Default"]
            continue
        elif kind == "Succeed":
            execution.outcome = f"succeeded:{name}"
            return execution
        elif kind == "Fail":
            execution.outcome = f"failed:{name}"
            return execution
        else:
            raise AssertionError(f"unsupported state {name}: {state}")
        if state.get("End"):
            execution.outcome = f"ended:{name}"
            return execution
        name = state["Next"]
    raise AssertionError(f"machine did not end: {execution.visited[-10:]}")
