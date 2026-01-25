Feature: Azure TTS Provider
  As a user
  I want to generate speech using Azure Cognitive Services
  So that I can create speech with Microsoft's TTS

  Background:
    Given Azure TTS provider is available
    And Azure credentials are configured

  Scenario: Generate speech with default voice
    Given a text "Hello from Azure"
    When I generate speech with Azure TTS
    Then the audio should be generated successfully
    And the audio format should be MP3
    And usage should be tracked

  Scenario: Generate speech with specific voice
    Given a text "Testing voice selection"
    And voice "en-US-JennyNeural" is selected
    When I generate speech with Azure TTS
    Then the audio should be generated with voice "en-US-JennyNeural"

  Scenario: Generate speech with custom rate
    Given a text "Testing speech rate"
    And rate 1.2 is selected
    When I generate speech with Azure TTS
    Then the audio should be generated at rate 1.2

  Scenario: Handle API error gracefully
    Given the Azure API returns an error
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
    Then the cost should match Azure pricing
    And the cost should be in USD
