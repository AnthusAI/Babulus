Feature: Control plane store

  Scenario: Create org and membership
    Given a control plane store
    And control plane record context id "org-1" now "2026-01-22T10:00:00Z"
    And a control plane org input with name "Studio"
    When I create an org
    And a control plane org member input with org "org-1" user "user-1" role "owner"
    When I create an org member in org "org-1"
    Then the listed org ids for user "user-1" should be "org-1"
    And the listed org member ids for org "org-1" should be "user-1"

  Scenario: Update org member role
    Given a control plane store
    And control plane record context id "org-1" now "2026-01-22T10:00:00Z"
    And a control plane org input with name "Studio"
    When I create an org
    And a control plane org member input with org "org-1" user "user-1" role "viewer"
    When I create an org member in org "org-1"
    When I set org member "user-1" role to "admin" in org "org-1"
    Then the org member role for "user-1" in org "org-1" should be "admin"

  Scenario: Create billing account and list by org
    Given a control plane store
    And control plane record context id "org-1" now "2026-01-22T10:00:00Z"
    And a control plane org input with name "Studio"
    When I create an org
    And control plane record context id "bill-1" now "2026-01-22T10:01:00Z"
    And a control plane billing input with org "org-1" mode "byok" visibility "full" plan "starter"
    When I create a billing account in org "org-1"
    Then the listed billing ids for org "org-1" should be "bill-1"

  Scenario: Update billing visibility
    Given a control plane store
    And control plane record context id "org-1" now "2026-01-22T10:00:00Z"
    And a control plane org input with name "Studio"
    When I create an org
    And control plane record context id "bill-1" now "2026-01-22T10:01:00Z"
    And a control plane billing input with org "org-1" mode "byok" visibility "redacted" plan "starter"
    When I create a billing account in org "org-1"
    When I set billing "bill-1" visibility to "full" in org "org-1"
    Then the billing visibility for "bill-1" in org "org-1" should be "full"

  Scenario: Create user profile and list by org membership
    Given a control plane store
    And control plane record context id "org-1" now "2026-01-22T10:00:00Z"
    And a control plane org input with name "Studio"
    When I create an org
    And control plane record context id "user-1" now "2026-01-22T10:01:00Z"
    And a control plane user input with email "person@example.com" name "Ada"
    When I create a user profile
    And a control plane org member input with org "org-1" user "user-1" role "viewer"
    When I create an org member in org "org-1"
    Then the listed user ids for org "org-1" should be "user-1"

  Scenario: Create conversation and messages
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:01:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "conv-1" now "2026-01-22T10:02:00Z"
    And a control plane conversation input with video "vid-1"
    When I create a conversation in org "acme"
    And control plane record context id "msg-1" now "2026-01-22T10:03:00Z"
    And a control plane message input with conversation "conv-1" role "user" content "Hello"
    When I create a message in org "acme"
    Then the listed conversation ids for org "acme" should be "conv-1"
    And the listed message ids for org "acme" conversation "conv-1" should be "msg-1"

  Scenario: Create and resolve approvals
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:01:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "app-1" now "2026-01-22T10:02:00Z"
    And a control plane approval input with video "vid-1" kind "script" status "pending"
    When I create an approval in org "acme"
    Then the listed approval ids for org "acme" should be "app-1"
    When I set approval "app-1" status to "approved" in org "acme"
    Then the approval status for "app-1" should be "approved"

  Scenario: Create usage events and list by video
    Given a control plane store
    And control plane record context id "use-1" now "2026-01-22T10:00:00Z"
    And a control plane usage input with video "vid-1" run "run-1" provider "openai" unit "tokens" quantity "1200"
    When I create a usage event in org "acme"
    Then the listed usage ids for org "acme" video "vid-1" should be "use-1"

  Scenario: Create render agent and update status
    Given a control plane store
    And control plane record context id "agent-1" now "2026-01-22T10:00:00Z"
    And a control plane render agent input with label "Mac Studio" status "offline"
    When I create a render agent in org "acme"
    Then the listed render agent ids for org "acme" should be "agent-1"
    When I set render agent "agent-1" status to "busy" in org "acme"
    Then the render agent status for "agent-1" should be "busy"

  Scenario: Create and list projects by org
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    Then the control plane project ids should be "proj-1"
    And the listed project ids for org "acme" should be "proj-1"
    And the listed project ids for org "beta" should be ""

  Scenario: Create and list assets by org
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "asset-1" now "2026-01-22T10:01:00Z"
    And a control plane asset input with project "proj-1" kind "image" sha "abc123" file "hero.png" storage "none"
    When I create an asset in org "acme"
    Then the listed asset ids for org "acme" should be "asset-1"
    And the listed asset ids for org "beta" should be ""

  Scenario: List shared assets alongside project assets
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "asset-1" now "2026-01-22T10:01:00Z"
    And a control plane asset input with project "proj-1" kind "image" sha "abc123" file "hero.png" storage "none"
    When I create an asset in org "acme"
    And control plane record context id "asset-2" now "2026-01-22T10:02:00Z"
    And a control plane asset input with project "none" kind "audio" sha "def456" file "voice.wav" storage "none"
    When I create an asset in org "acme"
    Then the listed asset ids for org "acme" project "proj-1" should be "asset-1,asset-2"

  Scenario: Create asset rejects missing project
    Given a control plane store
    And a control plane asset input with project "missing" kind "image" sha "abc123" file "hero.png" storage "none"
    When I create an asset in org "acme"
    Then the control plane error should include "Project not found"

  Scenario: Create video requires project in same org
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And a control plane video input with project "proj-1" title "Intro"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    When I create a video in org "acme"
    Then the listed video ids for org "acme" should be "vid-1"
    And the listed video ids for org "beta" should be ""

  Scenario: Create video rejects missing project
    Given a control plane store
    And a control plane video input with project "missing" title "Intro"
    When I create a video in org "acme"
    Then the control plane error should include "Project not found"

  Scenario: Create storyboard version requires video in org
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "sb-1" now "2026-01-22T10:00:00Z"
    And a control plane storyboard input with video "vid-1" source "Hello"
    When I create a storyboard version in org "acme"
    Then the listed storyboard ids for org "acme" should be "sb-1"

  Scenario: Set active storyboard version
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "sb-1" now "2026-01-22T10:00:00Z"
    And a control plane storyboard input with video "vid-1" source "Hello"
    When I create a storyboard version in org "acme"
    When I set video "vid-1" active storyboard to "sb-1" in org "acme"
    Then the video active storyboard for "vid-1" should be "sb-1"

  Scenario: Create generation run requires video in org
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "run-1" now "2026-01-22T10:00:00Z"
    And a control plane generation run input with video "vid-1" storyboard "sb-1"
    When I create a generation run in org "acme"
    Then the listed generation run ids for org "acme" should be "run-1"

  Scenario: Create render run requires generation run
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "run-1" now "2026-01-22T10:00:00Z"
    And a control plane generation run input with video "vid-1" storyboard "sb-1"
    When I create a generation run in org "acme"
    And control plane record context id "render-1" now "2026-01-22T10:00:00Z"
    And a control plane render run input with generation "run-1" video "vid-1"
    When I create a render run in org "acme"
    Then the listed render run ids for org "acme" should be "render-1"

  Scenario: Create render run rejects missing generation run
    Given a control plane store
    And a control plane render run input with generation "missing" video "vid-1"
    When I create a render run in org "acme"
    Then the control plane error should include "Generation run not found"

  Scenario: Update video status in control plane
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    When I set video "vid-1" status to "generating" in org "acme"
    Then the video status for "vid-1" should be "generating"

  Scenario: Update generation run status in control plane
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "run-1" now "2026-01-22T10:00:00Z"
    And a control plane generation run input with video "vid-1" storyboard "sb-1"
    When I create a generation run in org "acme"
    When I set generation run "run-1" status to "succeeded" in org "acme"
    Then the generation run status for "run-1" should be "succeeded"

  Scenario: Update render run status in control plane
    Given a control plane store
    And control plane record context id "proj-1" now "2026-01-22T10:00:00Z"
    And a control plane project input with name "Demo"
    When I create a project in org "acme"
    And control plane record context id "vid-1" now "2026-01-22T10:00:00Z"
    And a control plane video input with project "proj-1" title "Intro"
    When I create a video in org "acme"
    And control plane record context id "run-1" now "2026-01-22T10:00:00Z"
    And a control plane generation run input with video "vid-1" storyboard "sb-1"
    When I create a generation run in org "acme"
    And control plane record context id "render-1" now "2026-01-22T10:00:00Z"
    And a control plane render run input with generation "run-1" video "vid-1"
    When I create a render run in org "acme"
    When I set render run "render-1" status to "failed" in org "acme"
    Then the render run status for "render-1" should be "failed"

  Scenario: Create and claim job in control plane
    Given a control plane store
    And control plane record context id "job-1" now "2026-01-22T10:00:00Z"
    And a control plane job input with kind "render" status "queued"
    When I create a job in org "acme"
    Then the listed job ids for org "acme" should be "job-1"
    When I claim job "job-1" for agent "agent-1" in org "acme"
    Then the job status for "job-1" should be "claimed"
    And the job claimedBy for "job-1" should be "agent-1"

  Scenario: Claim job with event
    Given a control plane store
    And control plane record context id "job-1" now "2026-01-22T10:00:00Z"
    And a control plane job input with kind "render" status "queued"
    When I create a job in org "acme"
    And control plane record context id "evt-1" now "2026-01-22T10:00:30Z"
    When I claim job "job-1" for agent "agent-1" with event in org "acme"
    Then the job status for "job-1" should be "claimed"
    And the listed job event ids for org "acme" job "job-1" should be "evt-1"

  Scenario: Job idempotency key reuses existing job
    Given a control plane store
    And control plane record context id "job-1" now "2026-01-22T10:00:00Z"
    And a control plane job input with kind "render" status "queued" idempotency "render-vid-1"
    When I create a job in org "acme"
    Then the listed job ids for org "acme" should be "job-1"
    And control plane record context id "job-2" now "2026-01-22T10:05:00Z"
    When I create a job in org "acme"
    Then the listed job ids for org "acme" should be "job-1"

  Scenario: Create and list job events in control plane
    Given a control plane store
    And control plane record context id "job-1" now "2026-01-22T10:00:00Z"
    And a control plane job input with kind "render" status "queued"
    When I create a job in org "acme"
    And control plane record context id "evt-1" now "2026-01-22T10:01:00Z"
    And a control plane job event input with job "job-1" type "status" message "running" progress "0.2"
    When I create a job event in org "acme"
    Then the listed job event ids for org "acme" job "job-1" should be "evt-1"

  Scenario: Update job status in control plane
    Given a control plane store
    And control plane record context id "job-1" now "2026-01-22T10:00:00Z"
    And a control plane job input with kind "generate" status "queued"
    When I create a job in org "acme"
    When I set job "job-1" status to "running" in org "acme"
    Then the job status for "job-1" should be "running"

  Scenario: Update job status with event
    Given a control plane store
    And control plane record context id "job-1" now "2026-01-22T10:00:00Z"
    And a control plane job input with kind "render" status "queued"
    When I create a job in org "acme"
    And control plane record context id "evt-1" now "2026-01-22T10:01:00Z"
    When I set job "job-1" status to "running" with event in org "acme"
    Then the job status for "job-1" should be "running"
    And the listed job event ids for org "acme" job "job-1" should be "evt-1"
