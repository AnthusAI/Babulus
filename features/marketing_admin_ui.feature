Feature: Admin UI for marketing automation

  # In-app UI for viewing and managing waitlist signups and marketing data,
  # so operators don’t rely only on the CLI or AWS console. See
  # docs/marketing-automation.md.

  Scenario: Authenticated admin can view signups list
    Given an authenticated user with permission to view marketing data
    When the user visits the marketing or signups admin page (e.g. /dashboard/signups or /dashboard/marketing)
    Then the page displays a list of recent WaitlistSignup (or MarketingLead) records
    And each row shows email, name, persona, wantsUpdates, source, createdAt
    And the list is ordered by createdAt descending (newest first)
    And the list supports pagination or "load more"

  Scenario: Admin can filter signups by source or persona
    Given the signups list is displayed
    When the user applies a filter (e.g. source "marketing-site", persona "developer")
    Then the list shows only signups matching the filter
    And the filter state is reflected in the URL or UI (so it can be shared or refreshed)

  Scenario: Admin can export signups as CSV
    Given the signups list is displayed (optionally filtered)
    When the user clicks export or "Download CSV"
    Then the browser downloads a CSV file with columns email, name, persona, wantsUpdates, source, createdAt
    And the CSV contains the same records as the current list view (respecting filters and pagination)

  Scenario: Admin can see enrollment and program context for a lead
    Given an authenticated user viewing the marketing admin
    When the user selects a lead or signup (e.g. by email or row click)
    Then the UI shows the corresponding MarketingLead and any MarketingEnrollment records
    And for each enrollment, the current step (currentStepKey) and program name are shown
    And recent MarketingEnrollmentEvent entries are visible (enrolled, entered_step, etc.)

  Scenario: Marketing admin is only available to authorized users
    Given an unauthenticated user
    When the user navigates to the marketing admin URL
    Then the user is redirected to sign-in or sees an access-denied message
    And given an authenticated user without marketing/admin permission
    When the user navigates to the marketing admin URL
    Then the user sees an access-denied message or empty/restricted view

  Scenario: Admin can see interaction history for a lead
    Given a lead has one or more MarketingInteraction records (e.g. outbound emails)
    When the admin views that lead’s detail
    Then the UI shows a timeline or list of interactions (channel, direction, subject, occurredAt)
    And each interaction can expand to show body or metadata if present
