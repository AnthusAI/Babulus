Feature: Storyboard PNG frames

  Scenario: Storyboard PNG frames derive config from script and timeline
    Given a storyboard png frames script with meta fps 24 width 1280 height 720 scenes ending at 8
    And a storyboard png frames timeline lasting 12 seconds
    When I render the storyboard png frames
    Then the storyboard png frames should render fps 24 width 1280 height 720 duration frames 288

  Scenario: Storyboard PNG frames honor overrides and props
    Given a storyboard png frames script with meta fps 30 width 1920 height 1080 scenes ending at 6
    And a storyboard png frames timeline lasting 4 seconds
    And storyboard png frames overrides fps 60 width 800 height 600 duration frames 300
    And storyboard png frames title "Demo" subtitle "Preview"
    And storyboard png frames pattern "img-%04d.png"
    And storyboard png frames scale 2
    When I render the storyboard png frames
    Then the storyboard png frames should render fps 60 width 800 height 600 duration frames 300
    And the storyboard png frames should render the storyboard component
    And the storyboard png frames should pass title "Demo" subtitle "Preview"
    And the storyboard png frames should render pattern "img-%04d.png"
    And the storyboard png frames should render scale 2
