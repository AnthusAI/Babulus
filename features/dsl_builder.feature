Feature: DSL builder

  Scenario: Build a composition with a scene and cue
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello world"
    When the video spec is built
    Then the composition id should be "intro"
    And the scene id should be "title"
    And the cue id should be "hook"
    And the cue label should be "Hook"
    And the cue text should be "Hello world"

  Scenario: Insert a fixed pause in a scene
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a 0.5 second pause and a cue "Hook" saying "Hello"
    When the video spec is built
    Then the first scene item should be a fixed pause of 0.5 seconds

  Scenario: Add an sfx clip to a scene
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello" and an sfx clip "whoosh"
    When the video spec is built
    Then the first audio track should be "sfx"
    And the first audio clip id should be "whoosh"
    And the audio clip should start at scene offset 0

  Scenario: Insert a gaussian pause in a scene
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a gaussian pause of 0.4 seconds and std 0.1 and a cue "Hook" saying "Hello"
    When the video spec is built
    Then the first scene item should be a gaussian pause with mean 0.4 and std 0.1

  Scenario: Insert a pause in voice segments
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello" and a 0.2 second voice pause
    When the video spec is built
    Then the second voice segment should be a fixed pause of 0.2 seconds

  Scenario: Add a music clip with an offset
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello" and a music clip "bed" starting at 1.5 seconds
    When the video spec is built
    Then the first audio track should be "music"
    And the first audio clip id should be "bed"
    And the audio clip should start at scene offset 1.5

  Scenario: Apply composition defaults and overrides
    Given a video with a composition named "Intro"
    And the defaults include meta fps 30 width 1920 height 1080 and voiceover provider "openai" voice "alloy"
    And the composition overrides width 1280 and voice "nova"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello"
    When the video spec is built
    Then the composition meta fps should be 30
    And the composition meta width should be 1280
    And the composition meta height should be 1080
    And the composition voiceover provider should be "openai"
    And the composition voiceover voice should be "nova"

  Scenario: Store cue bullets
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello" and bullets:
      | bullet |
      | First |
      | Second |
    When the video spec is built
    Then the cue bullets should be:
      | bullet |
      | First |
      | Second |

  Scenario: Apply trim end seconds to voice
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello" trimmed by 0.25 seconds
    When the video spec is built
    Then the first voice segment should have trim end seconds 0.25

  Scenario: Set a cue provider
    Given a video with a composition named "Intro"
    And the composition has a scene named "Title" with a cue "Hook" saying "Hello" using provider "openai"
    When the video spec is built
    Then the cue provider should be "openai"
