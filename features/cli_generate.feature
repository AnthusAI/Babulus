Feature: CLI generate command

  Scenario: Generate outputs for a single DSL
    Given a CLI generate workspace
    And a generate DSL file "content/demo.babulus.xml" with composition "demo"
    When I run babulus generate for DSL "content/demo.babulus.xml" env "test"
    Then the generate CLI exit code should be 0
    And the generated script should exist for composition "demo"
    And the generated timeline should exist for composition "demo"
    And the generated audio should exist for composition "demo"
    And the usage ledger should exist for composition "demo" env "test"

  Scenario: Generate without usage ledger
    Given a CLI generate workspace
    And a generate DSL file "content/demo.babulus.xml" with composition "demo"
    When I run babulus generate for DSL "content/demo.babulus.xml" env "test" without usage
    Then the generate CLI exit code should be 0
    And the usage ledger should not exist for composition "demo" env "test"

  Scenario: Output overrides require a single composition
    Given a CLI generate workspace
    And generate DSL files in "content" named:
      | one.babulus.xml |
      | two.babulus.xml |
    When I run babulus generate with script override for DSL "content"
    Then the generate CLI exit code should be 2
    And the generate CLI error output should include "Output overrides require a single composition."

  Scenario: Watch with overrides requires a single DSL
    Given a CLI generate workspace
    And generate DSL files in "content" named:
      | one.babulus.xml |
      | two.babulus.xml |
    When I run babulus generate watch with script override for directory "content"
    Then the generate CLI exit code should be 2
    And the generate CLI error output should include "When using --watch with multiple DSLs, omit explicit output overrides."

  Scenario: Auto-discover single DSL
    Given a CLI generate workspace
    And generate DSL files in "content/auto" named:
      | demo.babulus.xml |
    When I run babulus generate with auto-discovery env "test"
    Then the generate CLI exit code should be 0
    And the generated script should exist for composition "demo"
    And the generated timeline should exist for composition "demo"
    And the generated audio should exist for composition "demo"

  Scenario: Auto-discover fails with no DSLs
    Given a CLI generate workspace
    When I run babulus generate with auto-discovery env "test"
    Then the generate CLI exit code should be 2
    And the generate CLI error output should include "No .babulus.ts or .babulus.xml files found"

  Scenario: Auto-discover fails with multiple DSLs
    Given a CLI generate workspace
    And generate DSL files in "content" named:
      | one.babulus.xml |
      | two.babulus.xml |
    When I run babulus generate with auto-discovery env "test"
    Then the generate CLI exit code should be 2
    And the generate CLI error output should include "Multiple .babulus.ts/.babulus.xml files found"

  Scenario: Missing DSL path errors
    Given a CLI generate workspace
    When I run babulus generate for missing path "missing.babulus.xml"
    Then the generate CLI exit code should be 2
    And the generate CLI error output should include "Path does not exist"
