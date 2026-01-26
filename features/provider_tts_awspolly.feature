Feature: AWS Polly TTS Provider
  As a user
  I want to generate speech using AWS Polly
  So that I can create speech with AWS infrastructure

  Background:
    Given AWS Polly TTS provider is available
    And AWS Polly credentials are configured

  Scenario: Generate speech with default voice
    Given a Polly text "Hello from AWS Polly"
    When I generate speech with AWS Polly
    Then the Polly audio should be generated successfully
    And the Polly audio format should be MP3
    And Polly usage should be tracked

  Scenario: Generate speech with specific voice
    Given a Polly text "Testing voice selection"
    And Polly voice "Joanna" is selected
    When I generate speech with AWS Polly
    Then the Polly audio should be generated with voice "Joanna"

  Scenario: Generate speech with neural engine
    Given a Polly text "Testing neural engine"
    And Polly engine "neural" is selected
    When I generate speech with AWS Polly
    Then the Polly audio should be generated with engine "neural"

  Scenario: Handle API error gracefully
    Given the AWS Polly API returns an error
    And a Polly text "This will fail"
    When I attempt to generate Polly speech
    Then the Polly request should throw an error
    And the Polly error should contain API failure details

  Scenario: Estimate character usage
    Given a Polly text "The quick brown fox jumps over the lazy dog"
    When I estimate Polly character usage
    Then Polly characters should be estimated based on text length
    And the Polly estimate should be positive

  Scenario: Calculate cost from usage
    Given a Polly text is provided
    When I calculate the Polly cost for 1000 characters
    Then the Polly cost should match AWS Polly pricing
    And the Polly cost should be in USD
