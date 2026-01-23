Feature: Renderer sequence

  Scenario: Sequence offsets frame
    Given a render context fps 10 width 1280 height 720 duration 300 at frame 15
    And a sequence from 10 duration 20
    When I render the sequence
    Then the sequence probe should read "frame=5 fps=10 timeMs=500"

  Scenario: Sequence hides before start
    Given a render context fps 10 width 1280 height 720 duration 300 at frame 5
    And a sequence from 10 duration 20
    When I render the sequence
    Then the sequence should be hidden

  Scenario: Sequence hides after end
    Given a render context fps 10 width 1280 height 720 duration 300 at frame 30
    And a sequence from 10 duration 20
    When I render the sequence
    Then the sequence should be hidden
