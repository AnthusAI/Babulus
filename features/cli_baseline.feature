Feature: CLI baseline commands

  Scenario: Verify passes with a matching record
    Given a CLI baseline workspace
    And a baseline artifact file "script.json" with content "{ \"ok\": true }"
    And a baseline record at "baseline.json" with artifact "script.json" and sha
    When I run babulus baseline verify with record "baseline.json"
    Then the CLI exit code should be 0

  Scenario: Verify fails when artifact is missing
    Given a CLI baseline workspace
    And a baseline record at "baseline.json" with missing artifact "script.json"
    When I run babulus baseline verify with record "baseline.json"
    Then the CLI exit code should be 2

  Scenario: Update fills in missing sha
    Given a CLI baseline workspace
    And a baseline artifact file "script.json" with content "{ \"ok\": true }"
    And a baseline record at "baseline.json" with artifact "script.json" and missing sha
    When I run babulus baseline update with record "baseline.json"
    Then the CLI exit code should be 0
    And the baseline record at "baseline.json" should include sha for "script.json"

  Scenario: Init writes a baseline record
    Given a CLI baseline workspace
    When I run babulus baseline init with record "baseline.json" and artifacts "script.json,timeline.json" and optional "timeline.json"
    Then the CLI exit code should be 0
    And the baseline record at "baseline.json" should contain 2 artifacts
    And the baseline record at "baseline.json" should mark "timeline.json" optional
