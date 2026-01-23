Feature: Video storyboard helpers

  Scenario: Active scene selected by time
    Given a script with scenes:
      | id    | start | end |
      | intro | 0     | 4   |
      | body  | 4     | 9   |
    When I find the active scene at 5 seconds
    Then the active scene should be "body"

  Scenario: Active cue selected by time
    Given a script with scenes:
      | id    | start | end |
      | intro | 0     | 6   |
    And scene "intro" has cues:
      | id     | start | end |
      | hook   | 0     | 2   |
      | payoff | 2     | 6   |
    When I find the active cue at 2.5 seconds
    Then the active cue should be "payoff"

  Scenario: No active scene or cue outside range
    Given a script with scenes:
      | id    | start | end |
      | intro | 0     | 2   |
    When I find the active scene at 3 seconds
    Then there should be no active scene
    When I find the active cue at 3 seconds
    Then there should be no active cue
