Feature: Studio sign-in is Google only, through Prospectus Accounts

  Babulus signs people in with Google through its Cognito user pool, and Prospectus decides which Accounts a person
  belongs to and whether Babulus is switched on for them. The Studio server turns that answer into one Cognito group per
  Account, named for the Account's id, so the data layer can authorize records by Account without trusting anything the
  browser sends. Nothing here calls AWS, Google or Prospectus: the synthesized stack is inspected and every service is a
  fake.

  Rule: The password path is closed

    Scenario: The synthesized user pool and web client admit only Google
      Given the Studio auth stack is synthesized for the "main" branch
      Then the user pool lets only administrators create users
      And the user pool still uses email as its username attribute
      And the web client offers only the refresh token flow
      And the web client's only identity provider is "Google"
      And the user pool has a Google identity provider

    Scenario: Keeping email as the username attribute keeps the user pool in place
      Given the Studio auth stack is synthesized for the "main" branch
      Then the user pool has no schema override that would replace it
      And the hosted UI domain is a new resource named "babulus"

    Scenario: The Google client id and secret come from Amplify secrets, not from the repository
      Given the Studio auth stack is synthesized for the "main" branch
      Then the Google identity provider's client id and secret are not literal values

    Scenario: The Prospectus client is Google only with no secret and no password flow
      Given the Studio auth stack is synthesized for the "main" branch
      Then the Prospectus client is named "prospectus-google-only"
      And the Prospectus client has no secret
      And the Prospectus client uses only the authorization code flow
      And the Prospectus client offers only the refresh token flow
      And the Prospectus client's only identity provider is "Google"
      And the Prospectus client's callback paths all end in "/api/auth/prospectus/callback"

  Rule: The hosted UI prefix follows the deployment

    Scenario Outline: The prefix is chosen from the branch or an explicit override
      Given the deployment branch is "<branch>" and the prefix override is "<override>"
      Then the Cognito domain prefix is "<prefix>"

      Examples:
        | branch  | override     | prefix       |
        | main    |              | babulus      |
        | develop |              | babulus-dev  |
        |         |              | babulus-dev  |
        | develop | babulus      | babulus      |
        | main    | babulus-dev  | babulus-dev  |

    Scenario: A prefix whose Google redirect is not registered is refused
      Given the deployment branch is "main" and the prefix override is "someone-else"
      Then choosing the Cognito domain prefix is refused

    Scenario: A development deployment synthesizes the development domain
      Given the Studio auth stack is synthesized for the "develop" branch
      Then the hosted UI domain is a new resource named "babulus-dev"

  Rule: Sign-in return URLs are production hosts and localhost only

    Scenario: The default return URLs include the production host and localhost
      Given no return URLs are configured
      Then the return URLs include "https://babul.us/"
      And the return URLs include "http://localhost:3000/"

    Scenario: The deployment can name its own hosts
      Given the return URLs are configured as "https://studio.example.test/,http://localhost:3000/"
      Then the return URLs are exactly "https://studio.example.test/,http://localhost:3000/"

    Scenario Outline: Insecure or ambiguous return URLs are refused
      Given the return URLs are configured as "<urls>"
      Then reading the return URLs is refused

      Examples:
        | urls                                  |
        | http://studio.example.test/           |
        | https://studio.example.test/?next=1   |
        | not a url                             |

  Rule: Signing in enrolls the person as a Prospectus Person

    Scenario: Starting a sign-in asks Prospectus for a challenge and goes to Google through Cognito
      Given Babulus is configured for Prospectus sign-in
      When a visitor starts to sign in
      Then the visitor is sent to the Google-only Cognito authorize address
      And the authorize address asks for the Google provider with the code flow and a PKCE challenge
      And the authorize address carries the nonce Prospectus issued
      And a sealed pending cookie is set that is not readable text

    Scenario: A deployment that is not configured refuses to start a sign-in
      Given Babulus is not configured for Prospectus sign-in
      When a visitor starts to sign in
      Then the answer is a 503 that says sign-in is not configured

    Scenario: A finished sign-in enrolls the Person and seals a session
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      When a visitor starts to sign in and Google returns with a valid code
      Then Prospectus is asked to resolve the challenge with the person's access and ID tokens
      And the visitor is sent back into the Studio with a sealed session cookie
      And the session cookie holds no readable token
      And the person is in the group for Account "pilot"

    Scenario: A sign-in whose state does not match is refused and changes nothing
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      When a visitor starts to sign in and Google returns with the wrong state
      Then the visitor is sent back with the sign-in error "state_mismatch"
      And no session cookie is set
      And the person is in no Account groups

    Scenario: A cancelled sign-in is explained and changes nothing
      Given Babulus is configured for Prospectus sign-in
      When a visitor starts to sign in and Google reports that the person cancelled
      Then the visitor is sent back with the sign-in error "sign_in_declined"
      And no session cookie is set

    Scenario: A sign-in without its pending cookie is refused
      Given Babulus is configured for Prospectus sign-in
      When Google returns with a code but the browser has no pending sign-in
      Then the visitor is sent back with the sign-in error "sign_in_expired"
      And no session cookie is set

  Rule: Babulus access comes from the Account, never from the browser

    Scenario: A person with no Babulus entitlement is refused and holds no groups
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner without Babulus switched on
      When a visitor starts to sign in and Google returns with a valid code
      Then the person is in no Account groups
      And the session view says the person has no access to Babulus
      And the session view lists no Accounts

    Scenario: Two Accounts give a group for exactly the entitled one
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      And the signed-in person belongs to Account "rival" as member without Babulus switched on
      When a visitor starts to sign in and Google returns with a valid code
      Then the person is in the group for Account "pilot"
      And the person is not in the group for Account "rival"
      And the session view lists Account "pilot" only

    Scenario: Several entitled Accounts each get a group and the person picks one
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      And the signed-in person belongs to Account "orbit" as member with Babulus switched on
      When a visitor starts to sign in and Google returns with a valid code
      Then the person is in the group for Account "pilot"
      And the person is in the group for Account "orbit"
      And the session view asks the person to choose an Account

    Scenario: A group for an Account the person no longer belongs to is removed
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      And the person already holds the group for Account "rival" and a hand-made group "ops-team"
      When a visitor starts to sign in and Google returns with a valid code
      Then the person is in the group for Account "pilot"
      And the person is not in the group for Account "rival"
      And the person is still in the hand-made group "ops-team"

    Scenario: A Prospectus viewer gets no group and no Studio access
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as viewer with Babulus switched on
      When a visitor starts to sign in and Google returns with a valid code
      Then the person is in no Account groups
      And the session view says the person has no access to Babulus

    Scenario Outline: Prospectus roles map to Studio roles
      Given the Prospectus role "<prospectus>"
      Then the Studio role is "<studio>"

      Examples:
        | prospectus | studio |
        | owner      | owner  |
        | admin      | admin  |
        | member     | editor |
        | viewer     | none   |

    Scenario: Prospectus refusing write access to an Account drops its group
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      And Prospectus refuses console write for Account "pilot"
      When a visitor starts to sign in and Google returns with a valid code
      Then the person is in no Account groups

    Scenario: When Prospectus cannot be reached no group changes
      Given Babulus is configured for Prospectus sign-in
      And the person already holds the group for Account "pilot" and a hand-made group "ops-team"
      And Prospectus cannot be reached after the sign-in
      When a visitor starts to sign in and Google returns with a valid code
      Then the visitor is sent back with a sign-in error
      And no session cookie is set
      And the person is still in the group for Account "pilot"

  Rule: Account groups are refreshed by the server, and only from a signed-in session

    Scenario: Refreshing groups follows Prospectus
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      And the person has a signed-in session
      And the person has since been added to Account "orbit" as member with Babulus switched on
      When the Studio asks the server to refresh the person's Account groups
      Then the person is in the group for Account "pilot"
      And the person is in the group for Account "orbit"

    Scenario: Refreshing groups from another site is refused
      Given Babulus is configured for Prospectus sign-in
      And the person has a signed-in session
      When another site asks the server to refresh the person's Account groups
      Then the answer is a 403 and no group changes

    Scenario: Refreshing groups without a session is refused
      Given Babulus is configured for Prospectus sign-in
      When the Studio asks the server to refresh groups without a session
      Then the answer is a 401 and no group changes

    Scenario: Choosing an Account the person has no Babulus access to is refused
      Given Babulus is configured for Prospectus sign-in
      And the signed-in person belongs to Account "pilot" as owner with Babulus switched on
      And the signed-in person belongs to Account "rival" as member without Babulus switched on
      And the person has a signed-in session
      When the person chooses Account "rival"
      Then the answer is a 403 and the selection is unchanged
