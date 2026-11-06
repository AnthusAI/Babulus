Feature: An operator switches the cloud fallback on or off for each site

  A site's jobs may run in the cloud only when an operator has turned that on
  for the site and named the Prospectus Account that pays for it. Until then a
  site is cloud off with no Account, and the fallback gate refuses it. The
  operator-only PATCH /sites/{id} route changes both, and GET /sites reports
  them so the console can show and edit them. Turning cloud on without a valid
  Account UUID is refused, because the gate would refuse that site anyway and
  the operator should hear about it now. Turning cloud off needs no Account.

  Scenario: A new site starts with cloud off and no Account
    Given a site "blog" exists
    When an operator lists the sites
    Then the site "blog" shows cloud off and no Account

  Scenario: An operator turns cloud on with a valid Account
    Given a site "blog" exists
    When an operator turns cloud on for "blog" with the valid Account "billing"
    Then the response is 200
    And the site "blog" is stored with cloud on and the valid Account "billing"
    And listing the sites shows "blog" with cloud on and the valid Account "billing"

  Scenario: The Account is stored in its canonical lower-case form
    Given a site "blog" exists
    When an operator turns cloud on for "blog" with the valid Account "billing" in upper case
    Then the site "blog" is stored with cloud on and the valid Account "billing"

  Scenario Outline: Turning cloud on without a valid Account is refused
    Given a site "blog" exists
    When an operator turns cloud on for "blog" with the Account <account>
    Then the response is 400
    And the site "blog" is still cloud off with no Account

    Examples:
      | account                |
      | "not-a-uuid"           |
      | "123e4567"             |
      | ""                     |
      | "../../other/path"     |
      | missing                |
      | a number               |

  Scenario: Turning cloud off may leave out the Account
    Given a site "blog" with cloud on for the valid Account "billing"
    When an operator turns cloud off for "blog" without an Account
    Then the response is 200
    And the site "blog" is stored with cloud off and the valid Account "billing"

  Scenario: Turning cloud off with a malformed Account is refused
    Given a site "blog" with cloud on for the valid Account "billing"
    When an operator turns cloud off for "blog" with the Account "garbage"
    Then the response is 400
    And the site "blog" is stored with cloud on and the valid Account "billing"

  Scenario Outline: A request body that is not a cloud switch is refused
    Given a site "blog" exists
    When an operator sends the body <body> to change "blog"
    Then the response is 400
    And the site "blog" is still cloud off with no Account

    Examples:
      | body                                      |
      | {}                                        |
      | {"cloud_enabled": "yes"}                  |
      | {"cloud_enabled": 1}                      |
      | {"cloud_enabled": null}                   |
      | {"account_id": "<billing>"} |

  Scenario: A site that does not exist is not found
    When an operator turns cloud on for "ghost" with the valid Account "billing"
    Then the response is 404

  Scenario Outline: Only an operator can change a site
    Given a site "blog" exists
    When <caller> turns cloud on for "blog" with the valid Account "billing"
    Then the response is 403
    And the site "blog" is still cloud off with no Account

    Examples:
      | caller                                  |
      | someone with no token                   |
      | a user outside the operators group      |

  Scenario: A site switched on is one the fallback gate accepts
    Given a site "blog" exists
    When an operator turns cloud on for "blog" with the valid Account "billing"
    Then the fallback gate accepts the Account stored for "blog"
