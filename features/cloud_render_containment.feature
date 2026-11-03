Feature: Cloud render containment
  As the operator of Babulus
  I want rendering to run only on a worker the user starts, and job writes closed to the public
  So that a stuck job or an anonymous caller cannot start paid compute

  The Studio backend has no cloud render path and runs no compute of its own:
  no function, schedule, alarm or event source. The check reads every source
  file under the Amplify folder, not only backend.ts. A video is rendered by a local
  worker; a capped cloud fallback, if it ever returns, is added deliberately
  with its own spending guards.

  Scenario: The Studio backend defines no container or batch compute
    Given the Studio backend definition
    Then it imports no ECS, EC2, ECR or Batch constructs
    And it grants no permission to run tasks or submit batch jobs

  Scenario: Nothing reacts to Job table changes to start work
    Given the Studio backend definition
    Then it attaches no event source to any table

  Scenario: The Studio backend has no function and no schedule
    Given the Studio backend definition
    Then it defines no function and no schedule

  Scenario: There is no render worker credential
    Given the Studio backend definition
    Then it creates no worker user, no custom resource and no password parameter

  Scenario: The worker credential guard still rejects a real worker user
    Given a backend definition that creates a worker user, a custom resource and a password parameter
    Then the worker credential guard rejects it

  Scenario: The worker credential guard accepts closing self sign-up
    Given a backend definition that only closes self sign-up on the user pool
    Then the worker credential guard accepts it

  Scenario: A worker user hidden in the sealing folder is still rejected
    Given a backend definition whose sealing folder also makes a worker user
    Then the worker credential guard rejects it

  Scenario: A custom resource outside the sealing folder is still rejected
    Given a backend definition with a custom resource outside the sealing folder
    Then the worker credential guard rejects it

  Scenario: The old cloud render path is gone from the repository
    Then none of the old render path files exist

  Scenario: The Studio never queues a render job
    Given the Studio web source
    Then no code creates a job of kind "render"

  Scenario: The data API has no API key
    Given the Studio data schema
    Then no model allows a public API key
    And the data API does not create an API key
    And the "Job" model allows only members of the Account named by the row
    And the "PublishedVideo" model allows only members of the Account named by the row

  Scenario: Nothing in the app signs requests with an API key
    Given the Studio application source
    Then no request uses the API key authorization mode
