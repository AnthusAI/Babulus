Feature: Storyboard HTML frames

  Scenario: Storyboard frames derive config from script and timeline
    Given a storyboard frames script with meta fps 24 width 1280 height 720 scenes ending at 8
    And a storyboard frames timeline lasting 12 seconds
    When I render the storyboard frames
    Then the storyboard frames should render fps 24 width 1280 height 720 duration frames 288

  Scenario: Storyboard frames honor overrides and props
    Given a storyboard frames script with meta fps 30 width 1920 height 1080 scenes ending at 6
    And a storyboard frames timeline lasting 4 seconds
    And storyboard frames overrides fps 60 width 800 height 600 duration frames 300
    And storyboard frames title "Demo" subtitle "Preview"
    And storyboard frames pattern "img-%04d.html"
    When I render the storyboard frames
    Then the storyboard frames should render fps 60 width 800 height 600 duration frames 300
    And the storyboard frames should render the storyboard component
    And the storyboard frames should pass title "Demo" subtitle "Preview"
    And the storyboard frames should render pattern "img-%04d.html"
