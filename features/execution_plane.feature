Feature: Execution plane

  Scenario: Claim next job selects oldest queued
    Given an execution plane store
    And an execution render agent "agent-1" in org "acme" status "online" created "2026-01-22T09:59:00Z"
    And an execution job "job-1" in org "acme" kind "generate" status "queued" created "2026-01-22T10:00:00Z"
    And an execution job "job-2" in org "acme" kind "render" status "queued" created "2026-01-22T10:05:00Z"
    When I claim the next job for agent "agent-1" in org "acme"
    Then the claimed job id should be "job-1"
    And the job "job-1" status should be "claimed"
    And the job "job-1" claimedBy should be "agent-1"
    And the render agent "agent-1" status should be "busy"
    And a job event should exist for job "job-1" type "status" message "claimed"

  Scenario: Execute generate job creates run
    Given an execution plane store
    And an execution render agent "agent-1" in org "acme" status "offline" created "2026-01-22T09:00:00Z"
    And an execution project "proj-1" in org "acme" created "2026-01-22T09:00:00Z"
    And an execution video "vid-1" in project "proj-1" org "acme" created "2026-01-22T09:05:00Z"
    And an execution job "job-1" in org "acme" kind "generate" status "queued" created "2026-01-22T09:10:00Z" with input:
      | field               | value |
      | videoId             | vid-1 |
      | storyboardVersionId | sb-1  |
    When I execute job "job-1" as agent "agent-1" in org "acme"
    Then the job "job-1" status should be "succeeded"
    And the job "job-1" claimedBy should be "agent-1"
    And a generation run should exist for video "vid-1" storyboard "sb-1" with status "succeeded"
    And a usage event should exist for video "vid-1" unit "tokens" quantity "1200"
    And the render agent "agent-1" status should be "online"
    And a job event should exist for job "job-1" type "log" message "generation run created"
    And a job event should exist for job "job-1" type "progress" message "generation complete"
    And a job event should exist for job "job-1" type "status" message "succeeded"

  Scenario: Execute render job creates run
    Given an execution plane store
    And an execution project "proj-1" in org "acme" created "2026-01-22T09:00:00Z"
    And an execution video "vid-1" in project "proj-1" org "acme" created "2026-01-22T09:05:00Z"
    And an execution generation run "gen-1" in video "vid-1" org "acme" storyboard "sb-1" created "2026-01-22T09:06:00Z"
    And an execution job "job-1" in org "acme" kind "render" status "queued" created "2026-01-22T09:10:00Z" with input:
      | field           | value |
      | videoId         | vid-1 |
      | generationRunId | gen-1 |
    When I execute job "job-1" as agent "agent-1" in org "acme"
    Then the job "job-1" status should be "succeeded"
    And a render run should exist for video "vid-1" generation "gen-1" with status "succeeded"
    And a usage event should exist for video "vid-1" unit "seconds" quantity "30"
    And a job event should exist for job "job-1" type "log" message "render run created"
    And a job event should exist for job "job-1" type "progress" message "render complete"
    And a job event should exist for job "job-1" type "status" message "succeeded"

  Scenario: Execute job failure marks failed
    Given an execution plane store
    And an execution job "job-1" in org "acme" kind "generate" status "queued" created "2026-01-22T09:10:00Z" with input:
      | field               | value |
      | storyboardVersionId | sb-1  |
    When I execute job "job-1" as agent "agent-1" in org "acme"
    Then the execution error should include "missing videoId"
    And the job "job-1" status should be "failed"
    And a job event should exist for job "job-1" type "status" message "missing videoId"
