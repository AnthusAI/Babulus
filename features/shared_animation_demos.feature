Feature: Shared portable animation demos
  Scenario Outline: Existing demo is available from the shared standard library
    Given the shared animation demo "<name>"
    When I request the demo through its established Babulus name
    Then the same shared demo implementation is selected

    Examples:
      | name |
      | AnimeHarnessDemo |
      | ThreeOrbit |
      | LottieBadge |
      | D3BarChart |
      | P5Particles |
      | TextEffects |
      | MixAndMatchDemo |
