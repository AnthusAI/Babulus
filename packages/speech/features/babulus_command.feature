Feature: The babulus command and the Auritus names that still work
  The speech package is now distributed as babulus-speech and its command line
  is babulus. People and tools that still call the auritus command, or import
  the auritus Python module, keep working through aliases that run the very
  same code. Audio that was already generated stays valid because the identity
  of a speech request does not change with the rename.

  Scenario: The babulus and auritus commands run the same entry point
    Given the babulus-speech package metadata
    Then the "babulus" command runs "babulus_speech.cli:app"
    And the "auritus" command runs "babulus_speech.cli:app"

  Scenario: The babulus command lists the command groups
    When I run the babulus command with "--help"
    Then the command succeeds
    And the command output lists "login"
    And the command output lists "job"
    And the command output lists "cost"

  Scenario: The auritus module is an alias for babulus_speech
    When I import "auritus.speech" and "babulus_speech.speech"
    Then both names refer to the same module
    And "auritus.tts.fake" and "babulus_speech.tts.fake" refer to the same module

  Scenario: The speech bridge still starts under its old module name
    VideoML starts the bridge with python -m auritus.speech_bridge, so that
    name has to keep working until its callers move to babulus_speech.

    When I start the speech bridge as module "auritus.speech_bridge" and ask for capabilities of voice "fake:default"
    Then the bridge answers ok for the voice "fake:default"

  Scenario Outline: Speech request identity is unchanged by the rename (the fake backend is the same on every platform)
    Given the text "Hello world."
    When the speech request key is computed for backend "<backend>" and voice "<voice>"
    Then the speech request key is "<key>"

    Examples:
      | backend | voice    | key                                                              |
      | fake    | default  | f749770ee15af77b59e55bda6fbe04905935fccfa5a3cd40594eafea50c5f693 |
