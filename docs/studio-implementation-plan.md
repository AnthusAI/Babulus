# Babulus Studio — Step-by-Step Implementation Plan (Draft)

**Status:** Phase 6-10 milestones completed (2026-01-24) - Alpha Status (Pending Review)
**Companion doc:** `docs/saas-electron-plan.md`

This document turns the vision into an execution plan with concrete milestones, deliverables, and “definition of done” checks.

---

## Current Status (2026-01-24) - Alpha

### Major Milestone: Feature Complete (Alpha)

The studio web app is now fully integrated with the AWS Amplify Gen2 control plane, featuring a complete video generation and rendering pipeline, cost tracking, and publishing capabilities. While functionally complete according to the initial plan, the system is in **Alpha** status as it has not yet undergone extensive human review or production load testing.

**Completed**
- **Phase 6.1 Auth + tenancy model:** Cognito authentication fully integrated with server-side validation.
- **Phase 6.2 Project/video/version APIs:**
  - Real GraphQL client (`lib/control-plane-graphql.ts`) connecting to AppSync.
  - Server Actions (`app/actions.ts`) bridging UI to backend securely.
  - New Studio Dashboard with Org -> Project -> Video navigation hierarchy.
  - "Create Organization", "Create Project", and "Create Video" dialogs.
  - Organization switcher with empty-state onboarding flow.
- **Phase 6.3 Client library integration:** Full type-safe GraphQL integration using `generateServerClientUsingCookies`.
- **Phase 7.1 Job system:** 
  - `generate` and `render` jobs queue correctly in the control plane.
  - Video Editor UI polls for job status and artifacts.
  - Monaco Editor integrated for editing DSL.
  - Settings dialog with layout preview and save/cancel workflow.
- **Phase 7.2 Cloud worker:** Implemented `src/worker-cloud.ts` as a reference worker that processes both generation and render jobs, uploading artifacts to S3.
- **Phase 8.1 UsageEvent instrumentation:** Costs are tracked for generation (chars/seconds) and rendering (frames).
- **Phase 8.2 Plan-controlled visibility modes:** Settings dialog allows toggling between "Transparent" ($) and "Managed" (Credits) usage visibility.
- **Phase 9.1 Default hosting:** Landing pages for published videos (`/share/[slug]`) and artifacts copied to public storage.
- **Phase 9.2 Custom domains (paid):** Org settings for custom domains.
- **Phase 10.1 Analytics dashboard:** Usage and cost visualization in Studio.
- **Phase 10.2 Launch prep:** Verification of multi-tenancy, security, and reliability.

**Next up**
- Launch!

**Deferred / External Dependency**
- Chat UI Integration: The chat interface will be sourced from `../Tactus-HITL-components` (Tactus agent). Do not build a custom redundant chat UI in Studio. The current Chat Pane is a placeholder.

## Design Updates (Implementation-Driven)

- Renderer APIs now expose per-frame callbacks (`onFrame`) to support progress and telemetry.
- Render pipelines fail fast when no frames are generated to avoid empty encodes.
- HTML/MP4 storyboard helpers are now first-class public APIs (not just CLI scripts).
- Renderer toolchain checks now surface version availability and allow strict version expectations.
- Playwright-backed rendering supports `setViewportSize` for compatibility.
- Shared record builders now generate IDs with browser-safe fallbacks to keep client prototypes working.

## Guiding Principles (Non-Negotiables)

- **One canonical artifact:** one unified DSL per video version is the source of truth; everything else is derived.
- **Deterministic rendering:** given `{dsl, assets, toolchain versions}`, preview and render outputs are reproducible.
- **One authoring model:** `.babulus.ts` exports `defineVideo(async (ctx) => ResolvedVideoSpec)`; the resolver runs in a resolve job and outputs a serializable manifest.
- **Breaking changes are allowed:** no legacy compatibility or fallback paths; forward-only evolution.
- **Control plane vs execution plane:** SaaS schedules + tracks; workers/agents execute.
- **Cost transparency by design:** every expensive operation emits usage/cost telemetry into an append-only ledger.
- **No proactive Git commits:** the coding agent may suggest commits but must never commit without explicit human instruction.

