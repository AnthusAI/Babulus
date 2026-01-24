Feature: Renderer frame

  Scenario: Render frame to HTML snapshot
    Given a render config fps 30 width 640 height 360 duration 300
    When I render frame 12 to HTML
    Then the HTML should include "frame=12 fps=30 timeMs=400"
    And the HTML should include "width:640px"
    And the HTML should include "height:360px"

  Scenario: Render frame writes HTML file
    Given a render config fps 24 width 800 height 450 duration 240
    When I render frame 48 to an HTML file
    Then the HTML file should include "frame=48 fps=24 timeMs=2000"
    And the HTML file should include "width:800px"

  Scenario: Render frame writes PNG file
    Given a render config fps 12 width 320 height 180 duration 120
    And the frame scale is 2
    When I render frame 6 to a PNG file
    Then the PNG file should include the PNG header
    And the render viewport should be 320x180
    And the render scale should be 2

  Scenario: Render frame supports viewport-size-only pages
    Given a render config fps 12 width 320 height 180 duration 120
    And the viewport size fallback is enabled
    When I render frame 6 to a PNG file
    Then the PNG file should include the PNG header
    And the render viewport should be 320x180

  Scenario: Render frame closes browser when auto-close enabled
    Given a render config fps 12 width 320 height 180 duration 120
    And the browser auto close is enabled
    When I render frame 1 to a PNG file
    Then the browser should be closed

  Scenario: Render frame sequence writes PNGs
    Given a render config fps 10 width 100 height 50 duration 5
    When I render frames 0 through 2 to a PNG sequence
    Then the PNG sequence should include 3 files
    And the PNG sequence should include "frame-000000.png"

  Scenario: Render frame sequence reports PNG callbacks
    Given a render config fps 10 width 100 height 50 duration 5
    And PNG sequence callbacks are tracked
    When I render frames 0 through 1 to a PNG sequence
    Then the PNG frame callbacks should be called 2 times
    And the PNG frame callbacks should include frame 1

  Scenario: Render frame sequence writes HTML files
    Given a render config fps 10 width 100 height 50 duration 5
    When I render frames 0 through 1 to an HTML sequence
    Then the HTML sequence should include 2 files
    And the HTML sequence should include "frame-000000.html"

  Scenario: Render frame sequence reports HTML callbacks
    Given a render config fps 10 width 100 height 50 duration 5
    And HTML sequence callbacks are tracked
    When I render frames 0 through 1 to an HTML sequence
    Then the HTML frame callbacks should be called 2 times
    And the HTML frame callbacks should include frame 1

  Scenario: Render frame sequence closes browser when auto-close enabled
    Given a render config fps 10 width 100 height 50 duration 5
    And the browser auto close is enabled
    When I render frames 0 through 1 to a PNG sequence
    Then the browser should be closed

  Scenario: Render frame sequence HTML returns empty when start is after end
    Given a render config fps 10 width 100 height 50 duration 5
    When I render frames 4 through 2 to an HTML sequence
    Then the HTML sequence should include 0 files

  Scenario: Render frame sequence supports %d pattern
    Given a render config fps 10 width 100 height 50 duration 5
    And the sequence pattern is "frame-%d.png"
    When I render frames 0 through 1 to a PNG sequence
    Then the PNG sequence should include 2 files
    And the PNG sequence should include "frame-0.png"

  Scenario: Render frame sequence supports literal pattern
    Given a render config fps 10 width 100 height 50 duration 5
    And the sequence pattern is "frame.png"
    When I render frames 0 through 1 to a PNG sequence
    Then the PNG sequence should include 2 files
    And the PNG sequence should include "frame.png"

  Scenario: Render frame sequence caps end frame
    Given a render config fps 10 width 100 height 50 duration 5
    When I render frames 3 through 10 to a PNG sequence
    Then the PNG sequence should include 2 files
    And the PNG sequence should include "frame-000004.png"

  Scenario: Render frame sequence passes device scale
    Given a render config fps 10 width 100 height 50 duration 5
    And the sequence scale is 2
    When I render frames 0 through 0 to a PNG sequence
    Then the render viewport should be 100x50
    And the render scale should be 2

  Scenario: Render frame sequence returns empty when start is after end
    Given a render config fps 10 width 100 height 50 duration 5
    When I render frames 4 through 2 to a PNG sequence
    Then the PNG sequence should include 0 files
