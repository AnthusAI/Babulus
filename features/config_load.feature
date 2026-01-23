Feature: Config loading

  Scenario: Load config from BABULUS_PATH
    Given a config file with content:
      """
      tts:
        default_provider: dry-run
      audio:
        default_sfx_provider: dry-run
        default_music_provider: dry-run
      providers:
        dry-run:
          wpm: 200
      """
    When I load the config from BABULUS_PATH
    Then the default provider should be "dry-run"
    And the default sfx provider should be "dry-run"
    And the default music provider should be "dry-run"
    And the provider config for "dry-run" should include "wpm" = "200"

  Scenario: Reject non-mapping config
    Given a config file with content:
      """
      not-a-map
      """
    When I load the config from BABULUS_PATH and capture errors
    Then the config error should include "Config must be a mapping"

  Scenario: Provider config must be mapping
    Given a config file with content:
      """
      providers: nope
      """
    When I load the config from BABULUS_PATH and capture errors for provider "dry-run"
    Then the config error should include "config.providers must be a mapping"

  Scenario: Provider entry must be mapping
    Given a config file with content:
      """
      providers:
        dry-run: nope
      """
    When I load the config from BABULUS_PATH and capture errors for provider "dry-run"
    Then the config error should include "config.providers.dry-run must be a mapping"

  Scenario: Default provider must be a string
    Given a config file with content:
      """
      tts:
        default_provider: 123
      """
    When I load the config from BABULUS_PATH and capture errors for default provider
    Then the config error should include "config.tts.default_provider must be a string"

  Scenario: Load config from BABULUS_PATH directory
    Given a config file with content:
      """
      tts:
        default_provider: dry-run
      """
    When I load the config from BABULUS_PATH directory
    Then the default provider should be "dry-run"

  Scenario: Load config from project dir
    Given a project config file with content:
      """
      tts:
        default_provider: dry-run
      """
    When I load the config from project dir
    Then the default provider should be "dry-run"

  Scenario: Load config from DSL path
    Given a project config file with content:
      """
      tts:
        default_provider: dry-run
      """
    And a config DSL file at "content/demo.babulus.ts"
    When I load the config from DSL path
    Then the default provider should be "dry-run"

  Scenario: BABULUS_PATH missing config errors
    Given a missing config path
    When I load the config from BABULUS_PATH and capture errors
    Then the config error should include "BABULUS_PATH is set but config not found"
