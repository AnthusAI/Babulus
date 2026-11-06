Feature: Web console operator authentication
  Operators sign in to the web console with Google and nothing else. The
  console sends the browser to the Cognito hosted UI with the Google provider
  and a PKCE challenge, then trades the returned code for short-lived tokens
  at its callback page. Being signed in does not make a person an operator:
  until an administrator adds them to the operators group the API answers 403
  and the console says so plainly. There is no password form and no simulated
  session. These specs read the console's source, and the console's own
  Playwright tests drive the pages.

  Scenario: The login page offers one button, Sign in with Google
    Given the console's login page source is read
    Then the page has a button labelled "Sign in with Google"
    And the page has no password or email field
    And the page offers no other identity provider

  Scenario: Signing in sends the browser to the hosted UI with Google and PKCE
    Given the console's sign-in library is read
    Then it builds a hosted UI authorize address with identity_provider "Google"
    And it asks for the authorization code flow with an S256 code challenge
    And it checks a random state and keeps the verifier only in session storage
    And the default hosted UI domain prefix is "babulus-control-plane-auth"

  Scenario: The callback trades the code for tokens using the verifier
    Given the console's sign-in library is read
    Then the callback exchange sends the code verifier to the token endpoint
    And the callback exchange refuses a state that does not match

  Scenario: The console has no password flow and no simulated session
    Given the console's sign-in library is read
    Then it never uses USER_PASSWORD_AUTH or InitiateAuth
    And it has no simulated development session
    And the console source has no password field anywhere

  Scenario: A signed-in user the API rejects is told they are not an operator yet
    Given the console's API client is read
    Then a 403 answer becomes the message that the person is not an operator yet
    And a 401 answer is still reported as Unauthorized

  Scenario: Unauthenticated visitor accessing protected route is redirected to login
    Given the console's auth guard is read
    Then a visitor without a stored session is redirected to "/login"
    And the login and callback pages need no session

  Scenario: Logging out clears session credentials
    Given the console's header is read
    Then signing out clears the stored session and returns to "/login"
