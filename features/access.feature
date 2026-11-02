Feature: Org access checks

  Scenario: Allow access when membership and permission match
    Given access org memberships "acme:owner"
    When I check access for org "acme" with active org "acme" permission "org:manage"
    Then access should be allowed
    And the access role should be "owner"

  Scenario: Deny access when permission is missing
    Given access org memberships "acme:viewer"
    When I check access for org "acme" with active org "acme" permission "video:edit"
    Then access should be denied with reason "Permission denied"

  Scenario: Deny access when active org mismatches
    Given access org memberships "acme:editor"
    When I check access for org "acme" with active org "beta" permission "video:edit"
    Then access should be denied with reason "Active org mismatch"

  Scenario: Deny access when no memberships exist
    Given access org memberships "none"
    When I check access for org "acme" with active org "acme" permission "video:read"
    Then access should be denied with reason "No org memberships available"

  Scenario: Assert access returns role
    Given access org memberships "acme:editor"
    When I assert access for org "acme" with active org "acme" permission "video:edit"
    Then the access role should be "editor"
