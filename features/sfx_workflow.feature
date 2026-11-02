Feature: SFX workflow

  Scenario: Save and load selections
    Given an SFX workspace
    When I set pick 2 for clip "whoosh"
    Then the saved pick for clip "whoosh" should be 2

  Scenario: Bump pick wraps by variants
    Given an SFX workspace
    When I bump pick by 1 with 3 variants for clip "whoosh"
    Then the saved pick for clip "whoosh" should be 1
    When I bump pick by 3 with 3 variants for clip "whoosh"
    Then the saved pick for clip "whoosh" should be 1

  Scenario: Archive and restore variants
    Given an SFX workspace
    And live variants for clip "whoosh" with 3 files
    When I archive variants for clip "whoosh" keeping variant 0
    Then the live variants count for clip "whoosh" should be 1
    And the archived variants count for clip "whoosh" should be 2
    When I restore variants for clip "whoosh"
    Then the live variants count for clip "whoosh" should be 3

  Scenario: Clear live variants
    Given an SFX workspace
    And live variants for clip "whoosh" with 2 files
    When I clear live variants for clip "whoosh"
    Then the live variants count for clip "whoosh" should be 0

  Scenario: Reject negative pick
    Given an SFX workspace
    When I set pick -1 for clip "whoosh"
    Then an SFX error should be raised

  Scenario: Reject zero variants
    Given an SFX workspace
    When I bump pick by 1 with 0 variants for clip "whoosh"
    Then an SFX error should be raised
