Feature: Hash utilities

  Scenario: Stable stringify orders object keys
    When I stable stringify object:
      | key | value |
      | b   | 2     |
      | a   | 1     |
    Then the stable string should be:
      """
      {"a":1,"b":2}
      """

  Scenario: Stable stringify nested objects
    When I stable stringify object:
      | key | value |
      | outer.inner | 3 |
    Then the stable string should be:
      """
      {"outer":{"inner":3}}
      """

  Scenario: Hash key is stable for unordered input
    When I hash the object:
      | key | value |
      | b   | 2     |
      | a   | 1     |
    And I hash the object:
      | key | value |
      | a   | 1     |
      | b   | 2     |
    Then the two hashes should be equal
