"""Steps for the Batch runner's claim keeping."""

from __future__ import annotations

import importlib.util
import sys
import threading
from pathlib import Path
from unittest.mock import patch

import httpx
from behave import given, then, when

RUNNER_PATH = (
    Path(__file__).resolve().parents[4]
    / "packages"
    / "worker-image"
    / "src"
    / "runner.py"
)
ENVIRONMENT = {
    "API_URL": "https://api.auritus.test",
    "JOB_HASH": "claim-job-hash",
    "JOB_TOKEN": "worker-token",
    "AURITUS_CLAIM_TOKEN": "reserved-token",
    "AWS_BATCH_JOB_ID": "spec-batch-job",
}


def _runner():
    spec = importlib.util.spec_from_file_location("claim_keeping_runner", RUNNER_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _answer(spec: str):
    """Turn a described answer into a response or an exception."""
    if spec == "a dropped connection":
        return httpx.ConnectError("connection dropped")
    if spec == "a timeout":
        return httpx.ReadTimeout("timed out")
    return int(spec)


@given("the API answers claim renewals with {answers}")
def step_answers(context, answers: str) -> None:
    context.answers = [_answer(part.strip()) for part in answers.split(" then ")]


def _response(answer, url: str) -> httpx.Response:
    return httpx.Response(answer, json={}, request=httpx.Request("PUT", url))


@when("the Batch worker keeps its claim for a few beats")
def step_keep(context) -> None:
    runner = _runner()
    context.renewals = 0
    exits: list[int] = []
    stop = threading.Event()
    lost = threading.Event()
    done = threading.Event()

    def put(url, **_kwargs):
        index = min(context.renewals, len(context.answers) - 1)
        context.renewals += 1
        answer = context.answers[index]
        if context.renewals >= 6:
            stop.set()
        if isinstance(answer, Exception):
            raise answer
        return _response(answer, url)

    def exit_process(code: int) -> None:
        exits.append(code)

    def run() -> None:
        with patch.object(runner.httpx, "put", put):
            runner._keep_claim(
                "https://api.auritus.test",
                "claim-job-hash",
                {},
                owner="batch:spec",
                claim_token="reserved-token",
                stop=stop,
                lost=lost,
                interval=0.01,
                exit_process=exit_process,
            )
        done.set()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    # Stop after a handful of beats even when nothing ends the loop.
    threading.Timer(0.5, stop.set).start()
    assert done.wait(3), "the keeper never returned"
    context.exits = exits
    context.lost = lost.is_set()


@then("the process was ended with a non-zero code")
def step_ended(context) -> None:
    assert context.exits and context.exits[0] != 0, context.exits


@then("the claim was reported lost")
def step_lost(context) -> None:
    assert context.lost


@then("the process was not ended")
def step_not_ended(context) -> None:
    assert context.exits == [], context.exits
    assert not context.lost


@then("renewals kept being attempted")
def step_kept(context) -> None:
    assert context.renewals >= 3, context.renewals


@given("the API refuses the claim with {status:d}")
def step_refuses(context, status: int) -> None:
    context.refusal = status


def _claim_put(context, requests: list):
    def put(url, **kwargs):
        requests.append((url, kwargs.get("json")))
        if url.endswith("/claim"):
            return _response(context.refusal, url)
        return httpx.Response(200, json={}, request=httpx.Request("PUT", url))

    return put


@when("the Batch worker takes its claim")
def step_take(context) -> None:
    runner = _runner()
    with patch.object(runner.httpx, "put", _claim_put(context, [])):
        context.take = runner.take_claim(
            "https://api.auritus.test",
            "claim-job-hash",
            {},
            owner="batch:spec",
            claim_token="reserved-token",
        )


@then("it is not held and the refusal status is {status:d}")
def step_not_held(context, status: int) -> None:
    assert context.take == (False, None, status), context.take


@when("the reserved Batch worker starts")
def step_starts(context) -> None:
    runner = _runner()
    context.requests = []
    body = {"bearer": "b", "text": "Some text.", "tts_backend": "kokoro"}

    def post(url, **_kwargs):
        return httpx.Response(200, json=body, request=httpx.Request("POST", url))

    with (
        patch.dict("os.environ", ENVIRONMENT),
        patch.object(runner.httpx, "post", post),
        patch.object(runner.httpx, "put", _claim_put(context, context.requests)),
        patch.object(runner, "_install_backend", lambda name: None),
    ):
        context.exit_code = runner.main()


@then("the reserved Batch worker exits with status {code:d}")
def step_exit(context, code: int) -> None:
    assert context.exit_code == code, context.exit_code


@then("the reserved Batch worker reports no failure")
def step_no_failure(context) -> None:
    assert not [r for r in context.requests if r[0].endswith("/failed")]


@then('the reserved Batch worker reports a failure with claim token "{token}"')
def step_failure(context, token: str) -> None:
    failed = [r for r in context.requests if r[0].endswith("/failed")]
    assert len(failed) == 1, context.requests
    assert failed[0][1]["claim_token"] == token, failed
