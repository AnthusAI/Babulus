Feature: Usage breakdown

  Scenario: Summarize by provider and kind
    Given usage entries:
      | kind  | provider   | unit    | quantity |
      | tts   | openai     | chars   | 100      |
      | sfx   | elevenlabs | seconds | 3        |
      | music | elevenlabs | seconds | 12       |
    When I summarize usage breakdown
    Then the provider "openai" unit "chars" quantity should be 100
    And the provider "elevenlabs" unit "seconds" quantity should be 15
    And the kind "sfx" unit "seconds" quantity should be 3
    And the kind "music" unit "seconds" quantity should be 12
