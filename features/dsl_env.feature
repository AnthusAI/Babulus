Feature: DSL environment resolution

  Scenario: Resolve override for active environment
    Given the environment is "production"
    When I resolve default "default" with overrides:
      | env         | value |
      | development | dev   |
      | production  | prod  |
    Then the resolved value should be "prod"

  Scenario: Use fallback when active override missing
    Given the environment is "staging"
    And the fallback list is "production"
    When I resolve default "default" with overrides:
      | env        | value |
      | production | prod  |
    Then the resolved value should be "prod"

  Scenario: Use default when no override matches
    Given the environment is "development"
    When I resolve default "default" with overrides:
      | env        | value |
      | production | prod  |
    Then the resolved value should be "default"

  Scenario: Resolve default when environment is unset
    Given the environment is unset
    When I resolve default "default" with overrides:
      | env        | value |
      | production | prod  |
    Then the resolved value should be "default"
