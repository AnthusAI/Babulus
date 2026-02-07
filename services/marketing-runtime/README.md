# Marketing Runtime

Python runtime for marketing automation. This package is designed to run as
Lambda handlers or be invoked via GraphQL actions.

## Environment

- `MARKETING_GQL_ENDPOINT`: GraphQL API endpoint.
- `MARKETING_GQL_API_KEY`: GraphQL API key (server-side only).
- `SES_REGION`: AWS region for SES (default: us-east-1).

## Handlers

- `marketing_runtime.handlers.outbound_email.handler`
- `marketing_runtime.handlers.inbound_email.handler`
- `marketing_runtime.handlers.evaluate_rules.handler`
