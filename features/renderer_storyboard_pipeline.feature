Feature: Storyboard render pipeline

  Scenario: Storyboard pipeline derives config from script and timeline
    Given a storyboard pipeline script with meta fps 24 width 1280 height 720 scenes ending at 8
    And a storyboard pipeline timeline lasting 12 seconds
    When I render the storyboard pipeline
    Then the storyboard pipeline should render fps 24 width 1280 height 720 duration frames 288

  Scenario: Storyboard pipeline honors overrides and props
    Given a storyboard pipeline script with meta fps 30 width 1920 height 1080 scenes ending at 6
    And a storyboard pipeline timeline lasting 4 seconds
    And storyboard pipeline overrides fps 60 width 800 height 600 duration frames 300
    And storyboard pipeline title "Demo" subtitle "Preview"
    And storyboard pipeline audio path "voice.wav"
    And storyboard pipeline frame pattern "img-%04d.png"
    And storyboard pipeline ffmpeg path "custom-ffmpeg"
    When I render the storyboard pipeline
    Then the storyboard pipeline should render fps 60 width 800 height 600 duration frames 300
    And the storyboard pipeline should render the storyboard component
    And the storyboard pipeline should pass title "Demo" subtitle "Preview"
    And the storyboard pipeline should encode audio "voice.wav"
    And the storyboard pipeline should render pattern "img-%04d.png"
    And the storyboard pipeline should encode with ffmpeg "custom-ffmpeg"
