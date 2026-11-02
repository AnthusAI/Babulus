Feature: Org tenancy helpers

  Scenario: Resolve active org when only one membership exists
    Given org memberships "acme:owner"
    When I resolve the active org with no preferred org
    Then the active org should be "acme"

  Scenario: Resolve active org using a preferred org
    Given org memberships "acme:owner, beta:editor"
    When I resolve the active org with preferred org "beta"
    Then the active org should be "beta"

  Scenario: Preferred org must be in memberships
    Given org memberships "acme:owner"
    When I resolve the active org with preferred org "gamma"
    Then the tenancy error should include "Active org not found"

  Scenario: Multiple memberships require an active org selection
    Given org memberships "acme:owner, beta:editor"
    When I resolve the active org with no preferred org
    Then the tenancy error should include "Active org required"

  Scenario: Require org access returns membership
    Given org memberships "acme:owner, beta:viewer"
    When I require access to org "beta"
    Then the active role should be "viewer"

  Scenario: Assert same org rejects mismatches
    Given org memberships "acme:owner"
    When I assert org "acme" against active org "beta"
    Then the tenancy error should include "Active org mismatch"
