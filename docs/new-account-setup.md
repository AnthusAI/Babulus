# Setting up Babulus in a new AWS account

Normally a merge to `main` deploys everything that changes. This guide covers what that can't do: the stacks and
settings that must exist first, and the ones a person has to apply. Follow it in order.

**Who runs what:** every `aws` and script command here needs a person with an administrator session in the target
account. The pipeline deliberately can't run them. Agents should prepare the change and hand over the command; if a
permission check blocks an agent, it stops rather than working around the check.

All stacks are in `us-east-1`. The stack names below are what the existing account uses, and later steps look some of
them up by name.

| Order | What | Applied by | Depends on |
|---|---|---|---|
| 1 | Amplify app connected to `main` | Person | Nothing |
| 2 | `infra/github-deploy` | Person | Amplify app |
| 3 | First Studio build | Pipeline | Step 2 |
| 4 | `infra/studio-server-role` | Person | Step 3, Prospectus |
| 5 | `infra/babul-us-edge` | Person | Step 3, certificate |
| 6 | CDK bootstrap | Person | Nothing |
| 7 | Private settings | Person | Step 6 |
| 8 | `infra/control-plane-deploy` | Person | Steps 2, 3, 5, 6 |
| 9 | Control plane | Pipeline | Steps 7, 8 |

## 1. Connect the Amplify app

Create the Amplify app for this repository, on branch `main`, with build settings from `amplify.yml`. Do this once and
treat any later console reconnect as a reviewed change, because reconnecting has destroyed a backend before.

## 2. Let GitHub start builds: `infra/github-deploy`

This stack also creates the account's GitHub OIDC provider, which step 8 needs. An account can hold only one, so if it
already exists, remove that resource from the deploy or the stack will fail.

```bash
aws cloudformation deploy --profile <profile> --region us-east-1 --stack-name babulus-github-deploy \
  --template-file infra/github-deploy/template.yml --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides AmplifyAppId=<app id> GitHubOwnerId=<owner id> GitHubRepoId=<repo id>
```

Get the two GitHub ids with `gh api repos/AnthusAI/Babulus --jq '.owner.id, .id'`. Set the repository variables
`AMPLIFY_APP_ID` and `AMPLIFY_DEPLOY_ROLE_ARN` (the `RoleArn` output).

## 3. Run the first Studio build

Merge to `main`, or rerun the Deploy job. The build creates the Studio's Cognito user pool and assets bucket, which the
next steps need.

## 4. Give the Studio its server role: `infra/studio-server-role`

```bash
aws cloudformation deploy --profile <profile> --region us-east-1 --stack-name babulus-studio-server \
  --template-file infra/studio-server-role/template.yml --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides ProspectusAccountsApiStageArn=<arn> UserPoolArn=<arn> AssetsBucketName=<name>
```

Then attach the `RoleArn` output as the Amplify app's compute role. Sign-in details are in
[google-sign-in.md](google-sign-in.md).

## 5. Create the front door: `infra/babul-us-edge`

The domain's DNS lives in another AWS account, and Amplify refuses to attach a domain across accounts, so CloudFront
serves it. Request and DNS-validate a certificate in `us-east-1` first.

```bash
aws cloudformation deploy --profile <profile> --region us-east-1 --stack-name babul-us-edge \
  --template-file infra/babul-us-edge/template.yml \
  --parameter-overrides CertificateArn=<arn> AmplifyAppId=<app id> CachePolicyId=<id> OriginRequestPolicyId=<id>
```

The two policy ids are the AWS-managed `CachingDisabled` and `AllViewerExceptHostHeader` policies. Point the domain at
the `DistributionDomainName` output. Keep the distribution's comment as `babul.us front door`, because step 8 finds it
by that comment.

## 6. Bootstrap CDK

```bash
npx cdk bootstrap aws://<account id>/us-east-1
```

The control plane uses only the assets bucket this creates. It never assumes the bootstrap roles, one of which has
full administrator access.

## 7. Write the private settings

Copy `infra/control-plane-deploy/deploy-context.example.json` to a file **outside the repository** and fill it in.
Dollar figures and email addresses never go in Git. [control-plane-deploy.md](control-plane-deploy.md) lists every
key.

```bash
AWS_PROFILE=<profile> infra/control-plane-deploy/write-deploy-context.sh --account <account id> --values <file>
```

The values end up in Parameter Store as a SecureString, which is the place to change them later.

## 8. Create the deploy roles: `infra/control-plane-deploy`

Review the permissions in the template first. Then:

```bash
AWS_PROFILE=<profile> infra/control-plane-deploy/bootstrap.sh --account <account id>
```

It stops and names the step to go back to if something is missing. It shows the change set and asks before applying
(`--plan-only` applies nothing), sets the repository variable `CONTROL_PLANE_DEPLOY_ROLE_ARN`, and checks that the
deployed template matches `main`. It is safe to rerun. Why this is by hand: the roles are what the pipeline deploys with, and it is denied
from changing them, so that merged code can't widen its own permissions.

## 9. Deploy the control plane

Run the "Control plane deploy" workflow from `main`, or merge a change under `packages/control-plane`. From here it
deploys on merge. Any permission the first run lacks shows up as an `AccessDenied` in the workflow log. Add it to the
template and repeat from the rerun steps below; new permissions need approval.

## What must be rerun by hand later

| When | Do this |
|---|---|
| `infra/control-plane-deploy/template.yml` changes | Merge, run `bootstrap.sh`, rerun the workflow |
| A Cognito user pool is added to the account | Run `bootstrap.sh`, because the protected list is a snapshot |
| Any other `infra/` template changes | Rerun that stack's command above |
| A private setting changes | Edit your values file, run `write-deploy-context.sh`, rerun the workflow |

Adding a step the pipeline doesn't perform? Add it to this guide in the same change.

## Not yet proven

This order comes from the templates and from setting up one existing account, not from a clean run in an empty account.
In that account the control plane deployed after several permission fixes, now in the template. Running a real job
also needs a worker image in `babulus-worker`, which nothing builds yet.
