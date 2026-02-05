Feature: CLI SFX commands

  Scenario: List shows no picks message
    Given a CLI sfx workspace
    And a sfx DSL file "content/demo.babulus.xml" with composition "demo"
    When I run babulus sfx list for DSL "content/demo.babulus.xml"
    Then the sfx CLI exit code should be 0
    And the sfx CLI output should include "No SFX picks set yet"

  Scenario: Set pick then list
    Given a CLI sfx workspace
    And a sfx DSL file "content/demo.babulus.xml" with composition "demo"
    When I run babulus sfx set clip "whoosh" pick 2 for DSL "content/demo.babulus.xml"
    Then the sfx CLI exit code should be 0
    And the sfx CLI output should include "whoosh: pick=2"
    When I run babulus sfx list for DSL "content/demo.babulus.xml"
    Then the sfx CLI exit code should be 0
    And the sfx CLI output should include "whoosh: pick=2"

  Scenario: SFX commands require a single DSL file
    Given a CLI sfx workspace
    And sfx DSL files in "content" named:
      | one.babulus.xml |
      | two.babulus.xml |
    When I run babulus sfx list for DSL "content"
    Then the sfx CLI exit code should be 2
    And the sfx CLI output should include "Multiple DSL files found. Pass --dsl <path>."

  Scenario: Set pick with apply triggers generation
    Given a CLI sfx workspace
    And a sfx DSL file "content/demo.babulus.xml" with composition "demo" and cue
    When I run babulus sfx set clip "whoosh" pick 0 with apply for DSL "content/demo.babulus.xml"
    Then the sfx CLI exit code should be 0
    And the sfx generated script should exist for composition "demo"
    And the sfx generated timeline should exist for composition "demo"
    And the sfx generated audio should exist for composition "demo"
