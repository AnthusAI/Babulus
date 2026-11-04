"""Babulus control plane CDK application entrypoint."""

from __future__ import annotations

import os

import aws_cdk as cdk
from aws_cdk import aws_iam as iam
from stacks.backend import BackendStack

NARROWED_DEPLOY_MODE = "narrowed"
PERMISSIONS_BOUNDARY_NAME = "babulus-control-plane-boundary"
STAGED_ASSETS_PREFIX = "babulus-control-plane/"

app = cdk.App()
narrowed = app.node.try_get_context("deploy_mode") == NARROWED_DEPLOY_MODE

stack_properties: dict = {}
if narrowed:
    stack_properties["synthesizer"] = cdk.CliCredentialsStackSynthesizer(
        file_assets_bucket_name=app.node.try_get_context("bootstrap_bucket_name"),
        bucket_prefix=STAGED_ASSETS_PREFIX,
    )

stack = BackendStack(
    app,
    "BabulusControlPlane",
    env=cdk.Environment(
        account=app.node.try_get_context("account")
        or os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=app.node.try_get_context("region")
        or os.environ.get("CDK_DEFAULT_REGION")
        or "us-east-1",
    ),
    **stack_properties,
)

if narrowed:
    iam.PermissionsBoundary.of(stack).apply(
        iam.ManagedPolicy.from_managed_policy_name(
            stack, "ControlPlaneBoundary", PERMISSIONS_BOUNDARY_NAME
        )
    )

app.synth()
