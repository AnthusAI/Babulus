Feature: The ordinary BDD launcher forces mock mode
  Scenario: A parent process supplies credentials and disables CI
    Given ordinary behavior tests are running
    Then the active process uses isolated mock mode
