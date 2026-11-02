Feature: ElevenLabs Music Provider
  As a user
  I want to generate music using ElevenLabs Music API
  So that I can create custom background music

  Background:
    Given ElevenLabs Music provider is available
    And a valid ElevenLabs Music API key is configured

  Scenario: Generate music with default settings
    Given a music prompt "upbeat electronic music"
    And music duration 30 seconds
    When I generate music with ElevenLabs
    Then the music audio should be generated successfully
    And the music audio format should be MP3
    And music usage should be tracked

  Scenario: Generate music with specific duration
    Given a music prompt "relaxing piano melody"
    And music duration 60 seconds
    When I generate music with ElevenLabs
    Then the music audio should be generated with duration 60 seconds

  Scenario: Handle API error gracefully
    Given the ElevenLabs Music API returns an error
    And a music prompt "This will fail"
    And music duration 10 seconds
    When I attempt to generate music
    Then the music request should throw an error
    And the music error should contain API failure details

  Scenario: Calculate cost from usage
    Given a music duration of 30 seconds
    When I calculate the music generation cost
    Then the music cost should match ElevenLabs pricing
    And the music cost should be in USD
