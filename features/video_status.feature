Feature: Video status transitions

  Scenario: Allow draft to generating transition
    Given a video status "draft"
    When I transition video status to "generating"
    Then the transitioned video status should be "generating"

  Scenario: Reject invalid transition
    Given a video status "published"
    When I transition video status to "draft"
    Then the video status error should include "Invalid video status transition"

  Scenario: Allow idempotent transition
    Given a video status "ready"
    When I transition video status to "ready"
    Then the transitioned video status should be "ready"

  Scenario: Update video record status
    Given a video record with status "draft"
    When I update the video status to "generating"
    Then the transitioned video status should be "generating"
