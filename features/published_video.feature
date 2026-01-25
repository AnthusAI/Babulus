Feature: PublishedVideo Management
  As a user
  I want to publish videos with access control
  So that I can share videos securely

  Background:
    Given a control plane store initialized
    And an organization "org-123" exists
    And a video "video-123" exists for organization "org-123"
    And a render run "render-123" exists for video "video-123"

  Scenario: Create a published video with public access
    When I create a published video with slug "my-awesome-video"
    And access policy "public"
    Then the published video should be created successfully
    And the video should reference render run "render-123"
    And the access policy should be "public"
    And the slug should be "my-awesome-video"

  Scenario: Create a published video with password protection
    When I create a published video with slug "private-video"
    And access policy "password"
    And password hash "hashed-password-123"
    Then the published video should be created successfully
    And the password hash should be "hashed-password-123"

  Scenario: Get published video by ID
    Given a published video exists with id "pub-123"
    When I get the published video "pub-123"
    Then the published video should be returned
    And it should have the correct organization ID

  Scenario: Update published video view count
    Given a published video exists with id "pub-123"
    And the view count is 0
    When I update the view count to 100
    Then the view count should be 100

  Scenario: Update published video access policy
    Given a published video exists with id "pub-123"
    And the access policy is "public"
    When I update the access policy to "password"
    Then the access policy should be "password"

  Scenario: List published videos for organization
    Given 3 published videos exist for organization "org-123"
    When I list published videos for organization "org-123"
    Then I should get 3 published videos
    And all should belong to organization "org-123"

  Scenario: List published videos filtered by video ID
    Given 2 published videos exist for video "video-123"
    And 1 published video exists for video "video-456"
    When I list published videos for video "video-123"
    Then I should get 2 published videos

  Scenario: Cannot get published video from different organization
    Given a published video exists with id "pub-123" in organization "org-456"
    When I attempt to get published video "pub-123" as organization "org-123"
    Then the published video should not be found

  Scenario: Cannot update published video from different organization
    Given a published video exists with id "pub-123" in organization "org-456"
    When I attempt to update published video "pub-123" as organization "org-123"
    Then the update should fail with access denied
