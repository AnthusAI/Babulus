Feature: ElevenLabs SFX Provider
  As a user
  I want to generate sound effects using ElevenLabs SFX API
  So that I can create custom sound effects

  Background:
    Given ElevenLabs SFX provider is available
    And a valid API key is configured

  Scenario: Generate sound effect with default settings
    Given a prompt "door slam"
    And duration 3 seconds
    When I generate SFX with ElevenLabs
    Then the audio should be generated successfully
    And the audio format should be MP3
    And usage should be tracked

  Scenario: Generate sound effect with specific duration
    Given a prompt "car horn"
    And duration 5 seconds
    When I generate SFX with ElevenLabs
    Then the audio should be generated with duration 5 seconds

  Scenario: Handle API error gracefully
    Given the ElevenLabs SFX API returns an error
    And a prompt "This will fail"
    And duration 2 seconds
    When I attempt to generate SFX
    Then it should throw an error
    And the error should contain API failure details

  Scenario: Calculate cost from usage
    Given a duration of 3 seconds
    When I calculate the SFX generation cost
    Then the cost should match ElevenLabs SFX pricing
    And the cost should be in USD
