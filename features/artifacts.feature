Feature: Run artifacts

  Scenario: Write run artifacts without audio
    Given a run artifacts workspace
    And a script file
    And a timeline file
    When I write run artifacts without audio
    Then the run should include script and timeline artifacts
    And the run should not include audio artifacts

  Scenario: Write run artifacts with audio
    Given a run artifacts workspace
    And a script file
    And a timeline file
    And an audio file
    When I write run artifacts with audio
    Then the run should include script and timeline artifacts
    And the run should include audio artifacts

  Scenario: Run artifacts include run.json
    Given a run artifacts workspace
    And a script file
    And a timeline file
    When I write run artifacts without audio
    Then the run metadata file should exist

  Scenario: Missing audio file is ignored
    Given a run artifacts workspace
    And a script file
    And a timeline file
    And a missing audio file path
    When I write run artifacts with audio
    Then the run should not include audio artifacts

  Scenario: Run metadata captures source and latest pointer
    Given a run artifacts workspace
    And a script file
    And a timeline file
    When I write run artifacts without audio
    Then the latest run pointer should match the run id
    And the run metadata should include composition id "demo" and env "test"
    And the run metadata should include source path "content/demo.babulus.xml"

  Scenario: Run id is deterministic for identical inputs
    Given a run artifacts workspace
    And a script file
    And a timeline file
    And an audio file
    When I write run artifacts with audio
    And I write run artifacts again with audio
    Then the run ids should match
