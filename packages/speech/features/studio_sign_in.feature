Feature: Signing the babulus command in to a Studio
  `babulus login` signs in with Google through the Studio's own sign-in page and keeps the renewable session in the
  machine's secure store: the Keychain on macOS, the Secret Service, kernel keyring or memory agent on Linux, Credential
  Manager on Windows. There is no password sign-in and no plaintext fallback. A person on a machine with no browser runs
  `babulus login --remote`, reads out an approval link and a short matching code, and approves on another device. The
  command (and any local worker it starts) sends its token only to the jobs API its Studio published. A cloud worker is
  different: it keeps its single-use job token and never reads the stored session.

  Background:
    Given a Studio that publishes its sign-in values
    And an empty secure store

  Scenario: Signing in keeps the session only in the secure store
    When the person signs in on this machine
    Then the secure store holds a renewable session for the person
    And the Google identity provider was asked for
    And the only file on disk is the Studio's public sign-in values
    And the command says who signed in

  Scenario: Without a usable secure store nothing is written
    Given the secure store the machine would use is unavailable
    When the person tries to sign in on this machine
    Then sign-in fails and says that plaintext storage is never used
    And no file is written

  Scenario: Remote sign-in prints the approval link and the matching code
    When the person signs in remotely and approves with the code on another device
    Then the command printed the approval link and the matching code
    And the secure store holds a renewable session for the person
    And nothing secret was printed

  Scenario: Remote sign-in refuses an approval by someone else
    When the person signs in remotely expecting "expected@example.test" and someone else approves
    Then the sign-in fails and says someone other than the expected person approved
    And the secure store is empty

  Scenario: Remote sign-in needs a Studio that switched it on
    Given a Studio that publishes no remote sign-in broker
    When the person tries to sign in remotely
    Then the sign-in fails and says the Studio has no remote sign-in

  Scenario: A worker or command renews the stored session when it goes stale
    Given the person is signed in
    When an hour and a minute pass
    And the command asks for a token
    Then the provider was asked to renew with the stored refresh token
    And the command gets a fresh access token

  Scenario: A revoked session ends the worker with a clear message
    Given the person is signed in
    And the provider has revoked the session
    When an hour and a minute pass
    And the command asks for a token
    Then the command is told the session expired and to run "babulus login"
    And the secure store is empty

  Scenario: Never having signed in is reported as a missing sign-in
    When the command asks for a token without ever having signed in
    Then the command is told the session expired and to run "babulus login"

  Scenario: The token goes only to the jobs API the Studio published
    Given the person is signed in
    When the command asks for a token for "https://elsewhere.example.test/prod"
    Then no token is handed out
    And the provider was not asked for anything new

  Scenario: Signing out removes the session and says if revocation was not confirmed
    Given the person is signed in
    When the person signs out
    Then the secure store is empty
    And the provider revoked the refresh token

  Scenario: whoami shows who is signed in and no token
    Given the person is signed in
    When the person runs whoami
    Then the output names the person and the Studio
    And the output holds no token

  Scenario: The password and single-sign-on options are gone
    Then babulus login has no password option
    And babulus login has no username option
    And babulus login has no sso option
    And the command source contains no Cognito password flow

  Scenario: A cloud worker keeps its job token and never reads the stored session
    Given the person is signed in
    When a cloud worker's client with the job token "job-token-1" makes a request
    Then the request carries the bearer "job-token-1"
    And the stored session was not read

  Scenario: A person without access to an Account is refused in plain words
    Given the person is signed in
    When the jobs API answers a request with 403
    Then the person is told this sign-in has no Babulus access to that Account
    And the person is told to ask an owner of the Account

  Scenario: A Studio is found by its public sign-in file
    When the person names the Studio "studio.example.test"
    Then the sign-in values are read only from the Studio's well-known file over https
    And the Studio is remembered for the next sign-in

  Scenario Outline: A sign-in file that is not exactly right is refused
    When the Studio serves <problem>
    Then discovery fails and nothing is saved

    Examples:
      | problem                              |
      | an unknown extra field               |
      | a missing issuer                     |
      | values for a different Studio        |
      | an http jobs API endpoint            |
      | a file larger than 16 KiB            |
      | something that is not JSON           |
