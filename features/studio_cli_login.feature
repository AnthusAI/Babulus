Feature: Signing the babulus command in to the Studio
  The `babulus` command signs in through the Studio's own Google-only Cognito web app client and keeps the session in
  the machine's secure store. The Studio publishes the public values the command needs at /.well-known/babulus-cli.json,
  only when the web app client really registers the command's return URL. A person on a machine with no browser signs in
  with `babulus login --remote`: a per-deployment broker (a small function and a table) and approval pages run from the
  same pinned cli-login release as the command. Remote sign-in does not exist at all until the deployment turns it on, and
  no value that identifies a deployment lives in this repository.

  Scenario: The Studio publishes the command's public sign-in values
    Given a deployed backend whose web app client registers the command's loopback return URL
    When the command asks for /.well-known/babulus-cli.json
    Then the answer names the Studio as the publication
    And the answer names the Cognito issuer, client, hosted-UI domain and the jobs API
    And the answer holds no secret and no remote sign-in values

  Scenario: Nothing is published when the web app client does not register the return URL
    Given a deployed backend whose web app client does not register the command's loopback return URL
    When the command asks for /.well-known/babulus-cli.json
    Then the answer is a 404 that says the Studio does not register the command's sign-in callback

  Scenario: Nothing is published before the backend has published the jobs API
    Given a deployed backend that published no jobs API endpoint
    When the command asks for /.well-known/babulus-cli.json
    Then the answer is a 404 that says the Studio does not register the command's sign-in callback

  Scenario: Remote sign-in values are published only when the broker and the client agree
    Given a deployed backend with a remote sign-in broker and a web app client that registers its callback
    When the command asks for /.well-known/babulus-cli.json
    Then the answer names the broker and the Studio's own /cli/callback page

  Scenario: A broker whose callback is not the Studio's own page is not published
    Given a deployed backend with a remote sign-in broker whose callback is on another host
    When the command asks for /.well-known/babulus-cli.json
    Then the answer holds no remote sign-in values

  Scenario: The approval pages are forwarded to the pages function with their cookies
    Given a deployed backend with a remote sign-in pages function
    When a browser opens the approval page with a sign-in code in the query
    Then the pages function is invoked once with the same method, path and query
    And the browser receives the pages function's status, headers and body

  Scenario: The approval pages answer 404 when remote sign-in is off
    Given a deployed backend without a remote sign-in pages function
    When a browser opens the approval page with a sign-in code in the query
    Then the answer is a 404 that says the Studio has not switched on remote CLI login
    And no function is invoked

  Scenario: An unreachable pages function never leaks its error
    Given a deployed backend with a remote sign-in pages function that fails
    When a browser opens the approval page with a sign-in code in the query
    Then the answer is a 503 with a plain message to try the approval link again

  Scenario: An oversized approval form is refused before it is forwarded
    Given a deployed backend with a remote sign-in pages function
    When a browser posts an approval form larger than 64 KiB
    Then the answer is a 413 and no function is invoked

  Scenario: Remote sign-in does not exist until the deployment turns it on
    When the backend plan is made with remote sign-in switched off
    Then there is no remote sign-in plan

  Scenario: Remote sign-in needs a plain https Studio origin and the compute role
    When the backend plan is made with remote sign-in on but the Studio origin is "http://studio.example.test"
    Then planning fails and says the origin must be a plain https origin
    When the backend plan is made with remote sign-in on but no compute role
    Then planning fails and says the compute role is needed

  Scenario: The broker stack keeps cli-login's security properties
    Given a synthesized remote sign-in stack
    Then the broker's function URL takes no credentials
    And the public permissions cover only calls through that URL
    And the broker may be invoked directly only by the pages function's role
    And the pages function may be invoked only by the Studio's compute role
    And the broker may touch only its own table and has reserved concurrency
    And the broker serves only the jobs API as its target
    And two alarms watch the start ceiling and throttling

  Scenario: Alarms warn at synthesis when no alarm topic is configured
    Given a synthesized remote sign-in stack with no alarm topic
    Then synthesis warns that the broker alarms notify nobody

  Scenario: The broker, the pages and the command run one pinned cli-login release
    Then the stack's cli-login version equals the version the command pins
    And installing the broker bundle installs exactly that release without dependencies

  Scenario: The jobs API endpoint must be a plain https URL
    When the jobs API endpoint is "http://api.example.test"
    Then planning the jobs API fails and says it must be a plain https URL
