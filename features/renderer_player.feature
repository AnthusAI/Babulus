Feature: Renderer player

  Scenario: Player provides frame context
    Given a player config fps 30 width 1280 height 720 duration 300 starting at frame 12
    When I render the player
    Then the frame probe should read "frame=12 fps=30 timeMs=400"

  Scenario: Seeking updates the frame
    Given a player config fps 30 width 1280 height 720 duration 300 starting at frame 0
    When I render the player
    And I seek to frame 24
    Then the frame probe should read "frame=24 fps=30 timeMs=800"

  Scenario: Autoplay stops at end
    Given a player config fps 1 width 640 height 360 duration 3 starting at frame 0
    And autoplay is enabled
    When I render the player
    And I advance time by 1000 ms
    And I advance time by 1000 ms
    And I advance time by 1000 ms
    Then the frame probe should read "frame=2 fps=1 timeMs=2000"
    And the player should be paused

  Scenario: Looping wraps frames
    Given a player config fps 1 width 640 height 360 duration 3 starting at frame 0
    And autoplay is enabled
    And looping is enabled
    When I render the player
    And I advance time by 1000 ms
    And I advance time by 1000 ms
    And I advance time by 1000 ms
    Then the frame probe should read "frame=0 fps=1 timeMs=0"
