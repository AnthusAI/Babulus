"""Steps that check the synthesized backend's hard limits and guard wiring."""

from __future__ import annotations

import sys

from behave import given, then
from support.fallback_machine import CONTROL_PLANE

ALERT_ADDRESS = "alerts@example.invalid"
SPEC_STACK_CONTEXT = {
    "prospectus_quota_endpoint": "https://abc123.execute-api.us-east-1.amazonaws.com/prod",
    "spend_ceiling_per_attempt": "10",
    "spend_ceiling_per_day": "25",
    "spend_ceiling_per_month": "60",
    "spend_estimate_rate_per_vcpu_second": "0.001",
    "spend_budget_daily_limit": "30",
    "budget_alert_email": ALERT_ADDRESS,
}


def _synthesize(context_values: dict):
    if str(CONTROL_PLANE) not in sys.path:
        sys.path.insert(0, str(CONTROL_PLANE))
    from aws_cdk import App, Environment
    from aws_cdk.assertions import Template
    from stacks.backend import BackendStack

    stack = BackendStack(
        App(context=context_values),
        "SpendSpecBackend",
        env=Environment(account="111122223333", region="us-east-1"),
    )
    return Template.from_stack(stack)


def _function(template, prefix: str) -> dict:
    return next(
        fn
        for name, fn in template.find_resources("AWS::Lambda::Function").items()
        if name.startswith(prefix)
    )


@given("the backend is synthesized with every guard configured")
def step_synth_configured(context) -> None:
    context.template = _synthesize(SPEC_STACK_CONTEXT)


@given("the backend is synthesized with no guard settings")
def step_synth_bare(context) -> None:
    context.template = _synthesize({})


@then("every Batch job definition has an attempt timeout of at most {limit:d} seconds")
def step_timeouts(context, limit: int) -> None:
    definitions = context.template.find_resources("AWS::Batch::JobDefinition")
    assert definitions
    for name, definition in definitions.items():
        seconds = definition["Properties"]["Timeout"]["AttemptDurationSeconds"]
        assert 60 <= seconds <= limit, (name, seconds)


@then("every Batch job definition retries at most {limit:d} times")
def step_retries(context, limit: int) -> None:
    for name, definition in context.template.find_resources(
        "AWS::Batch::JobDefinition"
    ).items():
        attempts = definition["Properties"]["RetryStrategy"]["Attempts"]
        assert 1 <= attempts <= limit, (name, attempts)


@then("there is one CPU and one GPU compute environment, both scaling to zero")
def step_two_environments(context) -> None:
    environments = context.template.find_resources("AWS::Batch::ComputeEnvironment")
    kinds = set()
    for env in environments.values():
        resources = env["Properties"]["ComputeResources"]
        assert resources["MinvCpus"] == 0, resources
        assert resources["DesiredvCpus"] == 0, resources
        assert 0 < resources["MaxvCpus"] <= 64, resources
        kinds.add("gpu" if resources["InstanceTypes"][0].startswith("g") else "cpu")
    assert sorted(kinds) == ["cpu", "gpu"], kinds


@then("nothing submits to the CPU queue")
def step_cpu_unused(context) -> None:
    # Video jobs stay local until a video image exists: the fallback state
    # machine submits only to the GPU queue.
    machines = context.template.find_resources("AWS::StepFunctions::StateMachine")
    definition = str(next(iter(machines.values()))["Properties"]["DefinitionString"])
    assert "babulus-cpu" not in definition
    queues = context.template.find_resources("AWS::Batch::JobQueue")
    names = {q["Properties"]["JobQueueName"] for q in queues.values()}
    assert names == {"auritus-gpu", "babulus-cpu"}, names


@then("the budget covers only resources with the spend tag")
def step_budget_tag(context) -> None:
    budgets = context.template.find_resources("AWS::Budgets::Budget")
    assert len(budgets) == 1, budgets
    data = next(iter(budgets.values()))["Properties"]["Budget"]
    assert data["CostFilters"] == {"TagKeyValue": ["user:babulus:spend$cloud"]}, data
    for kind in ("AWS::Batch::ComputeEnvironment", "AWS::Batch::JobQueue"):
        for resource in context.template.find_resources(kind).values():
            assert resource["Properties"]["Tags"] == {"babulus:spend": "cloud"}


@then("the budget alerts the configured address and the queue-disabling topic")
def step_budget_subscribers(context) -> None:
    budget = next(
        iter(context.template.find_resources("AWS::Budgets::Budget").values())
    )
    subscribers = budget["Properties"]["NotificationsWithSubscribers"][0]["Subscribers"]
    assert {sub["SubscriptionType"] for sub in subscribers} == {"SNS", "EMAIL"}
    email = next(s for s in subscribers if s["SubscriptionType"] == "EMAIL")
    assert email["Address"] == ALERT_ADDRESS, email


@then("the budget action disables every cloud queue")
def step_budget_queues(context) -> None:
    variables = _function(context.template, "BudgetGuardFn")["Properties"][
        "Environment"
    ]["Variables"]
    assert variables["BATCH_JOB_QUEUE_NAMES"] == "auritus-gpu,babulus-cpu", variables


@then("there is no budget and the gate is not told the budget guard exists")
def step_no_budget(context) -> None:
    assert not context.template.find_resources("AWS::Budgets::Budget")
    variables = _function(context.template, "FallbackGateFn")["Properties"][
        "Environment"
    ]["Variables"]
    for name in (
        "BUDGET_GUARD_CONFIGURED",
        "PROSPECTUS_QUOTA_ENDPOINT",
        "SPEND_CEILING_PER_ATTEMPT",
        "SPEND_CEILING_PER_DAY",
        "SPEND_CEILING_PER_MONTH",
    ):
        assert name not in variables, name


@then("the Prospectus caller role can only post to the quota routes")
def step_caller_role(context) -> None:
    policies = [
        policy["Properties"]["PolicyDocument"]["Statement"]
        for name, policy in context.template.find_resources("AWS::IAM::Policy").items()
        if name.startswith("ProspectusQuotaCallerRole")
    ]
    statements = [s for group in policies for s in group]
    assert len(statements) == 1, statements
    assert statements[0]["Action"] == "execute-api:Invoke", statements
    assert statements[0]["Resource"].endswith("abc123/prod/POST/v1/quota/accounts/*")


@then("a timeout outside the allowed range is refused at synthesis")
def step_timeout_bounds(context) -> None:
    for bad in ("0", "59", "999999"):
        try:
            _synthesize({"batch_attempt_timeout_seconds": bad})
        except ValueError:
            continue
        raise AssertionError(f"timeout {bad} was accepted")
