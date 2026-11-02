Feature: Render Worker Job Processing
  As a worker process
  I want to claim and process render jobs
  So that users can render MP4 videos from generation artifacts

  Background:
    Given a worker library initialized
    And render dependencies are available

  Scenario: Successfully claim a queued render job
    Given a queued render job exists in the database
    When the worker attempts to claim the next render job
    Then the render job should be claimed successfully
    And the render job status should be "claimed"
    And the render claimedByAgentId should be set

  Scenario: Process render job with valid generation run
    Given a claimed render job with valid generation run
    And the generation run has script, timeline, and audio artifacts
    When the worker processes the render job
    Then the artifacts should be downloaded from S3
    And the video should be rendered with Playwright
    And the MP4 should be encoded with ffmpeg
    And the MP4 should be uploaded to S3
    And a RenderRun record should be created
    And usage events should be recorded for frames rendered
    And the render job status should be updated to "succeeded"

  Scenario: Process render job with missing generation run
    Given a claimed render job referencing non-existent generation run
    When the worker processes the render job
    Then the render job should fail with "Generation run not found"
    And the render job status should be updated to "failed"

  Scenario: Process render job with missing script artifact
    Given a claimed render job with valid generation run
    And the generation run has no script artifact
    When the worker processes the render job
    Then the render job should fail with "No script artifact found"
    And the render job status should be updated to "failed"

  Scenario: Emit progress events during rendering
    Given a claimed render job with valid generation run
    When the worker processes the render job
    Then a render JobEvent should be emitted with message "Fetching generation run..."
    And a render JobEvent should be emitted with message "Downloading artifacts..."
    And a render JobEvent should be emitted with message "Rendering video..."
    And a render JobEvent should be emitted with message "Uploading video..."
    And a render JobEvent should be emitted with message "Creating render run..."
    And a render JobEvent should be emitted with message "Render complete!"
    And render progress values should increase from 0.0 to 1.0

  Scenario: Clean up temporary files after successful render
    Given a claimed render job with valid generation run
    When the worker processes the render job
    Then temporary render working directory should be created
    Then temporary files should be written (script, timeline, audio, frames)
    And all temporary files should be cleaned up after completion

  Scenario: Retry failed render job when retryCount < maxRetries
    Given a claimed render job that will fail
    And the render job has retryCount 0 and maxRetries 3
    When the render job fails with error "Playwright crashed"
    Then the render job should be re-queued
    And the render retryCount should be 1
    And the render retry failureReason should contain "Retry 1/3: Playwright crashed"

  Scenario: Permanent failure when retryCount >= maxRetries
    Given a claimed render job that will fail
    And the render job has retryCount 2 and maxRetries 3
    When the render job fails with error "Playwright crashed"
    Then the render job status should be "failed"
    And the render retryCount should be 3
    And the render retry failureReason should contain "Failed after 3 attempts"

  Scenario: Record usage events for rendered frames
    Given a claimed render job with valid generation run
    And the video is 10 seconds at 30 fps
    When the worker processes the render job
    Then a usage event should be created with 300 frames
    And the usage event should have provider "babulus-renderer"
    And the usage event should have unitType "frames"
    And the estimated cost should be calculated correctly
