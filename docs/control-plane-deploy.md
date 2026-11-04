# Control plane deploy from GitHub Actions

The `BabulusControlPlane` stack (`packages/control-plane`) deploys from
GitHub Actions through three roles that can act only on that stack. It does
not use the CDK bootstrap roles: the bootstrap CloudFormation execution role
has full administrator access, so anything merged to main could then change
anything in the account. Nothing in this path is applied automatically. The
roles are created once by hand, after their permissions are reviewed.

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
  or write to the protected user pool.
- **`babulus-control-plane-deploy`**, the role GitHub Actions assumes through
  OIDC. Its trust allows only `refs/heads/main` of this repository, matched by
  the immutable owner and repository ids. It can manage change sets of the one
  stack, pass only the execution role to CloudFormation, stage assets under one
  prefix of the bootstrap bucket, read one SSM parameter, push to the worker
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

## One-time apply order

1. Review the template's permissions.
2. Look up the numeric GitHub owner id and repository id, the ARN of the GitHub
   OIDC provider that already exists in the account, the ARN of the Cognito user
   pool that must stay untouched, and the CDK bootstrap assets bucket name (and
   its KMS key ARN if it uses a customer managed key).
3. Create the deploy stack from `infra/control-plane-deploy/template.yml` with
   those values as parameters: `OidcProviderArn`, `GitHubOwnerId`,
   `GitHubRepoId`, `ProtectedUserPoolArn`, `BootstrapBucketName`, and
   optionally `BootstrapBucketKmsKeyArn` and `GoogleOAuthSecretArn`. The
   template needs the IAM capability that names its roles. Do not give it a
   name that starts with `BabulusControlPlane`.
4. Create the SecureString parameter `/babulus/control-plane/deploy-context`
   (see below).
5. Set the repository variable `CONTROL_PLANE_DEPLOY_ROLE_ARN` to the
   `DeployRoleArn` output of the deploy stack. The execution role's ARN is
   derived from it by the workflow.
6. Merge to main, or run the workflow manually from main.

## The deploy-context parameter

The SSM parameter holds one JSON object of CDK context values. Its keys are the
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
