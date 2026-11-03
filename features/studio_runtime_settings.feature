Feature: Studio runtime settings
  As the operator of Babulus
  I want the Studio's server to see the settings sign-in needs while it runs
  So that sign-in works, and no other build setting reaches the server by accident

  Amplify gives branch settings to the build, not to the running server. The build
  has to copy each one the server reads into a file the server loads when it starts.

  Scenario: The build hands sign-in's settings to the server
    Given the Studio build steps
    Then the build copies these settings for the server before it builds the app
      | setting                              |
      | BABULUS_APP_ORIGIN                   |
      | BABULUS_PROSPECTUS_ACCOUNTS_ENDPOINT |

  Scenario: The build copies only named settings
    Given the Studio build steps
    Then every setting copied for the server is named exactly
