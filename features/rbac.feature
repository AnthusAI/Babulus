Feature: Org role permissions

  Scenario Outline: Role permission checks
    Given an org role "<role>"
    Then the role should allow "<allowed>"
    And the role should deny "<denied>"

    Examples:
      | role   | allowed       | denied          |
      | viewer | video:read    | video:edit      |
      | editor | video:edit    | billing:manage  |
      | admin  | org:invite    | org:manage      |

  Scenario: Owner usage visibility
    Given an org role "owner"
    When I resolve usage visibility for billing mode "full"
    Then the usage visibility should be "full"

  Scenario: Billing mode redacts usage for all roles
    Given an org role "owner"
    When I resolve usage visibility for billing mode "redacted"
    Then the usage visibility should be "redacted"

  Scenario: Editors see redacted usage by default
    Given an org role "editor"
    When I resolve usage visibility for billing mode "full"
    Then the usage visibility should be "redacted"
