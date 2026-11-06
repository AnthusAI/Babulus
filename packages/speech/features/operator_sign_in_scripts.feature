Feature: A person sets up Google sign-in and operators with scripts that never show a secret

  Signing in to the control plane works only through Google, and only a person
  with an administrator session in the AWS account can make that possible. One
  script stores the Google OAuth client, another makes a person an operator or
  takes it away, and the roles script hands the stored secret to the deploy
  roles. Each stops when it is signed in to the wrong account, and the one that
  handles the client secret keeps it out of every command line, every printed
  line and every file anyone else can read. These specs run the real scripts
  against a fake aws command, so no AWS access is needed.

  Scenario: The Google client script stops when signed in to a different account
    Given a fake AWS account with a deploy context
    When a person runs the Google client script for a different account and types a valid client id and secret
    Then the script exits with status 2
    And the fake account has no secrets
    And the deploy context is unchanged

  Scenario Outline: The Google client script refuses an id that is not a Google web client id
    Given a fake AWS account with a deploy context
    When a person runs the Google client script and types the client id "<client id>" and a secret
    Then the script exits with status 2
    And the fake account has no secrets
    And the deploy context is unchanged

    Examples:
      | client id                                  |
      | not-a-client-id                            |
      | 123456789.apps.googleusercontent.com       |
      | abc-def.apps.googleusercontent.com         |
      | 123456789-abc123.example.com               |
      | 123456789-abc123.apps.googleusercontent.com.evil.example |

  Scenario: The Google client script stops when there is no deploy context to add to
    Given a fake AWS account without a deploy context
    When a person runs the Google client script and types a valid client id and secret
    Then the script exits with status 2
    And the fake account has no secrets

  Scenario: The Google client script stores the client in a new secret and records its address
    Given a fake AWS account with a deploy context
    When a person runs the Google client script and types a valid client id and secret
    Then the script exits with status 0
    And the secret "babulus-control-plane-google-oauth" holds the client id and client secret as JSON
    And the secret reached Secrets Manager through a file only its owner could read
    And the deploy context keeps its other keys and gains google_oauth_secret_arn
    And the output names bootstrap.sh and the deploy workflow as the next steps

  Scenario: The Google client script never shows the client secret
    Given a fake AWS account with a deploy context
    When a person runs the Google client script and types a valid client id and secret
    Then the client secret appears in no aws command line
    And the client secret appears nowhere in the script's output
    And no other deploy context value appears in the script's output

  Scenario: The Google client script updates a secret that already exists
    Given a fake AWS account with a deploy context and an existing Google secret
    When a person runs the Google client script and types a valid client id and secret
    Then the script exits with status 0
    And the existing secret was updated, not created again
    And the deploy context keeps its other keys and gains google_oauth_secret_arn

  Scenario: Rewriting the private settings keeps the Google secret's address
    Given a fake AWS account whose deploy context already names the Google secret
    When a person writes new private settings that do not name a Google secret
    Then the script exits with status 0
    And the stored deploy context has the new settings and the same google_oauth_secret_arn

  Scenario: Private settings that name a Google secret win over the stored one
    Given a fake AWS account whose deploy context already names the Google secret
    When a person writes new private settings that name a different Google secret
    Then the script exits with status 0
    And the stored deploy context names the different Google secret

  Scenario: The operator script stops when signed in to a different account
    Given a fake AWS account with a control plane pool and a user who has signed in with Google
    When a person runs the operator script for a different account to add that user
    Then the script exits with status 2
    And nobody is in the operators group
    And no group was created

  Scenario: The operator script creates the operators group the first time
    Given a fake AWS account with a control plane pool and a user who has signed in with Google
    When a person runs the operator script to add that user
    Then the script exits with status 0
    And the control plane pool has an operators group
    And that user is in the operators group

  Scenario: The operator script reuses the operators group that exists
    Given a fake AWS account with a control plane pool, an operators group and a user who has signed in with Google
    When a person runs the operator script to add that user
    Then the script exits with status 0
    And no group was created
    And that user is in the operators group

  Scenario: The operator script tells a person who has not signed in yet to do so first
    Given a fake AWS account with a control plane pool and a user who has signed in with Google
    When a person runs the operator script to add someone who has never signed in
    Then the script exits with status 2
    And the output says the person must sign in once with Google first
    And nobody is in the operators group

  Scenario: The operator script uses the control plane pool and not another pool
    Given a fake AWS account with a Studio pool listed before the control plane pool and a user who has signed in with Google
    When a person runs the operator script to add that user
    Then the script exits with status 0
    And every group call named the control plane pool

  Scenario: The operator script can take the role away
    Given a fake AWS account with a control plane pool, an operators group and an operator
    When a person runs the operator script to remove that user
    Then the script exits with status 0
    And nobody is in the operators group

  Scenario: The roles script hands the deploy roles the Google secret when it exists
    Given a fake AWS account with an existing Google secret
    When a person plans the deploy roles with the bootstrap script
    Then the change set is created with the GoogleOAuthSecretArn parameter set to that secret's address

  Scenario: The roles script leaves the Google secret parameter empty before the secret exists
    Given a fake AWS account with no secrets
    When a person plans the deploy roles with the bootstrap script
    Then the change set is created with the GoogleOAuthSecretArn parameter empty

  Scenario: The new scripts are bash, strict, and use only braced variables
    Given the Google client script and the operator script are read
    Then each script runs under bash with strict settings and valid syntax
    And no variable in either script is written without braces
    And neither script holds a twelve digit account id or an email address
    And the Google client script reads the secret silently and never passes it as an argument

  Scenario: The setup guide puts the Google client first and the first operator last
    Given the setup guide for the Google client and operators is read
    Then the guide names set-google-client.sh, bootstrap.sh, the deploy, the first sign-in and add-operator.sh in that order