---

## Verification Strategy — Tactus Baseline

We will validate every phase against the **Tactus website content** to avoid long stretches of broken output.

### Baseline (once)

- Tactus project location: `../Tactus-web/videos` (content in `content/`)
- Run a known-good generation/render for one Tactus video (e.g. `intro.babulus.ts`) and capture:
  - `script.json`
  - `timeline.json`
  - voiceover audio
  - rendered MP4 (if available)
- Store hashes + artifact paths in a small “golden” record (location to be chosen).

### Golden record format (recommended)

Store a minimal JSON record (example shape):

```json
{
  "tactusProject": "../Tactus-web/videos",
  "generatedAt": "2026-01-22T00:00:00Z",
  "sourceVideoId": "intro",
  "artifacts": [
    { "path": "src/videos/intro/intro.script.json", "sha256": "..." },
    { "path": "src/videos/intro/intro.timeline.json", "sha256": "..." },
    { "path": "public/babulus/intro.wav", "sha256": "..." },
    { "path": "renders/intro.mp4", "sha256": "...", "optional": true }
  ]
}
```

Keep it small and human-readable; the goal is “fail fast if outputs drift”.

### Loop (every phase)

- Re-run the same Tactus generation after each phase.
- Compare outputs against the baseline:
  - Exact match where expected (e.g., `script.json`/`timeline.json`).
  - Known, reviewed diffs only (e.g., if a deliberate change is made).
- If outputs diverge unexpectedly, stop and fix before proceeding.

### Verification script outline (minimal)

1) Run generation/render for the chosen Tactus video.
2) Compute SHA-256 for each artifact listed in the golden record.
3) Compare against the stored hashes.
4) If any mismatch: halt and investigate before continuing.

Implementation helper:

- `npm run baseline:verify -- --record <path> --root ../Tactus-web/videos` (or)
- `babulus baseline verify --record <path> --root ../Tactus-web/videos`
- Baseline record template: `docs/baselines/tactus-intro.json`

This keeps verification tight and preserves working content throughout the build-out.

---

## Phase 0 — Decisions + Guardrails (1–3 days)

### 0.1 Canonical DSL storage format

- Decision: **TypeScript** (`.babulus.ts`) is the canonical source artifact.
- The platform stores the **source text** as-authored and treats it as the “human” version.
- No legacy format support; we are free to make breaking changes.
- The platform also produces derived artifacts for execution and reproducibility:
  - a **resolved, serializable manifest** (JSON) used for preview/render
  - a **snapshot** of any external inputs used during resolution (when imperative mode is enabled)

**Done when**
- `docs/saas-electron-plan.md` and this doc agree that `.babulus.ts` is canonical.
- We have a minimal versioning model for both source and resolved artifacts.

### 0.2 Template-pack policy

- Define “template pack” concept: an allowlisted set of components + assets used by the renderer.
- Define how template packs are versioned and referenced from the unified DSL (`templateId`, `templateVersion`).

**Done when**
- A minimal template-pack contract exists (IDs, versions, component registry).

---

## Phase 1 — Monorepo Skeleton + Tooling (2–5 days)

### 1.1 Repo layout (create the folders)

Create:

```
apps/studio-web/        # Next.js
apps/studio-desktop/    # Electron
packages/shared/        # types + api client + utilities
packages/ui/            # shadcn + AI Elements-installed components
packages/dsl/           # unified DSL types + validators + converters
packages/renderer/      # player + render harness + frame helpers
packages/telemetry/     # usage/cost event definitions + helpers
```

**Done when**
- `pnpm` (or chosen package manager) workspace builds successfully.
- `packages/shared` exports types used by both apps.

### 1.2 CI basics

- Lint/typecheck in CI for all packages.
- Minimal smoke test that imports `packages/dsl` + parses a sample DSL.
- Coverage reporting for BDD runs (`npm run coverage`) with JSON summary + lcov.

