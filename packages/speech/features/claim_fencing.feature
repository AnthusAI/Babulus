Feature: Claims are fenced and the cloud fallback respects them

  A job is worked by one claim holder at a time. A claim lasts a window and
  is renewed by heartbeats while its holder works; a claim whose holder stops
  renewing lapses. Every claim carries a fencing token and only the holder of
  the current token may renew the claim, upload audio or record a result, so a
  worker that lost its claim can never change the job.

  The cloud fallback is a timer. When it fires, a single conditional write
  decides whether the cloud may take the job: it succeeds only if no live
  claim exists and the timer still belongs to the job's current attempt. A live
  claim always wins. Only a successful write can lead to a Batch submission.

  Background:
    Given a router with a fake clock and a fallback gate

  Scenario: A long local job keeps its claim and no Batch job starts
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    And the worker renews its claim every 300 seconds for 3000 seconds and then finishes the job
    When the fallback timer runs
    Then no Batch job is submitted
    And the timer ends with "FallbackNotNeeded"
    And the job is "done" and was produced by "local:a"

  Scenario: A claim renewed before it lapsed outlives its original window
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    When the worker renews its claim after 800 seconds
    And 200 seconds pass
    Then a competing claim by "local:b" is rejected
    And the claim is still held by "local:a"

  Scenario: A worker that stops renewing loses the job to the fallback exactly once
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    When the fallback timer runs
    Then exactly 1 Batch job is submitted
    And the Batch job carries the fencing token of the claim the fallback holds
    And the claim is held by "batch:fallback"

  Scenario: Nothing claimed means the fallback runs once
    Given a pending job with a fallback timer
    When the fallback timer runs
    Then exactly 1 Batch job is submitted

  Scenario: A duplicate timer for the same job starts no second Batch job
    Given a pending job with a fallback timer
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    And a second timer for the same attempt fires 100 seconds later
    Then exactly 1 Batch job is submitted
    And the job is "done" and was produced by "batch:spec-batch-job"

  Scenario: Arming the same attempt twice starts one timer
    Given a pending job with a fallback timer
    When the router arms the fallback for the same attempt twice
    Then the second arming is accepted without starting another timer

  Scenario: A timer from before a requeue starts nothing
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    When an operator force-retries the job
    And the original fallback timer fires
    Then no Batch job is submitted
    And the timer ends with "FallbackNotNeeded"
    And the job is "pending"

  Scenario: A worker holding a released claim cannot write a result
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    When an operator force-retries the job
    Then worker "local:a" is refused when it uploads, completes, fails and renews
    And the job is "pending"

  Scenario: Expiry then re-claim fences out the first holder
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    And 1000 seconds pass
    And local worker "local:b" claims the job
    Then worker "local:a" is refused when it uploads, completes, fails and renews
    And the claim is still held by "local:b"
    And worker "local:b" completes the job
    And the job is "done" and was produced by "local:b"

  Scenario: Results need the token of the current claim
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    Then completing the job without a token is refused
    And renewing without a token is rejected as a bad request

  Scenario: A fallback gate that cannot decide starts nothing
    Given a pending job with a fallback timer
    And the fallback gate is unavailable
    When the fallback timer runs
    Then no Batch job is submitted
    And the timer ends with "FallbackGateFailed"

  Scenario: A job that already failed is not retried by the cloud
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    And worker "local:a" fails the job
    When the fallback timer runs
    Then no Batch job is submitted
    And the job is "failed"

  Scenario: A site's daily quota starts again on a new day
    Given a site whose quota of 2 was used up yesterday
    When the site creates a job
    Then the job is created
    And the site's usage for today is 1

  Scenario: A site that used its quota today is refused
    Given a site whose quota of 2 was used up today
    When the site creates a job
    Then the job is refused with "daily_quota_exceeded"

  Scenario: Concurrent creates cannot exceed a site's quota
    Given a site with a daily quota of 2 and nothing used today
    When the site creates 6 different jobs at the same time
    Then exactly 2 of those jobs are created and 4 are refused with "daily_quota_exceeded"
    And the site's usage for today is 2

  Scenario: A slow clock cannot reset a day that has moved on
    Given a site whose usage is recorded for a later day than the router's clock
    When the site creates a job
    Then the job is refused with "daily_quota_exceeded"

  Scenario: A failure to start the timer leaves no job and no quota used
    Given a site with a daily quota of 2 and nothing used today
    And starting the fallback timer fails
    When the site creates a job and the router fails
    Then no job was stored
    And the site's usage for today is 0

  Scenario: A write with no token cannot complete a requeued job
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    When an operator force-retries the job
    Then completing the job without a token is refused
    And the job is "pending"

  Scenario: A refused Batch submission fails only the attempt the gate reserved
    Given a pending job with a fallback timer
    And AWS Batch refuses the submission
    When the fallback timer runs
    Then the timer ends with "BatchFallbackFailed"
    And the job is failed with reason "batch_fallback_failed"
