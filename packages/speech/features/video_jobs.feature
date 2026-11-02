Feature: Video jobs share the job API and wait for a local worker

  The job API holds two kinds of job, speech and video, in one table with one
  claim lifecycle. A job with no kind is a speech job. A video job is created by
  an operator, is identified by a hash of everything that decides its output,
  costs the cloud nothing, and needs no quota. Cloud rendering is not enabled
  for video: a video job waits for a local worker, with a visible reason, and
  nothing in the backend ever sends it to Batch.

  Background:
    Given a router with a fake clock and a fallback gate

  Scenario: A job stored without a kind is a speech job
    Given a stored job with no kind
    When the operator lists the claimable jobs
    Then the claimable job "legacy-speech-job" has kind "speech"

  Scenario: A new speech job records its kind
    Given a site that may create speech jobs
    When the site creates a speech job
    Then the stored job has kind "speech"
    And the speech job armed a fallback timer

  Scenario: An operator creates a video job that waits for a local worker
    When the operator creates a video job for script "intro"
    Then the video job is created as "pending"
    And the video job says it is waiting for a local worker
    And no fallback timer was started
    And the video job has no job token
    And the job is visible to the operator as kind "video" waiting for a local worker

  Scenario: Submitting the same video twice gives one job
    When the operator creates a video job for script "intro"
    And the operator creates a video job for script "intro"
    Then the second submission reuses the first job
    And exactly 1 video job is stored

  Scenario: A different picture is a different job but a different worker count is not
    When the operator creates a video job for script "intro" at 30 fps
    And the operator creates a video job for script "intro" at 24 fps
    And the operator creates a video job for script "intro" at 30 fps using 4 workers
    Then exactly 2 video jobs are stored

  Scenario: A site key cannot create a video job
    When a site key holder creates a video job
    Then the request is refused with status 403
    And exactly 0 video jobs are stored

  Scenario Outline: Unusable video input is refused with a reason
    When the operator creates a video job with <problem>
    Then the request is refused with status 400 and error "<error>"

    Examples:
      | problem                          | error                       |
      | no script                        | script_required             |
      | an unknown option "gpuClass"     | unsupported_option:gpuClass |
      | audio that was never uploaded    | audio_not_uploaded          |
      | a malformed audio hash           | audio_sha256_invalid        |

  Scenario: Narration audio goes in the content store before the job refers to it
    When the operator uploads narration audio to the content store
    And the operator creates a video job that uses that audio
    Then the video job is created as "pending"
    And asking the store for that audio again reports that it exists

  Scenario: A worker claims a video job and the waiting reason clears
    Given the operator created a video job for script "intro"
    When local worker "local:render" claims the video job
    Then the video job is "claimed"
    And the video job no longer shows a waiting reason

  Scenario: A finished video job is stored as a video and costs nothing
    Given the operator created a video job for script "intro"
    And local worker "local:render" claims the video job
    When local worker "local:render" uploads and completes the video
    Then the video job is "done"
    And the video was stored under a video key
    And the video job was charged no platform cost

  Scenario: The fallback timer can never send a video job to Batch
    Given the operator created a video job for script "intro"
    When a fallback timer runs for the video job
    Then no Batch job is submitted
    And the timer ends with "FallbackNotNeeded"
    And the video job is "pending"

  Scenario: Requeueing a video job starts no timer
    Given the operator created a video job for script "intro"
    And local worker "local:render" claims the video job
    And local worker "local:render" fails the video job
    When the operator retries the video job
    Then no fallback timer was started
    And the video job is "pending"
    And the video job says it is waiting for a local worker
