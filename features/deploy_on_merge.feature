Feature: Deploy on merge
  As the operator of Babulus
  I want a merge to main to deploy only after CI passes
  So that a failing change never reaches production and no AWS keys are stored in GitHub

  Scenario: The deploy waits for CI and runs only for main
    Given the CI workflow
    Then the deploy job needs the "node" job
    And the deploy job runs only for a push to main

  Scenario: The deploy uses short-lived credentials
    Given the CI workflow
    Then the deploy job may request a GitHub identity token
    And the deploy job takes its AWS role and app from repository variables

  Scenario: The deploy role can only start builds of this app from main
    Given the deploy role template
    Then the role trusts only the main branch of this repository
    And the role may only start and read Amplify jobs on the main branch
