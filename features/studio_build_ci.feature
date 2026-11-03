Feature: Studio build check in CI
  As a maintainer of Babulus
  I want every pull request to build the Studio the way Amplify does
  So that a build that fails after the merge is caught before it

  Scenario: Every pull request builds the Studio
    Given the CI workflow
    Then the "studio-build" job runs on "ubuntu-24.04"
    And the "studio-build" job runs "npx next build" in "apps/studio-web"

  Scenario: The build needs no deployed backend
    Given the CI workflow
    Then the "studio-build" job writes a stub amplify_outputs.json
    And the "studio-build" job does not use AWS credentials

  Scenario: The build installs only what the Studio needs and caches it
    Given the CI workflow
    Then the "studio-build" job installs the Studio workspace from the lock file
    And the "studio-build" job caches npm downloads and the Next.js build cache

  Scenario: A merge to main deploys only after the Studio builds
    Given the CI workflow
    Then the deploy job needs the "studio-build" job
