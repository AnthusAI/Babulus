Feature: ElevenLabs Music Provider
  As a user
  I want to generate music using ElevenLabs Music API
  So that I can create custom background music

  Background:
    Given ElevenLabs Music provider is available
    And a valid API key is configured

  Scenario: Generate music with default settings
    Given a prompt "upbeat electronic music"
    And duration 30 seconds
    When I generate music with ElevenLabs
    Then the audio should be generated successfully
    And the audio format should be MP3
    And usage should be tracked

  Scenario: Generate music with specific duration
    Given a prompt "relaxing piano melody"
    And duration 60 seconds
    When I generate music with ElevenLabs
    Then the audio should be generated with duration 60 seconds

  Scenario: Handle API error gracefully
    Given the ElevenLabs Music API returns an error
    And a prompt "This will fail"
    And duration 10 seconds
    When I attempt to generate music
    Then it should throw an error
    And the error should contain API failure details

  Scenario: Calculate cost from usage
    Given a duration of 30 seconds
    When I calculate the music generation cost
    Then the cost should match ElevenLabs music pricing
    And the cost should be in USD
