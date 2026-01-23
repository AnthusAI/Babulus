Feature: Cache resolver

  Scenario: Load a valid manifest file
    Given a cache workspace
    And a manifest file "manifest.json" with content:
      """
      { "segments": { "/tmp/audio.wav": { "key": "abc", "durationSec": 1.5 } } }
      """
    When I load the manifest at "manifest.json"
    Then the manifest should include section "segments"

  Scenario: Load an invalid manifest file
    Given a cache workspace
    And a manifest file "manifest.json" with content:
      """
      not-json
      """
    When I load the manifest at "manifest.json"
    Then the manifest should be empty

  Scenario: Load a manifest array
    Given a cache workspace
    And a manifest file "manifest.json" with content:
      """
      [1, 2, 3]
      """
    When I load the manifest at "manifest.json"
    Then the manifest should be empty

  Scenario: Match a manifest duration by exact path
    Given a cache workspace
    And a manifest entry for section "segments" and path "segments/file.wav" with key "abc" and duration 1.2
    When I get the manifest duration for section "segments" path "segments/file.wav" with key "abc"
    Then the duration should be 1.2

  Scenario: Match a manifest duration by filename
    Given a cache workspace
    And a manifest entry for section "segments" and path "/abs/segments/file.wav" with key "abc" and duration 2.3
    When I get the manifest duration for section "segments" path "segments/file.wav" with key "abc"
    Then the duration should be 2.3

  Scenario: Resolve cached segment from fallback env
    Given a cache workspace
    And an env "aws" has a "segments" file named "scene--cue--tts--abcdef123456--0.wav" with manifest key "abcdef123456" and duration 1.0
    When I resolve cached segment for env "development" with key "abcdef123456" scene "scene" cue "cue" occurrence 0 ext ".wav"
    Then the cached path should exist
    And the cached env should be "aws"

  Scenario: Ignore cached file with wrong manifest key
    Given a cache workspace
    And an env "development" has a "segments" file named "scene--cue--tts--abcdef123456--0.wav" with manifest key "other-key" and duration 1.0
    When I resolve cached segment for env "development" with key "abcdef123456" scene "scene" cue "cue" occurrence 0 ext ".wav"
    Then the cached path should be null

  Scenario: Resolve cached sfx variant
    Given a cache workspace
    And an env "development" has a "sfx" file named "whoosh--v2--abcdef123456.wav" with manifest key "abcdef123456" and duration 0.5
    When I resolve cached sfx for env "development" with key "abcdef123456" clip "whoosh" variant 1 ext ".wav"
    Then the cached path should exist
    And the cached env should be "development"

  Scenario: Resolve cached music variant
    Given a cache workspace
    And an env "development" has a "music" file named "bed--v1--abcdef123456.wav" with manifest key "abcdef123456" and duration 3.2
    When I resolve cached music for env "development" with key "abcdef123456" clip "bed" variant 0 ext ".wav"
    Then the cached path should exist
    And the cached env should be "development"
