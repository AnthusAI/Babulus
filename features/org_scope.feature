Feature: Org scope helpers

  Scenario: Apply org scope when orgId is missing
    Given an org scoped input with org "none" and title "Intro"
    When I apply org scope "acme"
    Then the scoped org should be "acme"
    And the scoped title should be "Intro"

  Scenario: Apply org scope when orgId matches
    Given an org scoped input with org "acme" and title "Intro"
    When I apply org scope "acme"
    Then the scoped org should be "acme"

  Scenario: Apply org scope rejects mismatched orgId
    Given an org scoped input with org "beta" and title "Intro"
    When I apply org scope "acme"
    Then the org scope error should include "Active org mismatch"

  Scenario: Assert org scope rejects mismatched orgId
    Given an org record with org "beta"
    When I assert org scope "acme"
    Then the org scope error should include "Active org mismatch"

  Scenario: Build org filter
    When I build an org filter for org "acme"
    Then the org filter should be:
      | field | eq   |
      | orgId | acme |
