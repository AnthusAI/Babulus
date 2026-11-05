Feature: The control plane deploys through narrowed roles that cannot act outside its stack

  The CDK bootstrap in the production account gives its CloudFormation
  execution role full administrator access, so code merged to main would be
  able to change anything in the account. The narrowed path replaces it. The
  stack synthesizes with every role it creates capped by one permissions
  boundary, and a separate CloudFormation template defines the boundary, an
  execution role that can only manage this stack's resource types, and an
  OIDC role that only main of this repository can assume. Every check here
  reads a synthesized or parsed template, so nothing is deployed and no AWS
  credentials are needed.

  Scenario: Every role the stack creates carries the permissions boundary
    Given the control plane app is synthesized in narrowed deploy mode
    Then every IAM role in the stack has the permissions boundary "babulus-control-plane-boundary"
    And no IAM role in the stack has the AdministratorAccess policy
    And no IAM role in the stack is allowed every action

  Scenario: The boundary allows every action the stack roles actually use
    Given the control plane app is synthesized in narrowed deploy mode
    And the narrowed deploy template is parsed
    Then every action granted to a stack role is allowed by the permissions boundary

  Scenario: The stack is unchanged when narrowed deploy mode is off
    Given the control plane app is synthesized
    Then no IAM role in the stack has a permissions boundary

  Scenario: Only main of this repository can assume the deploy role
    Given the narrowed deploy template is parsed
    Then the deploy role trusts only the GitHub OIDC provider parameter
    And the deploy role subject is the immutable main branch subject of this repository
    And the deploy role audience is sts.amazonaws.com

  Scenario: The deploy role cannot assume the CDK bootstrap roles
    Given the narrowed deploy template is parsed
    Then no statement in the deploy role allows assuming any role
    And the deploy role explicitly denies assuming roles named cdk

  Scenario: The deploy role passes only the execution role to CloudFormation
    Given the narrowed deploy template is parsed
    Then the deploy role passes only the execution role and only to cloudformation.amazonaws.com
    And the deploy role creates change sets only with the execution role

  Scenario: The execution role creates roles only with the boundary
    Given the narrowed deploy template is parsed
    Then the execution role allows iam:CreateRole only on roles named BabulusControlPlane with the boundary condition
    And the execution role allows iam:PassRole only on roles named BabulusControlPlane and only to named services
    And the execution role is assumed only by cloudformation.amazonaws.com

  Scenario: The execution role and the boundary carry the explicit denials
    Given the narrowed deploy template is parsed
    Then the execution role explicitly denies "iam:DeleteRolePermissionsBoundary"
    And the execution role explicitly denies "iam:CreatePolicyVersion"
    And the execution role explicitly denies "iam:CreateUser"
    And the execution role explicitly denies "iam:CreateAccessKey"
    And the execution role explicitly denies "ec2:RunInstances"
    And the execution role explicitly denies "amplify:*"
    And the execution role explicitly denies every action on the protected user pools
    And the permissions boundary explicitly denies "iam:*"
    And the permissions boundary explicitly denies "organizations:*"
    And the permissions boundary explicitly denies "account:*"
    And the permissions boundary explicitly denies every action on the protected user pools
    And the execution role explicitly denies every CloudFront action on the protected distribution

  Scenario: Lambda layers are named under the stack prefix and the execution role reaches only those
    Given the control plane app is synthesized in narrowed deploy mode
    And the narrowed deploy template is parsed
    Then every Lambda layer in the stack is named with the prefix "BabulusControlPlane-"
    And the execution role allows layer actions only on layers named BabulusControlPlane

  Scenario: The deploy role can delete only a stack left by a failed first create, and only through the execution role
    Given the narrowed deploy template is parsed
    Then the deploy role allows cloudformation:DeleteStack only on the BabulusControlPlane stack and only with the execution role

  Scenario: The deploy workflow masks context values before CDK can print them
    Given the control plane deploy workflow is read
    Then every mask command is printed with an immediate flush
    And the output is flushed before the CDK process starts
    And only context values of at least 4 characters are masked

  Scenario: The deploy template holds no identifiers of its own
    Given the narrowed deploy template is parsed
    Then the template text contains no twelve digit account id and no email address
    And no role in the template is allowed every action

  Scenario: Every policy in the deploy template fits the limits IAM enforces
    Given the narrowed deploy template is parsed
    Then every managed policy in the template fits the 6144 character limit
    And the inline policies of every role fit the 10240 character limit
    And the execution role attaches its resource policy under the name the role cannot change

  Scenario: The bootstrap script builds well formed addresses and stops on the wrong account
    Given the deploy bootstrap script is read
    Then the script runs under bash and has valid bash syntax
    And no shell variable in the script is directly followed by a colon
    And the script holds no twelve digit account id
    And the script stops unless the signed in account is the one named on the command line
    And the script selects the GitHub OIDC provider by name
    And the script deletes the stack only from the ROLLBACK_COMPLETE state
    And the script shows the change set and asks before applying
    And the script can show the change set without applying it
    And the script checks that the deployed template matches main

  Scenario: A refused deploy tells the reader which command to run
    Given the control plane deploy workflow is read
    Then a failed deploy names the bootstrap command and the setup guide

  Scenario: A deploy clears the empty stack a failed first create leaves behind
    Given the control plane deploy workflow is read
    Then the workflow deletes the stack only from ROLLBACK_COMPLETE and only through the execution role, before CDK runs

  Scenario: A deploy warns when the roles are behind the template in the repository
    Given the control plane deploy workflow is read
    Then the workflow warns about out of date roles before it deploys and does not stop for it
    Given the narrowed deploy template is parsed
    Then the deploy role can do nothing to its own roles stack but read its template

  Scenario: No policy repeats a statement id
    Given the narrowed deploy template is parsed
    Then no policy in the template repeats a statement id

  Scenario: The private settings script refuses a values file it cannot trust
    Given the deploy context script is read
    Then the script runs under bash and has valid bash syntax
    And the script stops unless the signed in account is the one named on the command line
    And the script refuses a values file that still holds placeholders
    And the script writes a SecureString parameter
    And the example values file holds only placeholders

  Scenario: Someone setting up a new account is told what to do and in what order
    Given the new account setup guide is read
    Then the guide names every stack under infra
    And the guide names the deploy context script and the bootstrap script
    And the README and AGENTS both link to the guide
