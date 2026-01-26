Feature: ElevenLabs TTS Provider
  As a user
  I want to generate speech using ElevenLabs TTS
  So that I can create high-quality voiceovers

  Background:
    Given ElevenLabs TTS provider is available
    And a valid ElevenLabs TTS API key is configured

  Scenario: Generate speech with default voice
    Given an ElevenLabs TTS text "Hello world"
    When I generate speech with ElevenLabs TTS
    Then the ElevenLabs TTS audio should be generated successfully
    And the ElevenLabs TTS audio format should be MP3
    And ElevenLabs TTS usage should be tracked

  Scenario: Generate speech with specific voice
    Given an ElevenLabs TTS text "Testing voice selection"
    And ElevenLabs TTS voice "Rachel" is selected
    When I generate speech with ElevenLabs TTS
    Then the ElevenLabs TTS audio should be generated with voice "Rachel"

  Scenario: Generate speech with custom stability
    Given an ElevenLabs TTS text "Testing stability control"
    And ElevenLabs TTS stability 0.75 is selected
    When I generate speech with ElevenLabs TTS
    Then the ElevenLabs TTS audio should be generated at stability 0.75

  Scenario: Handle API error gracefully
    Given the ElevenLabs API returns an error
    And an ElevenLabs TTS text "This will fail"
    When I attempt to generate ElevenLabs TTS speech
    Then the ElevenLabs TTS request should throw an error
    And the ElevenLabs TTS error should contain API failure details

  Scenario: Estimate character usage
    Given an ElevenLabs TTS text "The quick brown fox jumps over the lazy dog"
    When I estimate ElevenLabs TTS character usage
    Then ElevenLabs TTS characters should be estimated based on text length
    And the ElevenLabs TTS estimate should be positive

  Scenario: Calculate cost from usage
    Given an ElevenLabs TTS text is provided
    When I calculate the ElevenLabs TTS cost for 1000 characters
    Then the ElevenLabs TTS cost should match pricing
    And the ElevenLabs TTS cost should be in USD
