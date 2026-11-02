Feature: DSL resolver

  Scenario: Resolve a defineVideo module
    Given a resolver module for "intro"
    When I resolve the module
    Then the resolved video id should be "intro"

  Scenario: Reject non-module exports
    Given a raw video spec for "intro"
    When I resolve the module
    Then the module resolution should fail
    And the module resolution error should be "Module must export a defineVideo() result."
