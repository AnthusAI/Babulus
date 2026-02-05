Feature: CLI usage summary

  Scenario: Summarize usage ledger as JSON
    Given a CLI usage workspace
    And a usage ledger "usage.jsonl" with entries:
      | kind  | unit    | quantity | provider    | estimated | actual |
      | tts   | chars   | 120      | openai      | 0.03      | 0.03   |
      | music | seconds | 12       | elevenlabs  | 0.10      | 0.10   |
    When I run babulus usage summarize with ledger "usage.jsonl" and json output
    Then the usage CLI exit code should be 0
    And the usage summary json total quantity should be 132
    And the usage summary json unit "chars" quantity should be 120
    And the usage summary json unit "seconds" quantity should be 12

  Scenario: Summarize usage ledger with detail output
    Given a CLI usage workspace
    And a usage ledger "usage.jsonl" with entries:
      | kind | unit  | quantity | provider | estimated | actual |
      | tts  | chars | 100      | openai   | 0.02      | 0.02   |
      | sfx  | chars | 50       | openai   | 0.01      | 0.01   |
    When I run babulus usage summarize with ledger "usage.jsonl" and detail output
    Then the usage CLI exit code should be 0
    And the usage CLI output should include "usage ledger:"
    And the usage CLI output should include "provider:openai"
    And the usage CLI output should include "kind:tts"

  Scenario: Summarize usage ledger with detail json output
    Given a CLI usage workspace
    And a usage ledger "usage.jsonl" with entries:
      | kind | unit  | quantity | provider | estimated | actual |
      | tts  | chars | 100      | openai   | 0.02      | 0.02   |
      | sfx  | chars | 50       | openai   | 0.01      | 0.01   |
    When I run babulus usage summarize with ledger "usage.jsonl" and detail json output
    Then the usage CLI exit code should be 0
    And the usage detail json total quantity should be 150
    And the usage detail json provider "openai" total quantity should be 150
    And the usage detail json kind "tts" total quantity should be 100

  Scenario: Usage summary fails for missing ledger
    Given a CLI usage workspace
    When I run babulus usage summarize with missing ledger "missing.jsonl"
    Then the usage CLI exit code should be 2
    And the usage CLI error output should include "Usage ledger not found"

  Scenario: Summarize usage ledger resolved from DSL path
    Given a CLI usage workspace
    And a usage DSL file "content/demo.babulus.xml" with composition "demo"
    And a usage ledger for composition "demo" env "development" with entries:
      | kind | unit  | quantity | provider | estimated | actual |
      | tts  | chars | 20       | openai   | 0.01      | 0.01   |
    When I run babulus usage summarize for DSL "content/demo.babulus.xml" with env "development"
    Then the usage CLI exit code should be 0
    And the usage summary json total quantity should be 20