**Done when**
- CI passes on clean checkout.
- Coverage reports are generated locally and in CI artifacts.

---

## Phase 2 — Unified DSL + Resolver (5–15 days)

### 2.1 Define the unified DSL schema (v0)

Minimum v0 fields:

- `id`
- `template { id, version }`
- `composition { fps, width, height, durationFrames? }`
- `storyboard { scenes[] { id, componentId, cues[] { id, voice?, audio[]? } } }`
- `publish { slug?, page? }` (optional)

**Done when**
- `packages/dsl` exports `BabulusVideoV0` types + JSON Schema (or Zod schema).

### 2.2 Implement `.babulus.ts` resolution (local first)

Module contract:

- `export default defineVideo(async (ctx) => ResolvedVideoSpec)`
- The resolver may be imperative, but must return a JSON-serializable spec.
- Resolution always outputs a **resolved manifest** (JSON-serializable) for preview/render.

**Done when**
- A sample `.babulus.ts` file resolves to a manifest using the `defineVideo` contract.
- Resolution errors include file/line/column and actionable messages.
- Resolution emits `UsageEvent` telemetry for any metered operations (e.g., data fetch).

### 2.3 Implement static validation (AST) (SaaS-safe subset)

- Parse `.babulus.ts` into AST.
- Enforce the module contract (`defineVideo` default export).
- Reject disallowed constructs (`import`, `require`, dynamic import, `eval`, `new Function`, Node built-ins access).
- Ensure all external access routes through `ctx` capabilities (no raw network/filesystem/process).

**Done when**
- Invalid constructs produce clear errors with file/line/column.
- The validator is fast enough to run on every edit in the web UI.

### 2.4 Run resolver in cloud (sandboxed)

Goal: allow “report-style” DSL code that can fetch data and compute the manifest, without making renders non-reproducible.

- Support `export default defineVideo(async (ctx) => ResolvedVideoSpec)`.
- Run this only in a **resolve job** (local first, then cloud), not inside the render loop.
- Require the returned `ResolvedVideoSpec` to be JSON-serializable.
- Snapshot external inputs (or store hashes) so approved renders can be reproduced.

**Done when**
- A demo DSL can fetch data via a controlled `ctx` API and produce a resolved manifest.
- The resolved manifest can be rendered deterministically without re-fetching.
- The resolve job produces the same resolved manifest given the same snapshots/toolchain versions.

---

## Phase 3 — Player Runtime (Preview) (5–10 days)

### 3.1 Frame-based runtime helpers

In `packages/renderer`:

- `interpolate()`, easing helpers, spring helpers (deterministic).
- `useCurrentFrame()` + player frame context.

**Done when**
- A demo scene can animate based only on `frame`.

### 3.2 Babulus Player (web)

In `apps/studio-web`:

- Load preview artifacts (`/preview/index.json` + `/<id>.script.json`) generated by `studio:preview`.
- Render the referenced scene component at a controlled frame.
- Basic transport controls: play/pause, scrub frame, jump to cue/scene.

**Done when**
- The preview updates deterministically when scrubbing.
- No reliance on real-time clocks inside scenes (enforced by conventions/tests).
- The storyboard tree refreshes when preview artifacts update.

---

## Phase 4 — Generation Integration (Audio + Timing) (5–15 days)

### 4.1 Compiler bridge (initially CLI-based)

- For local development: invoke the existing TypeScript generator (via `studio:preview` or direct `generateComposition`) to generate:
  - `script.json`
  - `timeline.json`
  - audio artifacts
  - (input is the resolved manifest)

**Done when**
- Editing the DSL triggers regeneration and the preview updates against new `timeline.json`.

### 4.2 Artifact model (local + SaaS)

- Define a consistent artifact naming strategy by hash.
- Define “run” directories and metadata for local mode.

**Done when**
- A generated run can be re-opened later and replayed deterministically.

---

