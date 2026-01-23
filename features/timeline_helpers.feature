Feature: Timeline helpers

  Scenario: Summarize timeline duration and counts
    Given a sample timeline with tracks and clips
    When I summarize the timeline
    Then the timeline summary should be track count 2 clip count 3 duration 12

  Scenario: Active clips by time
    Given a sample timeline with tracks and clips
    When I find active clips at 4.5 seconds
    Then active clips should include "music:bed"
    And active clips should include "sfx:hit"
    And active clips should not include "music:swell"

  Scenario: Layout positions reflect duration
    Given a sample timeline with tracks and clips
    When I build the timeline layout for duration 12
    Then the layout should include clip "music:bed" left 0 width 83.33
    And the layout should include clip "music:swell" left 83.33 width 16.67
    And the layout should include clip "sfx:hit" left 33.33 width 8.33
