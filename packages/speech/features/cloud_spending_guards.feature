Feature: Cloud compute starts only after every spending guard passes

  A job that no local worker takes can fall back to AWS Batch, which costs
  real money. The fallback timer asks the gate, and the gate lets Batch start
  only when all of these hold, checked in this order:

  1. the job's Account has cloud rendering turned on;
  2. Prospectus reserves quota for the most the job could use, as billable
     items rather than money;
  3. our own global spending ceiling has room: per attempt, per day and per
     month, with one concurrent cloud job at a time;
  4. the kill switch is off.

  If any guard says no, cannot be reached, answers something unexpected, or has
  no configuration, no compute starts. Whatever the gate had already taken is
  given back, and the job waits for a local worker with a reason anyone looking
  at it can read. The reasons say nothing about money, and neither do job
  records, Prospectus requests or API responses.

  Every paid service in these specs is a stand-in: Prospectus is a recorder,
  Batch is a recorder, DynamoDB is local, and any attempt to open a network
  connection fails the scenario.

  Background:
    Given a router with a fake clock and a fallback gate

  Scenario: With every guard passing, one Batch job runs and the reservation covers its maximum
    Given a pending job with a fallback timer
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    Then exactly 1 Batch job is submitted
    And Prospectus received 1 reservation request
    And the reservation was for the job's maximum 3600 vCPU seconds
    And the reservation request was signed for execute-api
    And the ceiling slot is held by the cloud job
    And the day's ceiling count is for one attempt
    And the job has been tried by the cloud 1 time

  Scenario: The reservation is settled from what actually ran
    Given a pending job with a fallback timer
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    And the Batch job ends after 600 seconds of running
    Then the reservation was settled for 1200 vCPU seconds
    And the job record shows its reservation as settled
    And the ceiling slot is free
    And nothing the customer can read mentions money

  Scenario: A job that never started gives its reservation back
    Given a pending job with a fallback timer
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    And the Batch job ends without ever starting
    Then the reservation was released
    And the job record shows its reservation as released
    And the ceiling slot is free
    And the day's ceiling count is back to zero

  Scenario: A refused Batch submission gives everything back
    Given a pending job with a fallback timer
    And AWS Batch refuses the submission
    When the fallback timer runs
    Then the timer ends with "BatchFallbackFailed"
    And the reservation was released
    And the ceiling slot is free
    And the day's ceiling count is back to zero

  Scenario: Settling when Prospectus cannot be reached leaves the reservation open to be retried
    Given a pending job with a fallback timer
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    And the Batch job ends but Prospectus cannot be reached
    Then finishing failed and the reservation is still open

  Scenario Outline: No quota or no answer from Prospectus means no compute
    Given a pending job with a fallback timer
    And Prospectus answers the way it does when <situation>
    When the fallback timer runs
    Then no Batch job is submitted
    And the timer ends with "FallbackNotNeeded"
    And the job is waiting for a local worker because "<reason>"
    And the job record holds no reservation
    And the ceiling holds nothing for the job

    Examples:
      | situation                                | reason              |
      | the account's quota is empty             | quota_exhausted     |
      | it cannot be reached                     | quota_unavailable   |
      | its service is down                      | quota_unavailable   |
      | it sends back something unreadable       | quota_unavailable   |
      | it sends back an answer nobody expects   | quota_unavailable   |

  Scenario: An uncertain outcome is repeated with the same operation ID and the same body
    Given a pending job with a fallback timer
    And Prospectus answers the way it does when its service is down
    When the fallback timer runs
    Then no Batch job is submitted
    And Prospectus received 3 reservation requests
    And every reservation request was repeated with the same operation ID

  Scenario Outline: A spending ceiling with no room means no compute and the reservation goes back
    Given a pending job with a fallback timer
    And <condition>
    When the fallback timer runs
    Then no Batch job is submitted
    And the job is waiting for a local worker because "ceiling_reached"
    And the reservation was released
    And the job record holds no reservation

    Examples:
      | condition                                                |
      | the per-attempt ceiling is smaller than one attempt      |
      | the day's ceiling is already used up                     |
      | the month's ceiling is already used up                   |
      | another cloud job already holds the one concurrent slot  |

  Scenario Outline: The kill switch means no compute and everything goes back
    Given a pending job with a fallback timer
    And <switch>
    When the fallback timer runs
    Then no Batch job is submitted
    And the job is waiting for a local worker because "kill_switch"
    And the reservation was released
    And the ceiling holds nothing for the job

    Examples:
      | switch                         |
      | the kill switch is on          |
      | the kill switch cannot be read |

  Scenario: An account with cloud rendering off never reaches Prospectus
    Given a pending job with a fallback timer
    And the account has cloud rendering turned off
    When the fallback timer runs
    Then no Batch job is submitted
    And Prospectus received no requests
    And the job is waiting for a local worker because "cloud_off"

  Scenario Outline: A guard with no configuration fails closed
    Given a pending job with a fallback timer
    And the deployment has no <setting>
    When the fallback timer runs
    Then no Batch job is submitted
    And Prospectus received no requests
    And the job is waiting for a local worker because "guards_not_configured"

    Examples:
      | setting                 |
      | Prospectus endpoint     |
      | Prospectus caller role  |
      | per-attempt ceiling     |
      | daily ceiling           |
      | monthly ceiling         |
      | ceiling estimate rate   |
      | budget guard            |

  Scenario: A duplicate timer firing reserves once and starts one Batch job
    Given a pending job with a fallback timer
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    And a second timer for the same attempt fires 100 seconds later
    Then exactly 1 Batch job is submitted
    And Prospectus received 1 reservation request

  Scenario: A second timer arriving while the first is between reserving and claiming takes nothing and doesn't release the first one's hold
    Two timers for the same attempt derive the same reservation and ceiling
    lease. The first gate has reserved but not yet claimed the job when the
    second arrives, and the second would be refused by the kill switch. It
    must not touch the shared reservation, or the first gate would submit
    Batch work against a hold that no longer exists.

    Given a pending job with a fallback timer
    And a second timer will arrive while the first is between reserving and claiming
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    Then the second timer was told to wait and took nothing
    And Prospectus received 1 reservation request
    And the reservation is still held
    And exactly 1 Batch job is submitted
    And the gate lock is clear

  Scenario: A gate that crashed holding the lock doesn't block the next gate once it expires
    The lock outlives the gate's own time limit, so a crashed gate holds the
    job up only briefly. Its hold at Prospectus is not touched; the next
    gate reuses the same IDs.

    Given a pending job with a fallback timer
    And a gate crashed holding the lock, which expires in 60 seconds
    And a Batch job that renews its claim every 120 seconds for 600 seconds and then finishes
    When the fallback timer runs
    Then exactly 1 Batch job is submitted
    And Prospectus received 1 reservation request
    And the gate lock is clear

  Scenario: A job that keeps coming back stops after its allowed cloud attempts
    The operator can requeue a job as often as they like, but each cloud
    attempt is counted on the job and the count survives a requeue.

    Given a pending job with a fallback timer
    And the cloud has already tried the job 3 times
    When the fallback timer runs
    Then no Batch job is submitted
    And Prospectus received no requests
    And the job is waiting for a local worker because "attempt_limit"
    And the job has been tried by the cloud 3 times

  Scenario: A local worker that runs longer than the claim window keeps the job
    Given a pending job with a fallback timer
    And local worker "local:a" claims the job
    And the worker renews its claim every 300 seconds for 3000 seconds and then finishes the job
    When the fallback timer runs
    Then no Batch job is submitted
    And Prospectus received no requests
    And the timer ends with "FallbackNotNeeded"
    And the job is "done" and was produced by "local:a"

  Scenario: A video job waits for a local worker because no video image exists
    Given a pending job with a fallback timer
    And a pending video job with a fallback timer
    When the fallback timer runs
    Then no Batch job is submitted
    And Prospectus received no requests
    And the timer ends with "FallbackNotNeeded"

  Scenario: Creating a speech job without a site key starts nothing
    When an unauthenticated caller creates a speech job
    Then the request is refused with "site_key_required"
    And no timer was armed by the request
    And no Batch job is submitted
    And Prospectus received no requests

  Scenario: A request body that is not a JSON object is refused and starts nothing
    When a caller creates a speech job with a body that is not JSON
    Then the request is refused as a bad request with "invalid_json_body"
    And no timer was armed by the request
    And no Batch job is submitted
    And Prospectus received no requests

  Scenario: A base64 encoded JSON body is read like any other
    When an unauthenticated caller creates a speech job with a base64 encoded body
    Then the request is refused with "site_key_required"

  Scenario: Creating a speech job with an unknown site key starts nothing
    When a caller with an unknown site key creates a speech job
    Then the request is refused with "invalid_site_key"
    And no timer was armed by the request
    And Prospectus received no requests

  Scenario: Creating a video job without an operator token starts nothing
    When an unauthenticated caller creates a video job
    Then the request is refused
    And no timer was armed by the request
    And Prospectus received no requests

  Scenario: A budget breach disables every cloud queue and the gate then starts nothing
    Given a pending job with a fallback timer
    When the budget alert fires
    And the fallback timer runs
    Then the Batch queues are both disabled
    And no Batch job is submitted
    And the job is waiting for a local worker because "kill_switch"
    And the reservation was released

  Scenario: Hard limits are in the deployed backend
    Given the backend is synthesized with every guard configured
    Then every Batch job definition has an attempt timeout of at most 7200 seconds
    And every Batch job definition retries at most 3 times
    And there is one CPU and one GPU compute environment, both scaling to zero
    And nothing submits to the CPU queue
    And a timeout outside the allowed range is refused at synthesis

  Scenario: The budget is scoped by tag and alerts the configured address
    Given the backend is synthesized with every guard configured
    Then the budget covers only resources with the spend tag
    And the budget alerts the configured address and the queue-disabling topic
    And the budget action disables every cloud queue
    And the Prospectus caller role can only post to the quota routes

  Scenario: Without guard settings the deployment configures nothing to spend with
    Given the backend is synthesized with no guard settings
    Then there is no budget and the gate is not told the budget guard exists
