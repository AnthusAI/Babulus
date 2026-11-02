Feature: The Batch worker holds its claim or stops at once

  A Batch worker renews its claim while it works. If the API says the claim
  is gone, the run is worthless and the process ends immediately so the GPU
  stops. A dropped connection or a server error is not a lost claim and
  never ends the run. A worker that cannot take its claim fails the job
  under its token instead of exiting quietly, unless another worker holds it.

  Scenario Outline: A renewal refusal ends the process
    Given the API answers claim renewals with <answers>
    When the Batch worker keeps its claim for a few beats
    Then the process was ended with a non-zero code
    And the claim was reported lost

    Examples:
      | answers          |
      | 409              |
      | 403              |
      | 401              |
      | a dropped connection then 403 |

  Scenario Outline: Trouble that is not a lost claim never ends the run
    Given the API answers claim renewals with <answers>
    When the Batch worker keeps its claim for a few beats
    Then the process was not ended
    And renewals kept being attempted

    Examples:
      | answers                          |
      | a dropped connection             |
      | a timeout                        |
      | 500                              |
      | a dropped connection then 200    |

  Scenario: Taking the claim reports why it was refused
    Given the API refuses the claim with 503
    When the Batch worker takes its claim
    Then it is not held and the refusal status is 503

  Scenario: Another worker holding the job is a quiet exit
    Given the API refuses the claim with 409
    When the reserved Batch worker starts
    Then the reserved Batch worker exits with status 0
    And the reserved Batch worker reports no failure

  Scenario: A server error on the claim fails the job under the reserved token
    Given the API refuses the claim with 503
    When the reserved Batch worker starts
    Then the reserved Batch worker exits with status 1
    And the reserved Batch worker reports a failure with claim token "reserved-token"
