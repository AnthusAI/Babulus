Feature: Renderer pipeline

  Scenario: Render pipeline uses render and encode
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    When I run the render pipeline
    Then the pipeline should render frames to "frames"
    And the pipeline should encode to "video.mp4"

  Scenario: Render pipeline forwards audio and ffmpeg
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    And a pipeline audio path "voice.wav"
    And the ffmpeg path is "custom-ffmpeg"
    When I run the render pipeline
    Then the pipeline should encode audio "voice.wav"
    And the pipeline should encode with ffmpeg "custom-ffmpeg"

  Scenario: Render pipeline forwards frame options
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    And the pipeline frame pattern is "img-%04d.png"
    And the pipeline frame range is 5 to 7
    And the pipeline scale is 2
    When I run the render pipeline
    Then the pipeline should render with pattern "img-%04d.png"
    And the pipeline should render frames 5 to 7
    And the pipeline should render with scale 2

  Scenario: Render pipeline forwards encode runner
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    And a pipeline encode runner is injected
    When I run the render pipeline
    Then the pipeline should pass the encode runner

  Scenario: Render pipeline forwards input props
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    And the pipeline input prop "variant" is "demo"
    When I run the render pipeline
    Then the pipeline should render input prop "variant" "demo"

  Scenario: Render pipeline forwards frame callback
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    And a pipeline frame callback is registered
    When I run the render pipeline
    Then the pipeline should report a frame callback for frame 0

  Scenario: Render pipeline forwards fps to encoder
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    When I run the render pipeline
    Then the pipeline should encode fps 30

  Scenario: Render pipeline fails when no frames rendered
    Given a pipeline config fps 30 width 640 height 360 duration 120 frames dir "frames" output "video.mp4"
    And the pipeline renders no frames
    When I run the render pipeline
    Then the pipeline should fail with "No frames rendered"
