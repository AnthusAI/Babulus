Feature: DSL loader

  Scenario: Load a default export module
    Given a DSL file at "features/fixtures/intro-default.babulus.ts"
    When the video file is loaded
    Then the loaded composition id should be "intro"
    And the loaded scene id should be "title"
    And the loaded cue id should be "hook"

  Scenario: Load a named video export
    Given a DSL file at "features/fixtures/intro-named-video.babulus.ts"
    When the video file is loaded
    Then the loaded composition id should be "intro"

  Scenario: Load a compositions array export
    Given a DSL file at "features/fixtures/intro-compositions.babulus.ts"
    When the video file is loaded
    Then the loaded composition id should be "intro"

  Scenario: Load a single composition export
    Given a DSL file at "features/fixtures/intro-composition.babulus.ts"
    When the video file is loaded
    Then the loaded composition id should be "intro"

  Scenario: Reject invalid exports
    Given a DSL file at "features/fixtures/invalid-export.babulus.ts"
    When the video file is loaded
    Then a parse error should be raised

  Scenario: Reject missing video export
    Given a DSL file at "features/fixtures/invalid-missing-export.babulus.ts"
    When the video file is loaded
    Then a parse error should be raised

  Scenario: Reject invalid composition array
    Given a DSL file at "features/fixtures/invalid-compositions.babulus.ts"
    When the video file is loaded
    Then a parse error should be raised
