Feature: DSL validation

  Scenario: Validate a minimal video spec
    Given a video spec:
      """
      {
        "id": "intro",
        "storyboard": {
          "scenes": [
            {
              "id": "title",
              "cues": [
                {
                  "id": "hook",
                  "content": [{ "kind": "say", "text": "Hello" }]
                }
              ]
            }
          ]
        }
      }
      """
    When I validate the video spec
    Then the validation should succeed

  Scenario: Fail when id is missing
    Given a video spec:
      """
      {
        "storyboard": {
          "scenes": []
        }
      }
      """
    When I validate the video spec
    Then the validation should fail
    And the validation error path should be "id"

  Scenario: Fail on invalid cue content
    Given a video spec:
      """
      {
        "id": "intro",
        "storyboard": {
          "scenes": [
            {
              "id": "title",
              "cues": [
                {
                  "id": "hook",
                  "content": [{ "kind": "say", "text": 123 }]
                }
              ]
            }
          ]
        }
      }
      """
    When I validate the video spec
    Then the validation should fail
    And the validation error path should be "storyboard.scenes[0].cues[0].content"