## Phase 5 — Renderer v0 (Headless Browser + ffmpeg) (10–20 days)

### 5.1 Render harness

- A render-only entry that:
  - loads a canonical DSL + artifacts
  - renders frame `n` based on query param or injected script

**Done when**
- A single frame can be rendered to a PNG deterministically.

### 5.2 MP4 render pipeline

- Iterate frames → capture PNGs → encode MP4.
- Mix audio from `timeline.json` using ffmpeg.

**Done when**
- A full MP4 render completes for a small sample video with correct A/V sync.

### 5.3 Toolchain pinning

- Pin browser version, ffmpeg version, and font set.
- Use `render:toolchain` to report and validate expected versions.

**Done when**
- Renders are reproducible across machines of the same platform class.

---

## Phase 6 — SaaS Control Plane (Amplify Gen2) (10–25 days)

### 6.1 Auth + tenancy model

- Cognito login.
- App-level `Org` + `OrgMember`.
- Org scoping enforced on every read/write.

**Done when**
- A user can belong to multiple orgs and switch org context safely.

### 6.2 Project/video/version APIs

- Store canonical DSL versions (`StoryboardVersion`).
- Store run records (`GenerationRun`, `RenderRun`).
- Store assets in S3 with per-tenant prefixes + signed URLs.

**Done when**
- Web app can create a video, save a new version, and load it back.

---

## Phase 7 — Execution Plane (Cloud Workers + Local Agent) (10–30 days)

### 7.1 Job system

- `Job` records with:
  - idempotency keys
  - status transitions
  - logs + progress events

**Done when**
- A “generate” job can be queued and completed with observable progress.

### 7.2 Cloud worker (generation + render)

- Containerized workers:
  - Babulus generation (Python + ffmpeg)
  - Rendering (Node + headless browser + ffmpeg)

**Done when**
- A cloud render produces artifacts in S3 and the UI updates live.

### 7.3 Local render agent (Electron)

- Device registration (revocable).
- Job claim/execute/report.

**Done when**
- The same `Job` can be executed locally or in the cloud by switching `executionMode`.

---

## Phase 8 — Cost Tracking (Begin Early, Finish by Beta) (ongoing)

### 8.1 UsageEvent instrumentation

- Emit `UsageEvent` for:
  - TTS/SFX/music generation units
  - rendering frames/time
  - storage and egress (estimated initially)
- Local runs write an append-only ledger (`usage.jsonl`) plus `usage-summary.json` and `usage-summary-detailed.json` in the env cache dir.
- CLI helper: `babulus usage summarize --dsl <file>` reads the ledger for quick reporting (`--detail` adds provider/kind breakdown).
- Rate cards live in `.babulus/config.yml` under `pricing` to compute `estimatedCost` per usage event.

**Done when**
- Every `GenerationRun` and `RenderRun` has a cost breakdown viewable internally.

### 8.2 Plan-controlled visibility modes

- BYOK mode: show raw units + estimated costs.
- Managed/flat-rate mode: show product-native units + quotas.

**Done when**
- The same underlying ledger drives both UIs with role/plan-based redaction.

---

## Phase 9 — Publishing Surfaces (Landing Pages + Domains) (10–25 days)

### 9.1 Default hosting

- Host landing pages under `*.babul.us` (wildcard).
- Per-video pages embed the latest approved render.

**Done when**
- A published video has a stable landing page URL in the UI.

### 9.2 Custom domains (paid)

- CNAME verification + ACM certificates.
- Hardened `DomainMapping` workflow.

**Done when**
- A customer can attach a domain safely without manual ops work.

---

## Phase 10 — “Beta Readiness” Checklist

- Multi-tenant access verified (tests for cross-tenant leakage).
- Deterministic renders (pinned toolchains, reproducible outputs).
- Job reliability (idempotency, retries, timeouts, cancellation).
- Cost ledger coverage (no blind spend paths).
- Security posture (least-privilege tokens, device revocation, signed URLs).
- Backups and retention policies (artifacts and logs).
