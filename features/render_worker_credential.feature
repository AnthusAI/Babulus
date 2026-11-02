Feature: Render worker credential
  As the operator of Babulus Studio
  I want the render worker's Cognito password generated at deploy time and kept only in an SSM SecureString
  So that no password lives in source control and redeploying with a new rotation value rotates it

  The render worker signs in to Cognito as a dedicated service user.
  A deploy-time custom resource generates its password, sets it on that Cognito user
  and writes it to an SSM SecureString, which ECS injects into the container at task start.

  Scenario: First deploy creates the worker user and stores a generated password
    Given the worker user does not exist in the user pool
    When the credential resource is created
    Then the worker user is created without an invitation message
    And the worker user's permanent password is the generated password
    And the SSM SecureString holds the generated password
    And the resource result does not contain the password

  Scenario: Deploying into a pool where the worker user already exists rotates its password
    Given the worker user already exists in the user pool
    When the credential resource is created
    Then no worker user is created
    And the worker user's permanent password is the generated password
    And the SSM SecureString holds the generated password

  Scenario: Changing the rotation value issues a new password
    Given the worker user already exists in the user pool
    And the credential resource was created with one password
    When the credential resource is updated
    Then the worker user's permanent password is a new generated password
    And the SSM SecureString holds the new password

  Scenario: Removing the credential resource deletes the stored password
    Given the credential resource was created with one password
    When the credential resource is deleted
    Then the SSM SecureString is deleted
    And the worker user's password is not changed

  Scenario: Generated passwords meet the Cognito password policy
    When a worker password is generated
    Then it is at least 40 characters long
    And it contains an uppercase letter, a lowercase letter, a digit and a symbol
    And a second generated password is different
