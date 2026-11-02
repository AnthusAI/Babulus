Feature: Baseline verification

  Scenario: Verify a matching baseline
    Given a baseline workspace
    And a file "script.json" with content "{ \"ok\": true }"
    And the baseline record includes "script.json" with its sha
    When I verify the baseline record
    Then the baseline should be valid

  Scenario: Detect a mismatched hash
    Given a baseline workspace
    And a file "script.json" with content "{ \"ok\": true }"
    And the baseline record includes "script.json" with sha "deadbeef"
    When I verify the baseline record
    Then the baseline should be invalid
    And the mismatch count should be 1

  Scenario: Allow an optional missing artifact
    Given a baseline workspace
    And the baseline record includes missing artifact "render.mp4" marked optional
    When I verify the baseline record
    Then the baseline should be valid

  Scenario: Require missing artifacts
    Given a baseline workspace
    And the baseline record includes missing artifact "render.mp4"
    When I verify the baseline record
    Then the baseline should be invalid
    And the missing count should be 1

  Scenario: Reject invalid baseline records
    Given a baseline workspace
    And a baseline file "baseline.json" with content:
      """
      { "foo": "bar" }
      """
    When I read the baseline record at "baseline.json"
    Then a baseline parse error should be raised

  Scenario: Write and read a baseline record
    Given a baseline workspace
    And the baseline record includes missing artifact "script.json"
    When I write the baseline record to "baseline.json"
    And I read the baseline record at "baseline.json"
    Then no baseline parse error should be raised
