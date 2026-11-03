# Studio sign-in: Google only, through Prospectus Accounts

People sign in to the Studio with Google through the Studio's Cognito user pool. Prospectus decides which Accounts a
person belongs to and whether Babulus is switched on for each. There are no passwords, no self sign-up and no Cognito
password users.

## How a sign-in works

1. `GET /api/auth/prospectus/sign-in` asks Prospectus for a challenge and redirects to the Google-only Cognito client
   (`prospectus-google-only`) with the challenge's nonce and a PKCE challenge.
2. `GET /api/auth/prospectus/callback` checks the state, exchanges the code, verifies both tokens, and asks Prospectus
   to resolve the challenge, which enrolls the login as a Prospectus Person.
3. The server reads the Person's Accounts, keeps those with the `babulus` product active and a role of owner, admin or
   member (a viewer gets no Studio access), and confirms each with Prospectus (`console:write`).
4. The server makes the user's Cognito groups exactly those Accounts. A group is named for the Account's id (a lowercase
   UUID). Other groups are left alone. If Prospectus cannot be reached nothing changes and the sign-in fails.
5. The session is sealed in an httpOnly cookie. Tokens never reach the browser. The web app then signs in to Cognito
   with Amplify (silent, because the hosted UI session already exists), so its ID token carries `cognito:groups`.

`POST /api/auth/prospectus/sync` repeats steps 3 and 4 for a signed-in session; the web app calls it, then refreshes its
tokens, when the token lacks the selected Account's group. Account selection is a preference only: the data layer
authorizes by the groups in the token, and the server re-checks with Prospectus.

People cannot create Accounts in the Studio. Operators create them in Prospectus.

## Settings

| Name | Where | Meaning |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Amplify secrets | Google OAuth client, per branch and for the sandbox |
| `BABULUS_APP_ORIGIN` | Amplify environment | The Studio's public https origin |
| `BABULUS_OAUTH_REDIRECT_URLS` | Amplify environment, optional | Comma-separated sign-in return URLs (https, or http on localhost); default `https://babul.us/` and localhost |
| `BABULUS_COGNITO_DOMAIN_PREFIX` | Amplify environment, optional | `babulus` or `babulus-dev`; default by branch (`main` is `babulus`) |
| `BABULUS_PROSPECTUS_ACCOUNTS_ENDPOINT` | Amplify environment | Prospectus accounts API base, including the stage |
| `BABULUS_PROSPECTUS_SESSION_SECRET_PARAMETER` | optional override | Normally unset: the server reads the parameter name from the deployed backend's outputs (`custom.prospectusSignIn.sessionSecretParameter`) |

The Studio's compute role needs `execute-api:Invoke` on the Prospectus accounts API, `ssm:GetParameter` on the one sealing
parameter (its ARN is the output `sessionSecretParameterArn`), and `cognito-idp:CreateGroup`, `AdminAddUserToGroup`, `AdminRemoveUserFromGroup` and `AdminListGroupsForUser` on
the Studio's user pool.

## The cookie sealing secret

Infrastructure generates it; nobody creates it by hand. The `ProspectusSession` stack runs a small custom resource that
puts a random 64-character SSM SecureString (AWS-managed key) named `/babulus/studio/<branch>/prospectus-session-sealing`
(`sandbox` outside Amplify branches). It is create-only: an update never regenerates or overwrites it, and delete retains
it, so a redeploy or teardown cannot sign anyone out. The value is in no template, output or log; the backend outputs
publish only the parameter's name and ARN. To rotate it, `aws ssm put-parameter --overwrite` (this signs everyone out).
Code is in `apps/studio-web/amplify/session-secret/`; it is not Secrets Manager.

## If the Google secrets are missing

`secret("GOOGLE_CLIENT_ID")` and `secret("GOOGLE_CLIENT_SECRET")` are not checked when the backend is synthesized, so a
build with them unset still gets through synth and fails later, during the CloudFormation deploy of the auth stack. A
function Amplify deploys with the auth stack looks each secret up under the branch and then the app, and when neither
exists it fails with `Failed to retrieve backend secret 'GOOGLE_CLIENT_ID' for '<app id>'` followed by the SSM error. The
auth stack update then rolls back, so the user pool and everything in it stay as they were, and the Amplify build's
backend phase fails. The fix is to set both secrets for that branch (or the sandbox) and redeploy; there is no partial
state to clean up.
