Feature: Usage ledger

  Scenario: Summarize usage entries
    Given a usage ledger
    When I record a tts usage of 120 chars
    And I record a music usage of 12 seconds
    Then the usage summary total quantity should be 132
    And the usage summary unit "chars" quantity should be 120
    And the usage summary unit "seconds" quantity should be 12
