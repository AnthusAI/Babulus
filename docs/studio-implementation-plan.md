# Babulus Studio — Step-by-Step Implementation Plan (Draft)

**Status:** Phase 6 milestones completed (2026-01-24)
**Companion doc:** `docs/saas-electron-plan.md`

This document turns the vision into an execution plan with concrete milestones, deliverables, and “definition of done” checks.

---

## Current Status (2026-01-24)

### Major Milestone: Authentication + GraphQL Integration Complete

The studio web app now has full Cognito authentication and AppSync GraphQL integration working end-to-end. Users can sign up/sign in with email, and all server actions are authenticated and scoped to user organizations. The preview functionality has been thoroughly tested with real video content, and the core rendering pipeline now supports parallel frame rendering for improved performance.

**Completed**
- Phase 3.1 runtime helpers (interpolate + easing/spring, frame context) with BDD coverage.
- Phase 3.2 UI shell: storyboard + chat + preview layout in `studio-web`.
- Local preview bridge: `studio:preview`/`studio:watch` generates `script.json` + `timeline.json` into `apps/studio-web/public/preview`.
- BDD coverage expanded for generation, media helpers, provider registries, and renderer math.
- Coverage baseline captured in `docs/baselines/coverage-20260122.json` (lines 76.71%, functions 76.83%).
- CLI usage/generate/clean/sfx flows now covered with BDD tests.
- Config loading and BABULUS_PATH resolution covered with BDD tests.
- DSL validation coverage added for resolved video specs.
- Preview wiring consumes `script.json` metadata, loads `timeline.json` for track stats, and supports cue-based seeking + audio-driven playback.
- Timeline helpers live in `packages/shared` with BDD coverage, plus per-track clip visualization + click-to-seek and audio-synced playhead in the preview UI.
- Shared video config helper derives fps/size/duration from script + timeline data, used by the preview UI.
- Semantic markup is now preserved from the DSL into generated script output.
- Storyboard renderer added for script-only previews, with `render:storyboard` to drive PNG+MP4 output.
- HTML storyboard frame renderer added (`render:storyboard:frames`) for Playwright-free snapshots.
- Storyboard PNG frame renderer added (`render:storyboard:png`) for Playwright validation runs.
- Renderer frame callbacks added for progress/telemetry hooks in pipelines.
- Render pipeline now fails fast when no frames are produced.
- Preview now renders the storyboard component against real `script.json` data.
- Tactus baseline record updated with hashes in `docs/baselines/tactus-intro.json`.
- Storyboard HTML frames validated against Tactus `intro.script.json` output.
- Storyboard tree now surfaces semantic markup tags for scenes/cues.
- Player supports external clock mode for audio-driven frame control.
- Run artifacts are stored by hash under `env/<env>/runs/<runId>` with `run.json` + `latest.json`.
- Render harness can emit deterministic HTML snapshots for a single frame (in-memory or file), plus PNG capture via Playwright when installed (`render:frame --format png`, `render:frames`).
- MP4 encode helper builds ffmpeg args with injected runner tests, plus `render:video` and `render:pipeline` scripts for ad-hoc encoding.
- Storyboard render pipeline helper added with BDD coverage; `render:storyboard` now uses the shared pipeline helper.
- Storyboard HTML frames helper added with BDD coverage; `render:storyboard:frames` now uses the shared helper.
- Renderer toolchain inspector added (`render:toolchain`) with version/requirement checks + BDD coverage.
- ffmpeg missing-binary failures now surface a clearer error message in the encode pipeline.
- Playwright PNG capture validated against Tactus `intro.script.json` (frames + MP4 preview render).
- Toolchain pinned for v0: Playwright 1.45.0 (devDependency) + ffmpeg 7.1.1 verified.
- Renderer font stack pinned to the system-ui fallback list (no custom font pack yet).
- Amplify Gen2 backend scaffold added for `studio-web` (auth + data + storage + initial schema).
- Amplify Gen2 deployment scripts added for `studio-web` (`amplify:sandbox`, `amplify:deploy`).
- Amplify Gen2 backend package metadata aligned with the Tactus example (`amplify/package.json`, `amplify/tsconfig.json`).
- Amplify Gen2 CLI dependency aligned with the Tactus example (`@aws-amplify/backend-cli`).
- Org-scoped storage key helpers added to shared utilities with BDD coverage.
- Control-plane schema expanded to cover jobs, approvals, conversations, usage, and billing records.
- Studio web now uses an in-memory control-plane seed to exercise org/project/video switching (Amplify client wiring deferred).
- Studio web header actions now update the in-memory control-plane (generate/render runs + status transitions).
- Storyboard version selector + create/activate actions wired to the in-memory control-plane.
- Runs panel added to the preview surface with local status toggles for generation/render runs.
- Project/video create actions added in the storyboard panel for local control-plane prototyping.
- Preview panel now allows switching between available preview compositions.
- Active session role display added using in-memory org memberships to exercise tenancy logic.
- Run status toggles now update video status (ready/published/error) to mimic control-plane behavior.
- Role selector now gates UI actions using shared RBAC permissions in the studio prototype.
- Storage helpers now generate standard generation/render artifact keys; run record builders default to them.
- Runs panel now surfaces artifact key paths for generation/render outputs.
- Usage panel prototype added with redacted vs full visibility based on role + billing mode.
- Job helpers added to the control plane (create/list/claim/status), with a prototype jobs panel in the UI.
- Jobs panel now supports claim/execute actions using the execution-plane mock.
- Jobs panel supports auto-run to claim + execute queued jobs.
- Asset record builders and control-plane asset list/create helpers added, with a prototype asset library panel in the UI.
- Org/member record builders and control-plane helpers added, with studio now deriving org/membership + billing context from the in-memory control-plane.
- Org members panel added to the studio storyboard column (invite stub + role display).
- Usage panel now allows toggling visibility mode when billing is manageable.
- Chat panel now uses in-memory conversations/messages with send support (control-plane backed).
- Approvals added to the control plane with a prototype approvals panel in the studio preview column.
- Usage events added to the control plane with sample totals feeding the Usage panel.
- Render agents added to the control plane with a prototype agent status panel in the studio preview column.
- Org creation action added to the studio header (creates org + owner membership locally).
- Usage summary helper added to shared utilities with BDD coverage (now used in the UI).
- Chat now supports selecting or creating conversations per video.
- Execution-plane mock added for job claiming/execution with BDD coverage.
- Execution-plane job execution now emits usage events for cost tracking.
- Execution-plane job handling updates render agent status (busy/online).
- Job events added for status/progress tracking, surfaced in the jobs panel.
- Job idempotency keys supported in the control-plane create flow.
- Execution-plane job execution now emits log/progress events for worker traceability.
- Job event summaries added to shared utilities and surfaced in the jobs panel (status/progress/log).
- Control-plane job status updates can now emit a matching job event in one call.
- Control-plane job claim helper can emit a matching job event in one call.
- Jobs panel now shows recent per-job event history (last 3 events).
- RBAC permission matrix and usage visibility resolver added to shared utilities with BDD coverage.
- Org tenancy helpers added for active-org resolution and membership checks with BDD coverage.
- Org access guard helpers added (active-org + permission checks) with BDD coverage.
- Org scope helpers added (apply/validate/filter) with BDD coverage.
- Active session helper added (resolve active org + role) with BDD coverage.
- Control-plane record builders added for project/video/version/run inputs with BDD coverage.
- In-memory control-plane store helpers added for org-scoped CRUD with BDD coverage.
- Video status transition helpers added with BDD coverage (plus control-plane status updates).
- Amplify Gen2 backend deployed to AWS with full control-plane schema (15 models).
- Studio web now builds successfully with TypeScript strict mode + ESM module resolution.
- Renderer package exports split into browser-safe (player/storyboard) and server-only (render/encode) modules.
- Studio web frontend deployed to Amplify with Next.js SSR (WEB_COMPUTE platform).
- **Phase 6.1 Auth + tenancy model: Cognito authentication fully integrated.**
  - Real Cognito authentication implemented in server actions using `runWithAmplifyServerContext` and `getCurrentUser`.
  - Client-side Amplify configuration added to Authenticator component for auth UI.
  - Authentication flow working end-to-end: unauthenticated users see sign-in UI, server actions validate via Cognito tokens.
  - `amplify_outputs.json` downloaded and configured with User Pool, AppSync API, and S3 bucket details.
- **Phase 6.3 Client library integration: GraphQL client fully integrated.**
  - Full GraphQL client implementation restored with type adapters for AppSync integration.
  - Server actions now use real GraphQL operations against deployed AppSync API.
  - All data operations scoped to authenticated user's organizations via Cognito authorization.
- **Phase 3.2 UI styling overhaul: Tailwind v4 + Shadcn components integrated.**
  - Tailwind v4 and Radix UI primitives added for modern component styling.
  - Preview tested with real video content and frame rendering.
- **Phase 5.2 MP4 render pipeline: Parallel frame rendering implemented.**
  - Parallel frame rendering added for improved render performance on longer videos.
  - ffmpeg passthrough optimization for video encoding pipeline.
- Autonomous deployment handler script added for monitoring Amplify deployments and running post-deployment tasks.
- Preview assets added to public directory for demo content (intro and studio-demo videos).

**In progress**
- Phase 6.2 Project/video/version APIs (migrate from in-memory control-plane to real Amplify GraphQL operations in UI).

**Next up**
- Phase 6.2 completion: Migrate remaining UI from in-memory control-plane to real Amplify GraphQL operations.
- Phase 7.1 Job system: Queue and execute generation/render jobs with observable progress.

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
