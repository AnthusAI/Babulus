Feature: Usage summary

  Scenario: Summarize usage events
    Given usage events
      | unitType | quantity | estimatedCost | actualCost |
      | tokens   | 1200     | 1.2           | 1.1        |
      | seconds  | 90       | 0.8           | none       |
      | bytes    | 1048576  | none          | none       |
    When I summarize usage events
    Then the usage summary tokens should be "1200"
    And the usage summary seconds should be "90"
    And the usage summary bytes should be "1048576"
    And the usage summary estimated cost should be "2.0"
    And the usage summary actual cost should be "1.1"
