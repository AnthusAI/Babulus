Feature: Local worker keeps and respects its claim

  A local worker presents the fencing token from its claim on every call for
  the job and renews the claim while it works. If the API says the claim is
  gone, the worker stops caring about the job and writes nothing for it:
  no upload, no result and no failure.

  Scenario: The worker uses its claim token for every call
    Given a claimable job that a local worker will claim with claim token "claim-token-1"
    And the worker's TTS backend generates audio successfully
    When the worker runs a single poll cycle
    Then the job is marked done
    And every call for the job carried claim token "claim-token-1"

  Scenario: The worker renews its claim while a long job runs
    Given a claimable job that a local worker will claim with claim token "claim-token-1"
    And the worker's TTS backend takes a while to generate audio
    When the worker runs a single poll cycle
    Then the claim was renewed at least once with claim token "claim-token-1"
    And the job is marked done

  Scenario: A worker whose claim was taken away writes nothing
    Given a claimable job that a local worker will claim with claim token "claim-token-1"
    And the worker's TTS backend takes a while to generate audio
    And the API refuses the claim renewal because the claim was lost
    When the worker runs a single poll cycle
    Then the worker uploaded nothing and recorded no result
    And the worker does not crash

  Scenario: A dropped connection does not stop the heartbeat
    Given a claimable job that a local worker will claim with claim token "claim-token-1"
    And the worker's TTS backend takes a while to generate audio
    And the first claim renewal fails with a dropped connection
    When the worker runs a single poll cycle
    Then the claim was renewed at least 2 times with claim token "claim-token-1"
    And the job is marked done
