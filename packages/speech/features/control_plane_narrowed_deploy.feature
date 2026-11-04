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
    And the execution role explicitly denies every action on the protected user pool
    And the permissions boundary explicitly denies "iam:*"
    And the permissions boundary explicitly denies "organizations:*"
    And the permissions boundary explicitly denies "account:*"
    And the permissions boundary explicitly denies every action on the protected user pool

  Scenario: The deploy template holds no identifiers of its own
    Given the narrowed deploy template is parsed
    Then the template text contains no twelve digit account id and no email address
    And no role in the template is allowed every action
