Feature: CLI worker run
  Scenario: Dry-run validates a worker job
    Given a CLI worker workspace
    And a worker script file "script.json"
    And a worker timeline file "timeline.json"
    And a worker job file "job.json" referencing "script.json" and "timeline.json"
    When I run babulus worker run with job "job.json" and result "result.json" dry-run
    Then the worker command should succeed
    And the worker result at "result.json" should have status "skipped"

  Scenario: Missing script file fails
    Given a CLI worker workspace
    And a worker job file "job.json" referencing "missing.json" and "timeline.json"
    When I run babulus worker run with job "job.json" and result "result.json" dry-run
    Then the worker command should fail
