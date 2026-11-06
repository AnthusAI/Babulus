# Babulus control plane console

The operator console for the Babulus control plane: job monitoring, costs, worker and queue health, and the sites that
may use the service, including the cloud switch for each site. It runs on your own machine only and is never deployed.

## Signing in

Google is the only way in. **Sign in with Google** sends the browser to the control plane's Cognito hosted UI
(authorization code flow with PKCE) and back to `/callback`. Being signed in does not make you an operator: until an
administrator adds you to the pool's `operators` group, every call answers 403 and the console says you are not an
operator yet. The administrator steps are in [docs/new-account-setup.md](../../docs/new-account-setup.md), steps 8, 11
and 12.

## Run it locally

```bash
cd apps/console
npm ci
cp .env.example .env.local   # then fill in the three values below
npm run dev                  # http://localhost:3000
```

Open `http://localhost:3000`, not another port: the web console client allows the callback
`http://localhost:3000/callback` (and `http://localhost:3001/callback`).

| Variable | Where the value comes from |
|---|---|
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | The `WebConsoleClientId` output of the `BabulusControlPlane` stack. Do not use `UserPoolClientId`, which is the CLI's client and does not allow the console's callback. |
| `NEXT_PUBLIC_AURITUS_API_ENDPOINT` | The `ApiUrl` output of the same stack, without a trailing slash. |
| `NEXT_PUBLIC_AWS_REGION` | `us-east-1`, the default. |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | Only if you set `cognito_domain_prefix` in the private settings. The default is `babulus-control-plane-auth`. |

Read the outputs with
`aws cloudformation describe-stacks --stack-name BabulusControlPlane --query 'Stacks[0].Outputs' --profile <profile>`.
None of these values is a secret: they are public identifiers that end up in the page.

## Checks

```bash
npm run lint
npm test               # type check
npm run build
npx playwright test    # mocks every API response; starts the dev server itself
```
