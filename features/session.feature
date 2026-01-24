Feature: Active session helpers

  Scenario: Build session with preferred org
    Given session org memberships "acme:owner, beta:editor"
    When I build a session for user "user-1" with preferred org "beta"
    Then the session org should be "beta"
    And the session role should be "editor"

  Scenario: Build session with single membership
    Given session org memberships "acme:viewer"
    When I build a session for user "user-1" with preferred org "none"
    Then the session org should be "acme"
    And the session role should be "viewer"

  Scenario: Build session requires active org when multiple memberships exist
    Given session org memberships "acme:owner, beta:editor"
    When I build a session for user "user-1" with preferred org "none"
    Then the session error should include "Active org required"

  Scenario: Session permission checks
    Given session org memberships "acme:admin"
    When I build a session for user "user-1" with preferred org "acme"
    Then the session permission "org:invite" should be allowed
    And the session permission "billing:manage" should be denied
