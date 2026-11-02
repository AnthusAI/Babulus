Feature: Azure TTS Provider
  As a user
  I want to generate speech using Azure Cognitive Services
  So that I can create speech with Microsoft's TTS

  Background:
    Given Azure TTS provider is available
    And a valid Azure API key is configured

  Scenario: Generate speech with default voice
    Given an Azure text "Hello from Azure"
    When I generate speech with Azure TTS
    Then the Azure audio should be generated successfully
    And the Azure audio format should be MP3
    And Azure usage should be tracked

  Scenario: Generate speech with specific voice
    Given an Azure text "Testing voice selection"
    And Azure voice "en-US-JennyNeural" is selected
    When I generate speech with Azure TTS
    Then the Azure audio should be generated with voice "en-US-JennyNeural"

  Scenario: Generate speech with custom rate
    Given an Azure text "Testing speech rate"
    And Azure rate 1.2 is selected
    When I generate speech with Azure TTS
    Then the Azure audio should be generated at rate 1.2

  Scenario: Handle API error gracefully
    Given the Azure API returns an error
    And an Azure text "This will fail"
    When I attempt to generate Azure speech
    Then the Azure request should throw an error
    And the Azure error should contain API failure details

  Scenario: Estimate character usage
    Given an Azure text "The quick brown fox jumps over the lazy dog"
    When I estimate Azure character usage
    Then Azure characters should be estimated based on text length
    And the Azure estimate should be positive

  Scenario: Calculate cost from usage
    Given an Azure text is provided
    When I calculate the Azure cost for 1000 characters
    Then the Azure cost should match pricing
    And the Azure cost should be in USD
