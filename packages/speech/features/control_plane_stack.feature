Feature: The control plane deploys as one Babulus stack that signs people in with Google only

  The control plane has never been deployed to the production AWS account, so
  its names can carry the merged product's name from the first deploy. The
  stack is called BabulusControlPlane and the worker image repository is
  babulus-worker. Operators sign in through Google, so no app client on the
  Cognito user pool accepts a password. Every check here reads the
  synthesized template, so nothing is deployed and no AWS credentials are
  needed.

  Scenario: The synthesized stack carries the Babulus names
    Given the control plane app is synthesized
    Then the stack is named "BabulusControlPlane"
    And the worker image repository is named "babulus-worker"
    And no logical resource id contains the old product name

  Scenario: No app client accepts a password
    Given the control plane app is synthesized
    Then no Cognito app client allows USER_PASSWORD_AUTH
    And every Cognito app client allows SRP sign-in

  Scenario: Every app client signs in through Google and nothing else
    Given the control plane app is synthesized
    Then every Cognito app client lists Google as its only sign-in provider

  Scenario: The cloud switch route is behind the operator authorizer and the browser may call it
    Given the control plane app is synthesized
    Then the route "PATCH /sites/{id}" requires the operator authorizer
    And the route "GET /sites" requires the operator authorizer
    And the API allows the PATCH method from a browser
