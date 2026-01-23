Feature: Environment helpers

  Scenario: Use default environment when unset
    Given the process environment is unset
    When I read the active environment
    Then the active environment should be "development"

  Scenario: Use explicit environment when set
    Given the process environment is "production"
    When I read the active environment
    Then the active environment should be "production"

  Scenario: Build fallback chain for known env
    When I build the fallback chain for "aws"
    Then the fallback chain should be:
      | env         |
      | aws         |
      | azure       |
      | production  |
      | static      |

  Scenario: Build fallback chain for unknown env
    When I build the fallback chain for "staging"
    Then the fallback chain should be:
      | env         |
      | staging     |
      | development |
      | aws         |
      | azure       |
      | production  |
      | static      |

  Scenario: Resolve environment cache dir
    When I resolve the env cache dir for out dir "/tmp/out" and env "production"
    Then the env cache dir should be "/tmp/out/env/production"
