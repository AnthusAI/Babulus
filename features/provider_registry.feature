Feature: Provider registry

  Scenario: Dry-run TTS requires numeric wpm
    Given a provider config:
      """
      providers:
        dry-run:
          wpm: "nope"
      """
    When I resolve tts provider "dry-run"
    Then the provider error should include "providers.dry-run.wpm must be a number"

  Scenario: Elevenlabs voice settings must be mapping
    Given a provider config:
      """
      providers:
        elevenlabs:
          voice_settings: "nope"
      """
    When I resolve tts provider "elevenlabs"
    Then the provider error should include "providers.elevenlabs.voice_settings must be a mapping"

  Scenario: Elevenlabs pronunciation locators must be list
    Given a provider config:
      """
      providers:
        elevenlabs:
          pronunciation_dictionary_locators: "nope"
      """
    When I resolve tts provider "elevenlabs"
    Then the provider error should include "pronunciation_dictionary_locators must be a list"

  Scenario: Elevenlabs pronunciation locators entries must be mappings
    Given a provider config:
      """
      providers:
        elevenlabs:
          pronunciation_dictionary_locators:
            - nope
      """
    When I resolve tts provider "elevenlabs"
    Then the provider error should include "pronunciation_dictionary_locators entries must be mappings"

  Scenario: Unknown provider names are rejected
    Given a provider config:
      """
      {}
      """
    When I resolve tts provider "unknown"
    Then the provider error should include "Unknown TTS provider"
    When I resolve sfx provider "unknown"
    Then the provider error should include "Unknown SFX provider"
    When I resolve music provider "unknown"
    Then the provider error should include "Unknown music provider"
