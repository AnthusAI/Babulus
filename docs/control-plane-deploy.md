# Control plane deploy from GitHub Actions

The `BabulusControlPlane` stack (`packages/control-plane`) deploys from
GitHub Actions through three roles that can act only on that stack. It does
not use the CDK bootstrap roles: the bootstrap CloudFormation execution role
has full administrator access, so anything merged to main could then change
anything in the account. The stack itself deploys automatically on merge. Its
roles do not: a person applies them, after reviewing their permissions.

## What it is

`infra/control-plane-deploy/template.yml` is a CloudFormation template that
defines:

- **`babulus-control-plane-boundary`**, a permissions boundary attached to
  every IAM role the stack creates. It allows only the actions those roles use,
  scoped to the stack's names where AWS offers name-based ARNs, and denies all
  `iam:*`, `organizations:*` and `account:*` actions and every action on the
  protected Cognito user pool.
- **`babulus-control-plane-cfn-exec`**, the role CloudFormation assumes while
  it changes the stack (`cdk deploy --role-arn`). It can create, update and
  delete only the resource types in the stack. It can create roles only under
  the name prefix `BabulusControlPlane-` and only with the boundary attached.
  It explicitly cannot remove the boundary, create users or access keys, edit
  the boundary policy or the deploy stack, launch EC2 instances, touch Amplify
  write to the protected user pools or change the protected CloudFront
  distribution.
- **`babulus-control-plane-deploy`**, the role GitHub Actions assumes through
  OIDC. Its trust allows only `refs/heads/main` of this repository, matched by
  the immutable owner and repository ids. It can manage change sets of the one
  stack, pass only the execution role to CloudFormation, delete only a stack left in a failed-create state (and only through the
  execution role), stage assets under one prefix of the bootstrap bucket, read one SSM parameter, push to the worker
  image repository, and it cannot assume the `cdk-*` bootstrap roles.

With `-c deploy_mode=narrowed`, `packages/control-plane/app.py` switches the
stack to `CliCredentialsStackSynthesizer`, so no bootstrap roles are assumed,
and applies the boundary to every role. Without that context value the stack
synthesizes exactly as before.

The workflow is `.github/workflows/control-plane-deploy.yml`. It runs on a
push to main that touches the control plane, this template or the workflow,
and on a manual run from main. It does nothing until the repository variable
`CONTROL_PLANE_DEPLOY_ROLE_ARN` is set. It waits for the CI check "Speech and
control plane checks" on the same commit and does not deploy if that check
fails or never reports. Runs are serialized and never cancelled midway.

## Applying and changing the roles

First-time order across every stack is in
[new-account-setup.md](new-account-setup.md). These roles are the one part of
the control plane the pipeline cannot deploy, because they are what it deploys
with and it is denied from changing them.

Run `AWS_PROFILE=<profile> infra/control-plane-deploy/bootstrap.sh --account <id>`
with an administrator session. It stops unless that session is in the named
account, takes the template from `origin/main` and looks up the parameter values
without printing them. It shows the change set and asks before applying (`--yes`
skips the question, `--plan-only` applies nothing), sets the repository variable
`CONTROL_PLANE_DEPLOY_ROLE_ARN` and checks that the deployed template matches
main. It deletes the stack first only if a failed create left it in
`ROLLBACK_COMPLETE`, which holds no resources.

Run it again when:

- `infra/control-plane-deploy/template.yml` changes. Merge first, because the
  script reads `origin/main`, then run it, then rerun the deploy workflow. The
  run the merge itself started uses the old roles and may fail.
- A Cognito user pool is added to the account. The protected list is a snapshot
  taken when the script runs, so a new pool has no protection until then.

## The deploy-context parameter

Write it with `AWS_PROFILE=<profile> infra/control-plane-deploy/write-deploy-context.sh
--account <id> --values <file>`, starting from `deploy-context.example.json`. The
values file stays outside the repository. The SSM parameter holds one JSON object of CDK context values. Its keys are the
context names the stack reads. The workflow masks every value in the logs and
never prints the object or uploads `cdk.out`.

Required key:

- `bootstrap_bucket_name`

Keys the stack reads, set only the ones that apply:

- `account`, `region`
- `google_oauth_secret_arn`, `cognito_domain_prefix`, `saml_metadata_url`
- `worker_image_tag`
- `alert_from_address`, `daily_site_quota`
- `claim_timeout_seconds`, `race_seconds`, `retention_days`
- `prospectus_quota_endpoint`
- `spend_ceiling_per_attempt`, `spend_ceiling_per_day`,
  `spend_ceiling_per_month`, `spend_estimate_rate_per_vcpu_second`
- `spend_budget_daily_limit`, `budget_alert_email`
- `warm_start_threshold_seconds`, `provisioning_overhead_seconds`
- `variance_threshold_percent`, `reconciliation_lookback_days`
- `gpu_hourly_rate_usd`, `platform_cost_per_job_usd`, `rate_card_version`
- the Batch settings the stack bounds, such as `batch_attempt_timeout_seconds`

## Checks that need no AWS access

`packages/speech/features/control_plane_narrowed_deploy.feature` synthesizes the
stack in narrowed mode and parses the deploy template. It asserts that every
stack role carries the boundary, that no role has administrator access, that the
boundary covers every action the stack roles use, that only main can assume the
deploy role, that the bootstrap roles cannot be assumed, that role creation
requires the boundary and that the explicit denials exist.

Lambda layers the stack publishes are named `BabulusControlPlane-*`, and the
execution role can reach only layers with that prefix.
