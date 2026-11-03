Feature: Studio server role
  As the operator of Babulus
  I want the Studio's server to hold only the permissions sign-in and Account files need
  So that a flaw in the server can't start compute or reach anything else

  Scenario: The Studio's server role can't start compute
    Given the Studio server role template
    Then the role allows only Prospectus calls, one secret, Account groups and Account files
    And the role allows nothing that starts compute

  Scenario: Files are limited to Account and published paths
    Given the Studio server role template
    Then object access is limited to the org and published paths of the assets bucket

  Scenario: Only Amplify can use the role
    Given the Studio server role template
    Then only the Amplify service can assume the role
