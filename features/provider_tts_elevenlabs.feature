Feature: ElevenLabs TTS Provider
  As a user
  I want to generate speech using ElevenLabs TTS
  So that I can create high-quality voiceovers

  Background:
    Given ElevenLabs TTS provider is available
    And a valid API key is configured

  Scenario: Generate speech with default voice
    Given a text "Hello world"
    When I generate speech with ElevenLabs TTS
    Then the audio should be generated successfully
    And the audio format should be MP3
    And usage should be tracked

  Scenario: Generate speech with specific voice
    Given a text "Testing voice selection"
    And voice "Rachel" is selected
    When I generate speech with ElevenLabs TTS
    Then the audio should be generated with voice "Rachel"

  Scenario: Generate speech with custom stability
    Given a text "Testing stability control"
    And stability 0.75 is selected
    When I generate speech with ElevenLabs TTS
    Then the audio should be generated at stability 0.75

  Scenario: Handle API error gracefully
    Given the ElevenLabs API returns an error
    And a text "This will fail"
    When I attempt to generate speech
    Then it should throw an error
    And the error should contain API failure details

  Scenario: Estimate character usage
    Given a text "The quick brown fox jumps over the lazy dog"
    When I estimate character usage
    Then characters should be estimated based on text length
    And the estimate should be positive

  Scenario: Calculate cost from usage
    Given a text is provided
    When I calculate the cost for 1000 characters
    Then the cost should match ElevenLabs pricing
    And the cost should be in USD
