Feature: CLI SFX commands

  Scenario: List shows no picks message
    Given a CLI sfx workspace
    And a sfx DSL file "content/demo.babulus.ts" with composition "demo"
    When I run babulus sfx list for DSL "content/demo.babulus.ts"
    Then the sfx CLI exit code should be 0
    And the sfx CLI output should include "No SFX picks set yet"

  Scenario: Set pick then list
    Given a CLI sfx workspace
    And a sfx DSL file "content/demo.babulus.ts" with composition "demo"
    When I run babulus sfx set clip "whoosh" pick 2 for DSL "content/demo.babulus.ts"
    Then the sfx CLI exit code should be 0
    And the sfx CLI output should include "whoosh: pick=2"
    When I run babulus sfx list for DSL "content/demo.babulus.ts"
    Then the sfx CLI exit code should be 0
    And the sfx CLI output should include "whoosh: pick=2"

  Scenario: SFX commands require single composition
    Given a CLI sfx workspace
    And a sfx DSL file "content/multi.babulus.ts" with compositions "one" and "two"
    When I run babulus sfx list for DSL "content/multi.babulus.ts"
    Then the sfx CLI exit code should be 2
    And the sfx CLI output should include "SFX commands require a single composition per DSL file."

  Scenario: Set pick with apply triggers generation
    Given a CLI sfx workspace
    And a sfx DSL file "content/demo.babulus.ts" with composition "demo" and cue
    When I run babulus sfx set clip "whoosh" pick 0 with apply for DSL "content/demo.babulus.ts"
    Then the sfx CLI exit code should be 0
    And the sfx generated script should exist for composition "demo"
    And the sfx generated timeline should exist for composition "demo"
    And the sfx generated audio should exist for composition "demo"
