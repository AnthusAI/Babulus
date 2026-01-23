Feature: Renderer encode

  Scenario: Build ffmpeg args without audio
    Given an encode config fps 30 frames dir "frames" output "out.mp4"
    When I build ffmpeg args
    Then the args should include "-framerate"
    And the args should include "30"
    And the args should include "frames/frame-%06d.png"
    And the args should include "out.mp4"
    And the args should not include "-shortest"
    And the args should not include "-c:a"

  Scenario: Build ffmpeg args uses default pattern
    Given an encode config fps 30 frames dir "frames" output "out.mp4"
    And no frame pattern is set
    When I build ffmpeg args
    Then the args should include "frames/frame-%06d.png"

  Scenario: Build ffmpeg args uses custom pattern
    Given an encode config fps 30 frames dir "frames" output "out.mp4"
    And the frame pattern is "img-%04d.png"
    When I build ffmpeg args
    Then the args should include "frames/img-%04d.png"

  Scenario: Build ffmpeg args with audio
    Given an encode config fps 24 frames dir "frames" output "out.mp4"
    And an encode audio path "voice.wav"
    When I build ffmpeg args
    Then the args should include "-i"
    And the args should include "voice.wav"
    And the args should include "-shortest"

  Scenario: Encode uses injected runner
    Given an encode config fps 12 frames dir "frames" output "out.mp4"
    When I encode with a fake runner
    Then the runner should be called with "ffmpeg"

  Scenario: Encode fails on non-zero exit
    Given an encode config fps 12 frames dir "frames" output "out.mp4"
    When I encode with a failing runner
    Then the encode should fail
    And the encode error should include "ffmpeg failed"

  Scenario: Encode fails on null exit
    Given an encode config fps 12 frames dir "frames" output "out.mp4"
    When I encode with a null runner
    Then the encode should fail

  Scenario: Encode uses custom ffmpeg path
    Given an encode config fps 12 frames dir "frames" output "out.mp4"
    And the encode ffmpeg path is "custom-ffmpeg"
    When I encode with a fake runner
    Then the runner should be called with "custom-ffmpeg"
