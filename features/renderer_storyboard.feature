Feature: Storyboard renderer

  Scenario: Storyboard shows active scene and cue
    Given a storyboard script with scenes and cues
    And a storyboard render config fps 1 width 640 height 360 duration 4
    When I render the storyboard at frame 0
    Then the storyboard HTML should include "Intro Scene"
    And the storyboard HTML should include "Hello"
    When I render the storyboard at frame 2
    Then the storyboard HTML should include "World"
