Feature: AWS Polly TTS Provider
  As a user
  I want to generate speech using AWS Polly
  So that I can create speech with AWS infrastructure

  Background:
    Given AWS Polly TTS provider is available
    And AWS credentials are configured

  Scenario: Generate speech with default voice
    Given a text "Hello from AWS Polly"
    When I generate speech with AWS Polly
    Then the audio should be generated successfully
    And the audio format should be MP3
    And usage should be tracked

  Scenario: Generate speech with specific voice
    Given a text "Testing voice selection"
    And voice "Joanna" is selected
    When I generate speech with AWS Polly
    Then the audio should be generated with voice "Joanna"

  Scenario: Generate speech with neural engine
    Given a text "Testing neural engine"
    And engine "neural" is selected
    When I generate speech with AWS Polly
    Then the audio should be generated with engine "neural"

  Scenario: Handle API error gracefully
    Given the AWS Polly API returns an error
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
    Then the cost should match AWS Polly pricing
    And the cost should be in USD
