Feature: Marketing automation (event-driven runtime)

  # Event-driven flow: new signups or enrollments trigger the Python marketing
  # runtime via DynamoDB stream → Lambda, so actions (e.g. welcome email, rule
  # evaluation) run without polling. See docs/marketing-automation.md and
  # services/marketing-runtime/.

  Scenario: New WaitlistSignup triggers marketing Lambda
    Given the Amplify backend has DynamoDB streams enabled for WaitlistSignup
    And a Lambda is configured with the WaitlistSignup table stream as event source
    And the Lambda invokes the Python marketing runtime (e.g. evaluate_rules or a dedicated signup handler)
    When a new WaitlistSignup record is created (e.g. via POST /api/waitlist)
    Then the Lambda receives a stream event with the new record
    And the marketing runtime is invoked with the signup payload (lead identity, source, wantsUpdates, persona)
    And the runtime can evaluate program rules and perform actions (e.g. send welcome email, record MarketingInteraction)

  Scenario: New MarketingEnrollment triggers marketing Lambda
    Given the Amplify backend has DynamoDB streams enabled for MarketingEnrollment
    And a Lambda is configured with the MarketingEnrollment table stream as event source
    And the Lambda invokes the Python marketing runtime
    When a new MarketingEnrollment record is created (e.g. after waitlist signup)
    Then the Lambda receives a stream event with the new enrollment
    And the marketing runtime is invoked with enrollment and lead context
    And the runtime can evaluate rules (event + attribute triggers) and trigger outbound actions (email, etc.)

  Scenario: Rule evaluation runs in Lambda on signup event
    Given the marketing runtime Lambda is invoked with a waitlist_signup event
    And the lead has wantsUpdates "true" and persona "developer"
    When the runtime evaluates program rules for event type "waitlist_signup"
    Then the matching rule (e.g. opt_in_rule) is selected
    And the enrollment currentStepKey is already set by the waitlist API
    And the runtime can perform step-entry actions (e.g. send welcome email via outbound_email handler)

  Scenario: Outbound email handler is invoked from Lambda
    Given the marketing runtime is running in Lambda with SES configured (MARKETING_GQL_*, SES_REGION)
    And a rule action requires sending a welcome email to the lead
    When the Lambda invokes the outbound_email handler with lead email and template context
    Then the handler sends the email via SES
    And a MarketingInteraction record is created (channel email, direction outbound, occurredAt)

  Scenario: Stream processing is idempotent or deduplicated
    Given the WaitlistSignup stream can deliver the same insert more than once (at-least-once)
    When the Lambda processes a stream record
    Then the runtime uses idempotency (e.g. event id or lead+event key) so duplicate deliveries do not send duplicate emails or create duplicate interactions

  Scenario: Lambda has access to GraphQL and secrets
    Given the marketing Lambda is deployed (e.g. in Amplify backend or separate stack)
    When the Lambda runs
    Then it has MARKETING_GQL_ENDPOINT and MARKETING_GQL_API_KEY (or equivalent) to call AppSync
    And it has SES credentials or IAM role to send email
    And it can read the Python runtime code (e.g. bundled layer or container image)
