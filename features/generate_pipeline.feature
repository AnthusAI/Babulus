Feature: Generate pipeline

  Scenario: Generate composition writes artifacts and usage
    Given a dry-run composition with audio plan
    When I generate the composition
    Then the script should include the cue text "Hello world"
    And the script meta should include width 1280 height 720 fps 30
    And the timeline should include tts and audio tracks
    And the usage breakdown should include "tts"
    And the usage breakdown should include "sfx"
    And the usage breakdown should include "music"
    And the manifest should include segments, sfx, and music
    And the script should include scene markup "goal" "hook"
    And the script should include cue markup "approval" "required"
    And the run metadata should include script and timeline artifacts
    And the generation result should include run metadata

  Scenario: Generate uses cache on second run
    Given a dry-run composition with audio plan
    When I generate the composition
    And I generate the composition again
    Then the first generation should synthesize
    And the second generation should use cache

  Scenario: File clips include volume envelope
    Given a dry-run composition with file clip fade out
    When I generate the composition
    Then the timeline should include a file clip with envelope
