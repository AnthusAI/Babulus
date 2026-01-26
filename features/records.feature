Feature: Control plane record helpers

  Scenario: Project input uses active org and trims name
    Given a project input with org "none" name "  Demo  " template "none"
    When I build a project input with active org "acme"
    Then the project org should be "acme"
    And the project name should be "Demo"

  Scenario: Org record uses context id and trims name
    Given record context id "org-1" now "2026-01-22T10:00:00Z"
    And an org input with name "  Studio  " plan "enterprise"
    When I build an org record
    Then the record id should be "org-1"
    And the org name should be "Studio"

  Scenario: User profile record uses context
    Given record context id "user-1" now "2026-01-22T10:00:00Z"
    And a user input with email " person@example.com " name " Ada "
    When I build a user profile record
    Then the record id should be "user-1"
    And the user email should be "person@example.com"
    And the user display name should be "Ada"

  Scenario: Conversation record uses context
    Given record context id "conv-1" now "2026-01-22T10:00:00Z"
    And a conversation input with org "none" video "vid-1"
    When I build a conversation record with active org "acme"
    Then the record id should be "conv-1"
    And the conversation org should be "acme"
    And the conversation video should be "vid-1"

  Scenario: Message input requires content
    Given a message input with org "acme" conversation "conv-1" role "user" content " "
    When I build a message input with active org "acme"
    Then the record error should include "Message content is required"

  Scenario: Approval record defaults status
    Given record context id "app-1" now "2026-01-22T10:00:00Z"
    And an approval input with org "none" video "vid-1" kind "script" status "none"
    When I build an approval record with active org "acme"
    Then the record id should be "app-1"
    And the approval status should be "pending"

  Scenario: Usage event record uses quantity
    Given record context id "use-1" now "2026-01-22T10:00:00Z"
    And a usage input with org "none" video "vid-1" run "run-1" provider "openai" unit "tokens" quantity "1200"
    When I build a usage record with active org "acme"
    Then the record id should be "use-1"
    And the usage unit should be "tokens"
    And the usage quantity should be "1200"

  Scenario: Render agent record defaults status
    Given record context id "agent-1" now "2026-01-22T10:00:00Z"
    And a render agent input with org "none" label "Mac Studio" status "none"
    When I build a render agent record with active org "acme"
    Then the record id should be "agent-1"
    And the render agent status should be "offline"

  Scenario: Org member input defaults role
    Given an org member input with org "none" user "user-1" role "none"
    When I build an org member input with active org "acme"
    Then the org member org should be "acme"
    And the org member role should be "viewer"

  Scenario: Org member record uses context
    Given record context id "ignored" now "2026-01-22T10:00:00Z"
    And an org member input with org "acme" user "user-1" role "admin"
    When I build an org member record with active org "acme"
    Then the org member org should be "acme"
    And the org member role should be "admin"

  Scenario: Project input rejects empty name
    Given a project input with org "acme" name "   " template "none"
    When I build a project input with active org "acme"
    Then the record error should include "Project name is required"

  Scenario: Video input defaults status
    Given a video input with org "none" project "proj-1" title "Intro" status "none"
    When I build a video input with active org "acme"
    Then the video org should be "acme"
    And the video status should be "draft"

  Scenario: Video input rejects missing project id
    Given a video input with org "acme" project " " title "Intro" status "draft"
    When I build a video input with active org "acme"
    Then the record error should include "Project id is required"

  Scenario: Storyboard version input requires source text
    Given a storyboard input with org "acme" video "vid-1" source " " parent "none"
    When I build a storyboard input with active org "acme"
    Then the record error should include "Storyboard source is required"

  Scenario: Generation run input defaults status
    Given a generation run input with org "none" video "vid-1" storyboard "sb-1" status "none"
    When I build a generation run input with active org "acme"
    Then the run status should be "queued"

  Scenario: Render run input requires generation run
    Given a render run input with org "acme" video "vid-1" generation " " status "queued"
    When I build a render run input with active org "acme"
    Then the record error should include "Generation run id is required"

  Scenario: Job input defaults status
    Given a job input with org "none" kind "render" status "none"
    When I build a job input with active org "acme"
    Then the job org should be "acme"
    And the record job status should be "queued"

  Scenario: Job input accepts idempotency key
    Given a job input with org "none" kind "render" status "none" idempotency "render-vid-1"
    When I build a job input with active org "acme"
    Then the job idempotency key should be "render-vid-1"

  Scenario: Billing account input defaults visibility
    Given a billing input with org "none" mode "byok" visibility "none" plan "starter"
    When I build a billing input with active org "acme"
    Then the billing org should be "acme"
    And the billing visibility should be "redacted"

  Scenario: Asset input builds storage key
    Given an asset input with org "none" project "proj-1" kind "image" sha "abc123" file "hero.png" storage "none"
    When I build an asset input with active org "acme"
    Then the asset storage key should be "org/acme/projects/proj-1/assets/image/abc123/hero.png"

  Scenario: Asset input requires sha when no storage key
    Given an asset input with org "acme" project "none" kind "image" sha "none" file "hero.png" storage "none"
    When I build an asset input with active org "acme"
    Then the record error should include "Asset sha256 is required"

  Scenario: Asset input uses provided storage key
    Given an asset input with org "none" project "none" kind "audio" sha "none" file "none" storage "org/acme/shared/audio/voice.wav"
    When I build an asset input with active org "acme"
    Then the asset storage key should be "org/acme/shared/audio/voice.wav"

  Scenario: Project record uses context id and time
    Given record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a project input with org "none" name "Demo" template "none"
    When I build a project record with active org "acme"
    Then the record id should be "proj-1"
    And the record createdAt should be "2026-01-22T10:00:00.000Z"

  Scenario: Video record defaults status and uses context
    Given record context id "video-1" now "2026-01-22T10:00:00Z"
    And a video input with org "none" project "proj-1" title "Intro" status "none"
    When I build a video record with active org "acme"
    Then the record id should be "video-1"
    And the video status should be "draft"

  Scenario: Generation run record carries artifact keys
    Given record context id "run-1" now "2026-01-22T10:00:00Z"
    And a generation run input with org "acme" video "vid-1" storyboard "sb-1" status "queued"
    When I build a generation run record with active org "acme"
    Then the record id should be "run-1"
    And the generation run script key should be "org/acme/videos/vid-1/runs/run-1/script.json"
    And the generation run timeline key should be "org/acme/videos/vid-1/runs/run-1/timeline.json"
    And the generation run audio key should be "org/acme/videos/vid-1/runs/run-1/audio.wav"
    And the generation run logs key should be "org/acme/videos/vid-1/runs/run-1/generation.log"

  Scenario: Render run record carries artifact keys
    Given record context id "render-1" now "2026-01-22T10:00:00Z"
    And a render run input with org "acme" video "vid-1" generation "run-1" status "queued"
    When I build a render run record with active org "acme"
    Then the record id should be "render-1"
    And the render run mp4 key should be "org/acme/videos/vid-1/runs/render-1/render.mp4"
    And the render run stills prefix should be "org/acme/videos/vid-1/runs/render-1/stills/"
    And the render run logs key should be "org/acme/videos/vid-1/runs/render-1/render.log"

  Scenario: Job record uses context and defaults
    Given record context id "job-1" now "2026-01-22T10:00:00Z"
    And a job input with org "none" kind "generate" status "none"
    When I build a job record with active org "acme"
    Then the record id should be "job-1"
    And the job org should be "acme"
    And the record job status should be "queued"
    And the job createdAt should be "2026-01-22T10:00:00.000Z"

  Scenario: Job event record uses context
    Given record context id "evt-1" now "2026-01-22T10:00:00Z"
    And a job event input with org "none" job "job-1" type "status" message " running " progress "1"
    When I build a job event record with active org "acme"
    Then the record id should be "evt-1"
    And the job event job should be "job-1"
    And the job event type should be "status"
    And the job event message should be "running"
    And the job event progress should be "1"

  Scenario: Asset record uses context id and time
    Given record context id "asset-1" now "2026-01-22T10:00:00Z"
    And an asset input with org "none" project "none" kind "audio" sha "def456" file "voice.wav" storage "none"
    When I build an asset record with active org "acme"
    Then the record id should be "asset-1"
    And the asset storage key should be "org/acme/projects/shared/assets/audio/def456/voice.wav"
