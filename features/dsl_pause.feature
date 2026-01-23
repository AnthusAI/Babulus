Feature: Pause helper

  Scenario: Create a fixed pause
    When I create a fixed pause of 0.4 seconds
    Then the pause spec should be fixed with seconds 0.4

  Scenario: Create a gaussian pause
    When I create a gaussian pause with mean 0.4 std 0.1 min 0.1 max 0.8
    Then the pause spec should be gaussian with mean 0.4 std 0.1 min 0.1 max 0.8

  Scenario: Normalize a numeric pause
    When I normalize a pause value of 0.25
    Then the pause spec should be fixed with seconds 0.25

  Scenario: Validate pause specs
    When I check if a fixed pause of 0.2 seconds is valid
    Then the pause validity should be true
    When I check if an invalid pause value is valid
    Then the pause validity should be false
