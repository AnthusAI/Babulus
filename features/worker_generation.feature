Feature: Generation Worker Job Processing
  As a worker process
  I want to claim and process generation jobs
  So that users can generate TTS audio and artifacts

  Background:
    Given a worker library initialized
    And OpenAI TTS provider is configured

  Scenario: Successfully claim a queued generation job
    Given a queued generation job exists in the database
    When the worker attempts to claim the next job
    Then the job should be claimed successfully
    And the job status should be "claimed"
    And the claimedByAgentId should be set

  Scenario: No jobs available to claim
    Given no queued jobs exist in the database
    When the worker attempts to claim the next job
    Then no job should be returned
    And no database updates should occur

  Scenario: Concurrent claim attempt fails (optimistic locking)
    Given a queued generation job exists in the database
    And another worker has already claimed the job
    When the worker attempts to claim the same job
    Then no job should be returned
    And the job should remain claimed by the other worker

  Scenario: Process generation job with valid DSL
    Given a claimed generation job with valid DSL source
    And the DSL contains a simple composition with one cue
    When the worker processes the generation job
    Then the DSL should be parsed successfully
    And TTS audio should be generated using OpenAI
    And script.json should be created
    And timeline.json should be created
    And audio.wav should be created
    And artifacts should be uploaded to S3
    And a GenerationRun record should be created
    And usage events should be recorded
    And the job status should be updated to "succeeded"

  Scenario: Process generation job with invalid DSL syntax
    Given a claimed generation job with invalid DSL source
    And the DSL contains syntax errors
    When the worker processes the generation job
    Then DSL parsing should fail
    And the job status should be updated to "failed"
    And the failureReason should contain "Parse error"
    And no artifacts should be uploaded

  Scenario: Handle TTS provider API failure
    Given a claimed generation job with valid DSL source
    And the TTS provider API is unavailable
    When the worker processes the generation job
    Then the generation should fail with network error
    And the job status should be updated to "failed"
    And the failureReason should contain "TTS"

  Scenario: Emit progress events during generation
    Given a claimed generation job with valid DSL source
    When the worker processes the generation job
    Then a JobEvent should be emitted with message "Fetching video data..."
    And a JobEvent should be emitted with message "Parsing DSL..."
    And a JobEvent should be emitted with message "Generating composition..."
    And a JobEvent should be emitted with message "Uploading artifacts..."
    And a JobEvent should be emitted with message "Generation complete!"
    And progress values should increase from 0.0 to 1.0

  Scenario: Clean up temporary files after successful generation
    Given a claimed generation job with valid DSL source
    When the worker processes the generation job
    Then temporary working directory should be created
    And temporary DSL file should be written
    And generation artifacts should be created in temp directory
    And all temporary files should be cleaned up after completion

  Scenario: Clean up temporary files even after failure
    Given a claimed generation job with invalid DSL source
    When the worker processes the generation job
    Then temporary working directory should be created
    And all temporary files should be cleaned up despite failure

  Scenario: Record usage events for TTS generation
    Given a claimed generation job with valid DSL source
    And the composition generates 5 TTS cues
    When the worker processes the generation job
    Then 5 usage events should be created
    And each usage event should have provider "openai"
    And each usage event should have unitType "tokens"
    And total estimated cost should be calculated
    And usage events should be persisted to database

  Scenario: Process job with missing video
    Given a claimed generation job referencing non-existent video
    When the worker processes the generation job
    Then the job should fail with "Video not found"
    And the job status should be updated to "failed"

  Scenario: Process job with missing storyboard version
    Given a claimed generation job with null storyboardVersionId
    When the worker processes the generation job
    Then the default DSL template should be used
    And generation should proceed normally

  Scenario: Update job status after success
    Given a completed generation job
    When updating job status to "succeeded"
    Then the job status field should be "succeeded"
    And no failureReason should be set

  Scenario: Update job status after failure with error message
    Given a failed generation job
    When updating job status to "failed" with reason "Network timeout"
    Then the job status field should be "failed"
    And the failureReason field should be "Network timeout"

  Scenario: Retry failed job when retryCount < maxRetries
    Given a claimed generation job that will fail
    And the job has retryCount 0 and maxRetries 3
    When the job fails with error "TTS API timeout"
    Then the job should be re-queued
    And the retryCount should be 1
    And the retry failureReason should contain "Retry 1/3: TTS API timeout"
    And the claimedByAgentId should be cleared

  Scenario: Permanent failure when retryCount >= maxRetries
    Given a claimed generation job that will fail
    And the job has retryCount 2 and maxRetries 3
    When the job fails with error "TTS API timeout"
    Then the job status should be "failed"
    And the retryCount should be 3
    And the retry failureReason should contain "Failed after 3 attempts"
    And the retry failureReason should contain "TTS API timeout"

  Scenario: Retry after transient network error
    Given a claimed generation job with valid DSL source
    And the TTS provider returns a transient error
    When the worker processes the generation job
    Then the job should be re-queued for retry
    And the retryCount should be incremented
    And a JobEvent should be emitted indicating retry
