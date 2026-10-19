# Waitlist signups

Babulus does not store waitlist signups itself. The public waitlist form (`apps/studio-web/components/marketing/waitlist-form.tsx`) posts directly from the visitor's browser to **Prospectus**, Anthus's CRM, which binds the form by the browser's `Origin` (`https://babul.us`, `https://www.babul.us`, `https://babulus.anth.us`). A server-side proxy therefore cannot be used.

- Endpoint: `POST {NEXT_PUBLIC_PROSPECTUS_INTAKE_BASE_URL}/intake/waitlist/babulus-waitlist-v1`
- Notice version sent: `babulus-waitlist-v1`
- Contract: Prospectus `docs/ARCHITECTURE.md`, "Integrating an app's waitlist" (AnthusAI/Prospectus#48).
- The form generates one `submission_id` per attempt and reuses it when retrying after a network error or 503.

## Environment variable

`NEXT_PUBLIC_PROSPECTUS_INTAKE_BASE_URL` is the intake API base URL (the Prospectus `IntakeWaitlistBaseUrl` deployment output, without a trailing path). It is inlined at build time. When it is unset, the form renders but shows "The waitlist opens soon" and submits nothing.

## Status

Disabled until Ryan approves the `babulus-waitlist-v1` privacy notice and Prospectus enables the form. Then set the env var in the Amplify app and redeploy.

## Seeing signups

In the Prospectus CRM, signups are prospects labelled `waitlist` and `app-babulus`.
