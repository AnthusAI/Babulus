# Test Coverage Monitoring

## Goals

- Track coverage for core runtime code in `src/` and `packages/`.
- Use coverage gaps to prioritize test work, especially for spend-critical paths (pricing, telemetry, rendering).

## How to run

- `npm run bdd` (coverage included)
- `npm test` (coverage included)
- `npm run coverage` (alias)
- `npm run bdd:watch` (coverage after each run)

Outputs:

- `coverage/lcov.info`
- `coverage/coverage-summary.json`

## Prioritization workflow

- After each feature batch, run coverage and list files at 0–30% coverage.
- Add BDD scenarios for the lowest‑coverage files that affect correctness or costs first.
- Record periodic baselines by copying `coverage/coverage-summary.json` into `docs/baselines/coverage-YYYYMMDD.json`.
