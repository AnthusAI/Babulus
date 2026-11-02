Feature: Cloned voices are published to a content-addressed store

  A named voice is a reference recording and its transcript. Publishing it
  puts the files in a store keyed by their SHA-256, names them in a manifest,
  and only then makes the voice visible, so nobody sees half a voice. Jobs
  for a published voice carry it, and a Batch worker downloads the exact
  files, verifies them, and speaks in that voice. A voice that cannot be found
  is a failure, never a stock voice.

  Scenario: Publishing a complete voice makes it available to jobs
    Given a router with a fake clock and a fallback gate
    And a site that may create speech jobs
    And the voice "serious" is uploaded with its manifest last
    When the operator publishes the voice "serious"
    Then the publish succeeds
    And a speech job for voice "serious" on backend "fish" carries the published voice
    And redeeming that job's token lists the voice files with download links

  Scenario: A voice with a file missing from the store is refused by name
    Given a router with a fake clock and a fallback gate
    And a site that may create speech jobs
    And the voice "serious" is uploaded without its transcript file
    When the operator publishes the voice "serious"
    Then the publish is refused with error "voice_file_not_uploaded:serious.txt"
    And a speech job for voice "serious" on backend "fish" carries no published voice

  Scenario: Publishing before the manifest is uploaded is refused
    Given a router with a fake clock and a fallback gate
    When the operator publishes a manifest that was never uploaded
    Then the publish is refused with error "voice_manifest_not_uploaded"

  Scenario: A manifest that is not the object its hash names is refused
    Given a router with a fake clock and a fallback gate
    And the voice "serious" is uploaded with its manifest last
    When the operator publishes the voice "serious" under the hash of other bytes
    Then the publish is refused with error "voice_manifest_hash_mismatch"

  Scenario: A manifest for a different voice is refused
    Given a router with a fake clock and a fallback gate
    And the voice "serious" is uploaded with its manifest last
    When the operator publishes the voice "narrator"
    Then the publish is refused with error "voice_manifest_invalid"

  Scenario: A site key cannot publish a voice
    Given a router with a fake clock and a fallback gate
    When a site key holder publishes a voice
    Then the publish is refused with status 403

  Scenario: The Batch worker speaks in a published voice
    Given the Auritus API has a "fish" job for voice "serious"
    And the API lists the published files of the voice "serious" for the job
    And the Batch image has no reference voices
    And the cloning speech models are stubbed
    When the Batch worker starts for that job
    Then the Batch worker marks the job done
    And the stubbed model spoke with a reference recording named "serious.wav"

  Scenario: The Batch worker rejects a voice file that does not match its hash
    Given the Auritus API has a "fish" job for voice "serious"
    And the API lists the published files of the voice "serious" for the job
    And a downloaded voice file has been altered
    And the cloning speech models are stubbed
    When the Batch worker starts for that job
    Then the Batch worker marks the job failed with a reason containing "does not match its hash"
    And the Batch worker does not mark the job done

  Scenario: Publishing from the command line uploads the manifest last
    Given a voices folder containing "serious.wav" and "serious.txt"
    And the content store accepts uploads
    When the user publishes the voice "serious" from that folder with --json
    Then the video command succeeds
    And the recording and transcript were uploaded before the manifest
    And the voice was published under the manifest's hash

  Scenario: Publishing a voice that has no transcript fails with a fix
    Given a voices folder containing "serious.wav" and "serious.txt"
    And the transcript of "serious" is removed
    When the user publishes the voice "serious" from that folder
    Then the video command fails
    And the error output has an "Error:" line and a "Fix:" line
