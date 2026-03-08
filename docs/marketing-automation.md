# Marketing Automation Backend

This document describes the marketing automation backend built for the Babulus Studio Web app: data model, waitlist flow, runtime components, and how to operate it.

## Overview

The system supports:

- **Waitlist signups** from the public site, stored in Amplify/AppSync (DynamoDB).
- **Lead and program model**: each signup becomes a **MarketingLead** and is **enrolled** in a default **MarketingProgram** with steps, rules, and triggers.
- **Event history**: enrollment and step-entry events are recorded for each signup.
- **Python runtime** (optional): rule evaluation and email handlers for future automation (e.g. welcome emails, drip campaigns). Not yet wired to run automatically on new signups.

All persistent data lives in **AWS Amplify** (AppSync GraphQL API and DynamoDB). The waitlist API and CLI run in the Studio Web app context.

---

## Data Model

Defined in `apps/studio-web/amplify/data/resource.ts`.

### Core entities

| Model | Purpose |
|-------|--------|
| **WaitlistSignup** | One record per form submission: email, name, persona, wantsUpdates, source, createdAt. |
| **MarketingLead** | Canonical lead identity: same fields plus lastSignupAt. ID is `lead_<sha256(lowercase email)>`. |
| **MarketingProgram** | A campaign/program (e.g. "Waitlist Onboarding"). Has key, name, status (draft \| active \| paused \| archived). |
| **MarketingProgramStep** | Steps in a program (e.g. "Updates Opt-In", "Updates Opt-Out"). Ordered by `order`. |
| **MarketingEnrollment** | Links a lead to a program: leadId, programId, status, currentStepKey, enrolledAt, lastStepAt, source. |
| **MarketingEnrollmentEvent** | Event log for an enrollment: eventType (enrolled, entered_step, exited_step, completed, paused, canceled, triggered), fromStepKey, toStepKey, occurredAt, metadata (JSON). |
| **MarketingProgramRule** | Rule that moves an enrollment to a step when triggers match. Has fromStepKey, toStepKey, order, isActive, name. |
| **MarketingProgramTrigger** | Trigger for a rule: type = event \| time \| attribute; eventType; delaySeconds; or attributeKey/operator/attributeValue. |
| **MarketingInteraction** | Record of an outbound/inbound touch (email, SMS, etc.): leadId, channel, direction, subject, body, messageId, occurredAt, metadata. |

### Default program (waitlist)

The waitlist flow uses a single default program:

- **Program key**: `waitlist`
- **Program ID**: `program_waitlist`
- **Steps**: `updates_opt_in` (order 1), `updates_opt_out` (order 2)
- **Rules** (see Waitlist flow below): one rule for “opted-in” (event + attribute wantsUpdates=true), one for “opted-out” (event + wantsUpdates≠true). Rules can also have time-based triggers (e.g. delay 7 days).

### Authorization

- **WaitlistSignup**, **MarketingLead**, **MarketingProgram** (and some related models): public API key can **create** and **read** so the waitlist form and list-waitlist CLI work without a logged-in user.
- **MarketingEnrollment**, **MarketingEnrollmentEvent**, **MarketingInteraction**: public API key can **create** only; **read** requires authenticated (Cognito).
- Authenticated users have full access to all marketing models.

---

## Waitlist Flow

### API: `POST /api/waitlist`

Implemented in `apps/studio-web/app/api/waitlist/route.ts`.

1. **Validate** email (and optional honeypot `website`); normalize email and compute `leadId = lead_<sha256(email)>`, `programId = program_waitlist`, `enrollmentId = enrollment_<programId>_<leadId>`.
2. **Create or ignore** (idempotent):
   - **WaitlistSignup** (email, name, persona, wantsUpdates, source, createdAt)
   - **MarketingLead** (same identity; create only if missing)
   - **MarketingProgram** and its **MarketingProgramStep** / **MarketingProgramRule** / **MarketingProgramTrigger** records (create only if missing)
3. **Match rule**: For event type `waitlist_signup`, find the first rule whose triggers match the lead (event type + attribute e.g. `wantsUpdates == "true"` or `!= "true"`). Default is the first rule (opted-in).
4. **Create**:
   - **MarketingEnrollment** (leadId, programId, status=active, currentStepKey=matched rule’s toStepKey, enrolledAt, lastStepAt, source)
   - **MarketingEnrollmentEvent** (enrolled)
   - **MarketingEnrollmentEvent** (entered_step, toStepKey same as currentStepKey)

