Feature: Video config derivation

  Scenario: Derive config from script meta and timeline
    Given a script with fps 24 width 1920 height 1080 duration 10
    And the script scenes end at 8 and 12
    And a timeline duration of 15 seconds
    When I derive the video config with defaults fps 30 width 1280 height 720
    Then the derived config should be fps 24 width 1920 height 1080 duration 15 frames 360

  Scenario: Derive config falls back to defaults
    Given an empty script
    And no timeline data
    When I derive the video config with defaults fps 30 width 640 height 360
    Then the derived config should be fps 30 width 640 height 360 duration 0 frames 1
