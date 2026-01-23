Feature: Usage telemetry summary

  Scenario: Summarize totals
    Given usage events:
      | unit   | quantity | estimated | actual |
      | tokens | 100      | 0.02      | 0.03   |
      | tokens | 50       | 0.01      | 0.01   |
    When I summarize usage
    Then the total quantity should be 150
    And the total estimated cost should be 0.03
    And the total actual cost should be 0.04

  Scenario: Summarize per unit
    Given usage events:
      | unit    | quantity | estimated | actual |
      | frames  | 240      | 0.5       | 0.4    |
      | seconds | 10       | 0.2       | 0.2    |
    When I summarize usage
    Then the unit "frames" quantity should be 240
    And the unit "seconds" quantity should be 10
