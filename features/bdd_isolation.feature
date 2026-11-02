Feature: Ordinary behavior tests use isolated provider mocks
  Scenario: Parent credentials and a false CI setting cannot select real providers
    Given a behavior test parent environment containing fake provider credentials and CI false
    When the behavior test launch environment is prepared
    Then provider credential sources are removed and mock mode is forced
    And unrelated environment settings remain available
