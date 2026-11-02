Feature: Video commands speak to people and to agents

  The video commands print plain text for people and, with --json, exactly one
  JSON object for agents. A failure always says what went wrong and what to do
  next on a line that starts with "Fix:" (or in the "fix" field of the JSON
  object), and exits non-zero.

  Scenario: Submitting a video prints the job and why it waits
    Given a script file and a timeline file
    And the API accepts new video jobs
    When the user runs "video submit --script {script} --timeline {timeline}"
    Then the video command succeeds
    And the output mentions the content hash and "local worker"

  Scenario: Submitting with --json prints one JSON object
    Given a script file and a timeline file
    And the API accepts new video jobs
    When the user runs "video submit --script {script} --timeline {timeline} --json"
    Then the video command succeeds
    And the output is one JSON object with "ok" true, kind "video" and a "waiting_reason"

  Scenario: Submitting the same video again says the job already existed
    Given a script file and a timeline file
    And the API already has that video job
    When the user runs "video submit --script {script} --json"
    Then the video command succeeds
    And the output is one JSON object with "existing" true

  Scenario: A missing script file fails with a Fix line
    When the user runs "video submit --script /no/such/script.json"
    Then the video command fails
    And the error output has an "Error:" line and a "Fix:" line

  Scenario: A missing script file fails with a fix in the JSON
    When the user runs "video submit --script /no/such/script.json --json"
    Then the video command fails
    And the output is one JSON object with "ok" false and a "fix"

  Scenario: An expired login tells the user to log in
    Given a script file and a timeline file
    And the API says the session expired
    When the user runs "video submit --script {script}"
    Then the video command fails
    And the error output has an "Error:" line and a "Fix:" line
    And the fix mentions "babulus login"

  Scenario: The setup check names the missing piece
    Given this machine has no Node.js
    When the user runs "video check --json"
    Then the video command fails
    And the output is one JSON object with "ok" false and a "fix"
    And the fix mentions "Install Node.js"
