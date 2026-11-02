Feature: Renderer toolchain

  Scenario: Detects versions and validates expectations
    Given toolchain expects ffmpeg "6.1.1"
    And toolchain expects playwright "1.45.0"
    And toolchain ffmpeg output "ffmpeg version 6.1.1"
    And toolchain playwright package "playwright" version "1.45.0"
    When I detect renderer toolchain
    Then the renderer toolchain should be ok
    And the renderer toolchain ffmpeg version should be "6.1.1"
    And the renderer toolchain playwright version should be "1.45.0"

  Scenario: Missing playwright fails when required
    Given toolchain requires playwright
    And toolchain ffmpeg output "ffmpeg version 6.1.1"
    And toolchain playwright is missing
    When I detect renderer toolchain
    Then the renderer toolchain should not be ok
    And the renderer toolchain issues should include "Playwright"

  Scenario: Missing ffmpeg fails when required
    Given toolchain requires ffmpeg
    And toolchain ffmpeg error "ENOENT"
    And toolchain playwright package "playwright" version "1.45.0"
    When I detect renderer toolchain
    Then the renderer toolchain should not be ok
    And the renderer toolchain issues should include "ffmpeg"
