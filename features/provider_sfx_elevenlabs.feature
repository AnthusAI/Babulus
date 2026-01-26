Feature: ElevenLabs SFX Provider
  As a user
  I want to generate sound effects using ElevenLabs SFX API
  So that I can create custom sound effects

  Background:
    Given ElevenLabs SFX provider is available
    And a valid ElevenLabs SFX API key is configured

  Scenario: Generate sound effect with default settings
    Given a SFX prompt "door slam"
    And SFX duration 3 seconds
    When I generate SFX with ElevenLabs
    Then the SFX audio should be generated successfully
    And the SFX audio format should be MP3
    And SFX usage should be tracked

  Scenario: Generate sound effect with specific duration
    Given a SFX prompt "car horn"
    And SFX duration 5 seconds
    When I generate SFX with ElevenLabs
    Then the SFX audio should be generated with duration 5 seconds

  Scenario: Handle API error gracefully
    Given the ElevenLabs SFX API returns an error
    And a SFX prompt "This will fail"
    And SFX duration 2 seconds
    When I attempt to generate SFX
    Then the SFX request should throw an error
    And the SFX error should contain API failure details

  Scenario: Calculate cost from usage
    Given a SFX duration of 3 seconds
    When I calculate the SFX generation cost
    Then the SFX cost should match ElevenLabs pricing
    And the SFX cost should be in USD
