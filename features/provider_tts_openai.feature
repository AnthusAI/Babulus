Feature: OpenAI TTS Provider
  As a content generator
  I want to use OpenAI TTS for voice synthesis
  So that I can generate natural-sounding speech

  Background:
    Given OpenAI TTS provider is available
    And a valid API key is configured

  Scenario: Generate speech with default voice
    Given a text "Hello world"
    When I generate speech with OpenAI TTS
    Then the audio should be generated successfully
    And the audio format should be MP3
    And usage should be tracked

  Scenario: Generate speech with specific voice
    Given a text "Welcome to the show"
    And voice "alloy" is selected
    When I generate speech with OpenAI TTS
    Then the audio should be generated with voice "alloy"

  Scenario: Generate speech with custom speed
    Given a text "This is a test"
    And speed 1.25 is selected
    When I generate speech with OpenAI TTS
    Then the audio should be generated at speed 1.25

  Scenario: Handle API error gracefully
    Given a text "Test"
    And the OpenAI API returns an error
    When I attempt to generate speech
    Then it should throw an error
    And the error should contain API failure details

  Scenario: Estimate token usage
    Given a text "The quick brown fox jumps over the lazy dog"
    When I estimate token usage
    Then tokens should be estimated based on character count
    And the estimate should be positive

  Scenario: Calculate cost from usage
    Given 1000 characters were processed
    When I calculate the cost
    Then the cost should match OpenAI pricing
    And the cost should be in USD
