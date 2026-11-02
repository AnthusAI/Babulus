Feature: One local worker runs speech and video jobs

  `babulus worker` claims speech jobs and video jobs from the same queue. A
  video job runs the TypeScript toolchain as a subprocess and streams its
  progress. A machine without Node, the toolchain's packages, Chromium or
  ffmpeg says exactly which is missing and how to fix it, and leaves video
  jobs waiting rather than failing them. Whatever the worker claims, it writes
  only under the fencing token of its claim.

  Scenario: One poll cycle handles a speech job and a video job
    Given the queue holds a speech job and a video job
    And the machine is set up for video
    And the renderer writes a video
    When the worker runs one cycle
    Then both jobs are claimed
    And the speech job is marked done with its claim token
    And the video was uploaded and its job marked done with its claim token
    And the renderer was started with the job's script, timeline and audio

  Scenario: Progress is streamed while the renderer runs
    Given the queue holds a video job
    And the machine is set up for video
    And the renderer logs two lines and writes frames slowly before it finishes
    When the worker runs one cycle with JSON output
    Then every output line is a JSON object
    And the output includes a progress event with a frame count
    And the output includes the renderer's log lines

  Scenario: A renderer failure fails the job with the renderer's reason
    Given the queue holds a video job
    And the machine is set up for video
    And the renderer exits with an error
    When the worker runs one cycle
    Then the video job is marked failed with a reason mentioning "exited with status 3"
    And nothing is uploaded

  Scenario: A machine without Node leaves video jobs waiting
    Given the queue holds a speech job and a video job
    And the machine has no Node.js
    When the worker runs one cycle
    Then only the speech job is claimed
    And the output says Node.js is missing and ends with a Fix line

  Scenario: Asking for video on a machine without Node is an error
    Given the machine has no Node.js
    When the worker is required to take video jobs
    Then the worker exits with status 1 and a Fix line

  Scenario: A worker that loses its claim during a render writes nothing
    Given the queue holds a video job
    And the machine is set up for video
    And the renderer takes a while
    And the API refuses the claim renewal during the render
    When the worker runs one cycle
    Then nothing is uploaded
    And the video job is not marked done or failed

  Scenario Outline: Each missing piece of the toolchain is named with its fix
    Given a machine where <missing>
    When the toolchain is checked
    Then the check fails saying "<message>" with a fix mentioning "<fix>"

    Examples:
      | missing                       | message                    | fix                        |
      | Node.js is not installed      | Node.js is not installed   | Install Node.js            |
      | Node.js is version 18         | too old                    | Install Node.js            |
      | the packages are not installed | packages are not installed | npm install                |
      | Chromium is not installed     | Chromium is not installed  | playwright install chromium |
      | ffmpeg is not installed       | ffmpeg is not installed    | Install ffmpeg             |

  Scenario: A complete setup passes the check
    Given a machine where everything is installed
    When the toolchain is checked
    Then the check passes

  @integration
  Scenario: A real short render runs through the toolchain subprocess
    Given the Babulus toolchain is installed on this machine
    When the worker renders the "animation-text" example up to frame 5
    Then a playable MP4 file is produced
    And progress was reported while it rendered
