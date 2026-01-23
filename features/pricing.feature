Feature: Pricing rate card

  Scenario: Default unit rates apply
    Given a rate card:
      """
      { "units": { "chars": 0.01 } }
      """
    And a usage entry of kind "tts" provider "openai" unit "chars" quantity 100
    When I estimate usage cost
    Then the estimated cost should be 1

  Scenario: Provider overrides default rates
    Given a rate card:
      """
      {
        "units": { "chars": 0.01 },
        "providers": { "openai": { "units": { "chars": 0.02 } } }
      }
      """
    And a usage entry of kind "tts" provider "openai" unit "chars" quantity 100
    When I estimate usage cost
    Then the estimated cost should be 2

  Scenario: Kind overrides default rates
    Given a rate card:
      """
      {
        "units": { "seconds": 0.5 },
        "kinds": { "music": { "units": { "seconds": 0.75 } } }
      }
      """
    And a usage entry of kind "music" provider "elevenlabs" unit "seconds" quantity 12
    When I estimate usage cost
    Then the estimated cost should be 9

  Scenario: Provider kind overrides provider rates
    Given a rate card:
      """
      {
        "providers": {
          "elevenlabs": {
            "units": { "seconds": 0.5 },
            "kinds": { "sfx": { "units": { "seconds": 1.2 } } }
          }
        }
      }
      """
    And a usage entry of kind "sfx" provider "elevenlabs" unit "seconds" quantity 3
    When I estimate usage cost
    Then the estimated cost should be 3.6

  Scenario: Missing rate returns null
    Given a rate card:
      """
      { "units": { "tokens": 0.02 } }
      """
    And a usage entry of kind "tts" provider "openai" unit "chars" quantity 50
    When I estimate usage cost
    Then the estimated cost should be null
