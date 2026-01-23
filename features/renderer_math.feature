Feature: Renderer math helpers

  Scenario: Convert frame to time
    When I convert frame 30 at 30 fps to time
    Then the time should be 1000

  Scenario: Convert time to frame
    When I convert time 1500 at 30 fps to frame
    Then the frame should be 45

  Scenario: Clamp values
    When I clamp 5 between 0 and 3
    Then the clamped value should be 3

  Scenario: Interpolate without clamp
    When I interpolate value 5 from 0 to 10 into 0 to 100
    Then the interpolated value should be 50

  Scenario: Interpolate with clamp
    When I interpolate value 20 from 0 to 10 into 0 to 100 with clamp
    Then the interpolated value should be 100

  Scenario: Interpolate with easing
    When I interpolate value 2.5 from 0 to 10 into 0 to 100 with easing "easeInOutQuad"
    Then the interpolated value should be 12.5

  Scenario: Spring starts at from value
    When I compute spring from 0 to 1 at frame 0 fps 30
    Then the spring value should be 0

  Scenario: Spring returns target when no displacement
    When I compute spring from 2 to 2 at frame 10 fps 30
    Then the spring value should be 2