Duplicate/conditional-check errors (e.g. “already exists”) are treated as success so resubmissions don’t fail.

### Default rules

- **opt_in_rule**: event `waitlist_signup` + attribute `wantsUpdates eq "true"` (and optional time trigger 7 days). → step `updates_opt_in`.
- **opt_out_rule**: event `waitlist_signup` + attribute `wantsUpdates neq "true"`. → step `updates_opt_out`.

Rule matching is implemented in the waitlist route (TypeScript); the same logic exists in the Python runtime for future server-side evaluation.

---

## Monitoring and CLI

### List signups (CLI)

From the repo:

```bash
cd apps/studio-web
# Requires amplify_outputs.json (see AGENTS.md "Getting amplify_outputs.json")
npm run list-waitlist
npm run list-waitlist -- --limit 50
npm run list-waitlist -- --csv > signups.csv
```

Script: `apps/studio-web/scripts/list-waitlist.ts`. Uses API key auth; no login required.

### AWS

- **AppSync**: Run GraphQL queries (e.g. `listWaitlistSignups`, `listMarketingLeads`) in the AWS AppSync console for your app.
- **DynamoDB**: Inspect the tables created by Amplify for the models above.

See also **AGENTS.md** → “Waitlist signups (monitoring)” for a short reference.

---

## Python Marketing Runtime

Location: `services/marketing-runtime/`.

Intended for Lambda or GraphQL-triggered automation (e.g. welcome emails, rule-based moves). **Not yet invoked automatically** when a new signup or enrollment is created.

### Environment

- `MARKETING_GQL_ENDPOINT`: GraphQL API endpoint.
- `MARKETING_GQL_API_KEY`: API key (server-side only).
- `SES_REGION`: AWS region for SES (default us-east-1).

### Handlers

- **evaluate_rules**: Evaluate program rules (event + attribute conditions); can be used to decide which step a lead enters or to trigger actions.
- **outbound_email**: Send email (e.g. via SES).
- **inbound_email**: Process inbound email (e.g. replies, bounces).

### Rule evaluation (`rules.py`)

- **Trigger types**: `event`, `time`, `attribute`.
- **Attribute operators**: eq, neq, contains, exists, not_exists.
- **rule_matches_event(triggers, event_type, lead)**: Returns true if an event trigger matches `event_type` and all attribute triggers match the lead dict.
- **has_time_trigger(triggers)**: Indicates whether a rule has a time-based delay (for future scheduling).

To run automation on new signups you would need to wire this runtime to a trigger (e.g. DynamoDB stream on WaitlistSignup or MarketingEnrollment, or a scheduled job that processes recent enrollments and calls the handlers).

---

## File Reference

| Area | Path |
|------|------|
| Schema | `apps/studio-web/amplify/data/resource.ts` |
| Waitlist API | `apps/studio-web/app/api/waitlist/route.ts` |
| List signups CLI | `apps/studio-web/scripts/list-waitlist.ts` |
| Python runtime | `services/marketing-runtime/` (README, `rules.py`, handlers in `handlers/`) |
| Build / deploy | `amplify.yml` (backend runs from repo root; frontend appRoot: `apps/studio-web`) |

---

## Summary

- **Storage**: Amplify (AppSync + DynamoDB). Waitlist signups create WaitlistSignup, MarketingLead, default MarketingProgram (and steps/rules/triggers), MarketingEnrollment, and two MarketingEnrollmentEvent records.
- **Monitoring**: Use `npm run list-waitlist` in `apps/studio-web` or query AppSync/DynamoDB.
- **Automation**: Data and rule model are in place; the Python runtime exists for rules and email but is not yet triggered by new signups. Wiring it (e.g. stream or cron) would enable automated campaigns.

## BDD / roadmap

- **Event-driven marketing runtime**: [features/marketing_automation.feature](../features/marketing_automation.feature) — DynamoDB stream on WaitlistSignup and/or MarketingEnrollment → Lambda → Python runtime (evaluate_rules, outbound_email), idempotency, and secrets/GraphQL access.
- **Admin UI for marketing**: [features/marketing_admin_ui.feature](../features/marketing_admin_ui.feature) — Authenticated list/filter/export of signups, enrollment and interaction detail, and access control.
