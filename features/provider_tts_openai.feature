Feature: OpenAI TTS Provider
  As a content generator
  I want to use OpenAI TTS for voice synthesis
  So that I can generate natural-sounding speech

  Background:
    Given OpenAI TTS provider is available
    And a valid OpenAI API key is configured

  Scenario: Generate speech with default voice
    Given an OpenAI text "Hello world"
    When I generate speech with OpenAI TTS
    Then the OpenAI audio should be generated successfully
    And the OpenAI audio format should be MP3
    And OpenAI usage should be tracked

  Scenario: Generate speech with specific voice
    Given an OpenAI text "Welcome to the show"
    And OpenAI voice "alloy" is selected
    When I generate speech with OpenAI TTS
    Then the OpenAI audio should be generated with voice "alloy"

  Scenario: Generate speech with custom speed
    Given an OpenAI text "This is a test"
    And OpenAI speed 1.25 is selected
    When I generate speech with OpenAI TTS
    Then the OpenAI audio should be generated at speed 1.25

  Scenario: Handle API error gracefully
    Given an OpenAI text "Test"
    And the OpenAI API returns an error
    When I attempt to generate OpenAI speech
    Then the OpenAI request should throw an error
    And the OpenAI error should contain API failure details

  Scenario: Estimate token usage
    Given an OpenAI text "The quick brown fox jumps over the lazy dog"
    When I estimate token usage
    Then OpenAI tokens should be estimated based on character count
    And the OpenAI estimate should be positive

  Scenario: Calculate cost from usage
    Given 1000 characters were processed
    When I calculate the OpenAI cost
    Then the OpenAI cost should match pricing
    And the OpenAI cost should be in USD
