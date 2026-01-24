Feature: Job event summary

  Scenario: Summarize latest job status and progress
    Given job events:
      | jobId | type     | message                 | progress | createdAt            |
      | job-1 | status   | queued                  | 0        | 2026-01-22T10:00:00Z |
      | job-1 | progress | started                 | 0.1      | 2026-01-22T10:01:00Z |
      | job-1 | log      | generation run created  |          | 2026-01-22T10:02:00Z |
      | job-1 | status   | succeeded               | 1        | 2026-01-22T10:03:00Z |
      | job-2 | status   | running                 | 0        | 2026-01-22T10:00:00Z |
      | job-2 | progress | halfway                 | 0.5      | 2026-01-22T10:04:00Z |
    When I summarize job events
    Then the job event summary for "job-1" status message should be "succeeded"
    And the job event summary for "job-1" progress should be "0.1"
    And the job event summary for "job-1" log message should be "generation run created"
    And the job event summary for "job-2" status message should be "running"
    And the job event summary for "job-2" progress should be "0.5"
