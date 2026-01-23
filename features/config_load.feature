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
