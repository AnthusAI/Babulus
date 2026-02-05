Feature: CLI clean command

  Scenario: Clean shows dry-run output
    Given a CLI clean workspace
    And a clean DSL file "content/demo.babulus.xml" with composition "demo"
    And the clean workspace has generated outputs for composition "demo" in env "test"
    When I run babulus clean dry-run for DSL "content/demo.babulus.xml" env "test"
    Then the clean CLI exit code should be 0
    And the clean CLI output should include "dry-run"
    And the clean outputs should still exist

  Scenario: Clean deletes outputs with --yes
    Given a CLI clean workspace
    And a clean DSL file "content/demo.babulus.xml" with composition "demo"
    And the clean workspace has generated outputs for composition "demo" in env "test"
    When I run babulus clean delete for DSL "content/demo.babulus.xml" env "test"
    Then the clean CLI exit code should be 0
    And the clean CLI output should include "Deleted"
    And the clean outputs should be deleted
