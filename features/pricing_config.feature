Feature: Pricing config parsing

  Scenario: Missing pricing returns null
    Given a pricing config:
      """
      {}
      """
    When I parse the pricing rate card
    Then the parsed rate card should be null

  Scenario: Empty pricing returns null
    Given a pricing config:
      """
      { "pricing": {} }
      """
    When I parse the pricing rate card
    Then the parsed rate card should be null

  Scenario: Provider kind rates are parsed
    Given a pricing config:
      """
      {
        "pricing": {
          "units": { "chars": 0.01 },
          "providers": {
            "openai": {
              "units": { "chars": 0.02 },
              "kinds": { "tts": { "units": { "chars": 0.03 } } }
            }
          }
        }
      }
      """
    When I parse the pricing rate card
    Then the parsed rate card unit "chars" should be 0.01
    And the parsed rate card provider "openai" unit "chars" should be 0.02
    And the parsed rate card provider "openai" kind "tts" unit "chars" should be 0.03

  Scenario: Invalid pricing units are rejected
    Given a pricing config:
      """
      { "pricing": { "units": { "chars": "cheap" } } }
      """
    When I parse the pricing rate card
    Then a pricing parse error should include "pricing.units.chars must be a finite number"

  Scenario: Negative pricing units are rejected
    Given a pricing config:
      """
      { "pricing": { "units": { "chars": -0.1 } } }
      """
    When I parse the pricing rate card
    Then a pricing parse error should include "pricing.units.chars must be >= 0"

  Scenario: Invalid provider mapping is rejected
    Given a pricing config:
      """
      { "pricing": { "providers": 5 } }
      """
    When I parse the pricing rate card
    Then a pricing parse error should include "pricing.providers must be a mapping"

  Scenario: Invalid kind mapping is rejected
    Given a pricing config:
      """
      { "pricing": { "kinds": { "tts": true } } }
      """
    When I parse the pricing rate card
    Then a pricing parse error should include "pricing.kinds.tts must be a mapping"
