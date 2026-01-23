Feature: DSL validation

  Scenario: Valid video spec passes
    Given a valid video spec
    When I validate the video spec
    Then the validation should succeed

  Scenario: Missing id fails
    Given a video spec without an id
    When I validate the video spec
    Then the validation should fail with path "id"

  Scenario: Invalid storyboard scenes fails
    Given a video spec with invalid storyboard scenes
    When I validate the video spec
    Then the validation should fail with path "storyboard.scenes"

  Scenario: Invalid cue content fails
    Given a video spec with invalid cue content
    When I validate the video spec
    Then the validation should fail with path "storyboard.scenes[0].cues[0].content"

  Scenario: Invalid cue markup fails
    Given a video spec with invalid cue markup
    When I validate the video spec
    Then the validation should fail with path "storyboard.scenes[0].cues[0].markup"
