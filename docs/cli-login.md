# CLI sign-in

`babulus login` signs in to your Babulus Studio with Google and keeps the renewable
session in your machine's secure store. There is no password sign-in, no access key
and no plaintext credentials file. Sign-in, renewal, locking, storage and logout come
from the shared [`cli-login`](https://pypi.org/project/cli-login/) library, pinned to
one exact release (`0.4.0`) for the command, the broker and the approval pages.

```sh
babulus login studio.example.test            # opens your browser
babulus login --remote studio.example.test   # a machine with no browser
babulus whoami                               # who am I signed in as
babulus logout
```

Name the Studio once; later `babulus login` signs in again to the same one. The
command reads the Studio's public sign-in values from
`https://<studio>/.well-known/babulus-cli.json` (HTTPS only, no redirects, 16 KiB
cap, every field checked). Nothing is saved if a check fails.

## Where the session is kept

| Platform | Store |
| --- | --- |
| macOS | Keychain |
| Linux | Secret Service (an unlocked desktop keyring), then the kernel keyring, then the memory agent |
| Windows | Credential Manager |

If no secure store is usable, `babulus login` fails with the steps to fix it and
writes nothing. Set `CLI_LOGIN_STORE` to `keychain`, `secret-service`,
`kernel-keyring`, `agent` or `credential-manager` to choose one. On a cloud machine,
start the memory agent once:

```sh
python -m cli_login.stores.agent serve --namespace babulus-oauth --background
```

Only the Studio's public values are written to disk
(`~/.config/babulus/studio-login.json`, mode 0600; override the folder with
`BABULUS_CLI_STATE_DIR`).

## Remote sign-in from another device

An agent on a machine with no browser runs `babulus login --remote studio.example.test`.
It prints an approval link and a short matching code, then waits up to 10 minutes.
Open the link on your phone, sign in with Google, check the code and approve. Pass
`--expect-email you@example.com` and the command refuses, and stores nothing, if
anyone else approves. Nothing secret is printed.

## Workers and agents

A local `babulus worker` uses the stored session and renews it as it goes. When the
session is revoked or signed out, the worker stops with exit status 2 and a message to
run `babulus login`. The token is sent only to the jobs API the Studio published in
its sign-in file.

A cloud worker (AWS Batch) never reads a stored session. It keeps its single-use,
job-scoped token and its IAM role.

A request refused with 403 means the person's sign-in has no Babulus access to the
Account; ask an owner of the Account to give it access.

## Switching on remote sign-in for a deployment

Remote sign-in is **off** until the deployment turns it on. The broker (a Lambda
function URL, a DynamoDB table and two CloudWatch alarms) and the approval pages
function live in the `CliRemoteLogin` stack of the Studio's Amplify backend
(`apps/studio-web/amplify/cli-login`). Every value comes from the Amplify app's
environment, never from the repository:

| Variable | Meaning |
| --- | --- |
| `BABULUS_APP_ORIGIN` | The Studio's public https origin. |
| `BABULUS_JOBS_API_ENDPOINT` | The jobs API's https URL. The broker serves only this target and the command sends its token only there. |
| `BABULUS_ENABLE_CLI_REMOTE_LOGIN` | `true` to create the broker and pages. |
| `BABULUS_CLI_INVOKER_ROLE_ARN` | The ARN of the Studio server role (`babulus-studio-server`, the `RoleArn` output of `infra/studio-server-role/template.yml`): the only principal that may invoke the pages function. |
| `BABULUS_ALARM_TOPIC_ARN` | Optional SNS topic the two alarms notify. Without it nobody is notified and synthesis warns. |

The Studio's Cognito app client must also be configured with the jobs API's
`ALLOWED_CLIENT_IDS` (the control plane accepts only access tokens issued to a listed
client). The loopback return URL `http://localhost:38512/` (and, with remote sign-in,
`<origin>/cli/callback`) is added to the web app client by the backend; the sign-in
file is served only when the client really registers them.
