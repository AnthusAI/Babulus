Feature: Media helpers

  Scenario: Probe duration from ffprobe output
    Given media spawn will return stdout:
      """
      {"format":{"duration":"1.5"}}
      """
    When I probe duration for "file.wav"
    Then the media duration should be 1.5

  Scenario: Probe duration requires ffprobe
    Given media spawn will error "ENOENT"
    When I probe duration for "file.wav" and capture errors
    Then the media error should include "ffprobe is required"

  Scenario: Estimate trailing silence from samples
    Given media spawn will return stdout:
      """
      {"format":{"duration":"2"}}
      """
    And media spawn will return audio samples "0,0,0,300,0,0,0,0"
    When I estimate trailing silence with sample rate 4
    Then the trailing silence should be 1

  Scenario: Parse volume detect output
    Given media spawn will return stderr:
      """
      mean_volume: -12.0 dB
      max_volume: -1.0 dB
      """
    When I probe volume for "file.wav"
    Then the mean volume should be -12
    And the max volume should be -1

  Scenario: Detect silence and activity ratio
    Given media spawn will return audio samples "0,0,0,0"
    When I check if audio is silent
    Then the audio should be silent
    Given media spawn will return audio samples "0,300,0,-300"
    When I compute audio activity ratio with threshold 200
    Then the activity ratio should be 0.5

  Scenario: Concat rejects empty inputs
    When I concatenate with no segments
    Then the media error should include "No audio segments to concatenate"

  Scenario: Trim writes output file
    Given a media input file "input.wav"
    And media spawn will write temp output for "trimmed.wav"
    When I trim audio "input.wav" to "trimmed.wav" with duration 1
    Then the trimmed output should exist

  Scenario: Concat removes list file
    Given media spawn will succeed
    When I concatenate "out.wav" with segments "a.wav,b.wav"
    Then the concat list file should be removed
