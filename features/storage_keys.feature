Feature: Storage keys

  Scenario: Build asset key with project
    When I build an asset key for org "org-1" project "proj-1" kind "audio" sha "abc123" file "voice.wav"
    Then the storage key should be "org/org-1/projects/proj-1/assets/audio/abc123/voice.wav"

  Scenario: Build asset key with shared project
    When I build an asset key for org "org-1" kind "image" sha "def456" file "hero.png"
    Then the storage key should be "org/org-1/projects/shared/assets/image/def456/hero.png"

  Scenario: Build run artifact key
    When I build a run artifact key for org "org-1" video "vid-1" run "run-1" file "script.json"
    Then the storage key should be "org/org-1/videos/vid-1/runs/run-1/script.json"

  Scenario: Build generation artifact keys
    When I build generation artifact keys for org "org-1" video "vid-1" run "run-1"
    Then the generation artifact key "script" should be "org/org-1/videos/vid-1/runs/run-1/script.json"
    And the generation artifact key "timeline" should be "org/org-1/videos/vid-1/runs/run-1/timeline.json"
    And the generation artifact key "audio" should be "org/org-1/videos/vid-1/runs/run-1/audio.wav"
    And the generation artifact key "logs" should be "org/org-1/videos/vid-1/runs/run-1/generation.log"

  Scenario: Build render artifact keys
    When I build render artifact keys for org "org-1" video "vid-1" run "run-1"
    Then the render artifact key "mp4" should be "org/org-1/videos/vid-1/runs/run-1/render.mp4"
    And the render artifact key "stills" should be "org/org-1/videos/vid-1/runs/run-1/stills/"
    And the render artifact key "logs" should be "org/org-1/videos/vid-1/runs/run-1/render.log"

  Scenario: Reject invalid segments
    When I build an asset key for org "org/1" kind "audio" sha "abc123" file "voice.wav"
    Then the storage error should include "orgId must not include path separators"
