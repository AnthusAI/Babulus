Feature: Cloud render containment
  As the operator of Babulus
  I want cloud rendering switched off and job writes closed to the public
  So that a stuck job or an anonymous caller cannot start paid compute

  Cloud rendering stays paused until the capped local-first fallback replaces it.

  Scenario: A deploy does not switch the render trigger back on
    Given the Studio backend definition
    Then the render trigger's event source is disabled

  Scenario: The data API has no API key
    Given the Studio data schema
    Then no model allows a public API key
    And the data API does not create an API key
    And the "Job" model allows signed-in users
    And the "PublishedVideo" model allows signed-in users

  Scenario: Nothing in the app signs requests with an API key
    Given the Studio application source
    Then no request uses the API key authorization mode
