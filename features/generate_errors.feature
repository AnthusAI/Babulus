Feature: Generate errors

  Scenario: Lead-in is incompatible with scene times
    Given a dry-run composition with lead-in and scene time
    When I attempt to generate the composition
    Then the generation error should include "voiceover.leadInSeconds is only supported"

  Scenario: Duplicate cue ids are rejected
    Given a dry-run composition with duplicate cue ids
    When I attempt to generate the composition
    Then the generation error should include "Duplicate cue id across scenes"

  Scenario: Audio clip references unknown cue
    Given a dry-run composition with an audio clip referencing a missing cue
    When I attempt to generate the composition
    Then the generation error should include "Unknown cue in audio start"

  Scenario: SFX pick must be within variants
    Given a dry-run composition with an out-of-range sfx pick
    When I attempt to generate the composition
    Then the generation error should include "sfx pick out of range"

  Scenario: Scene overlaps are rejected
    Given a dry-run composition with overlapping scene times
    When I attempt to generate the composition
    Then the generation error should include "starts before previous scene ends"

  Scenario: Scene must include cues
    Given a dry-run composition with no cues
    When I attempt to generate the composition
    Then the generation error should include "has no cues"

  Scenario: Audio clip references unknown scene
    Given a dry-run composition with an audio clip referencing a missing scene
    When I attempt to generate the composition
    Then the generation error should include "Unknown scene in audio start"

  Scenario: Music duration cannot be inferred
    Given a dry-run composition with a music clip outside scenes
    When I attempt to generate the composition
    Then the generation error should include "Cannot infer scene duration for music clip"

  Scenario: Music duration must be positive
    Given a dry-run composition with non-positive music duration
    When I attempt to generate the composition
    Then the generation error should include "Non-positive music duration"

  Scenario: Music pick must be within variants
    Given a dry-run composition with an out-of-range music pick
    When I attempt to generate the composition
    Then the generation error should include "music pick out of range"
