# Babulus Studio / babul.us — SaaS + Electron Plan (Draft)

**Status:** Draft (2026-01-22)  
**Goal:** A multi-tenant, chat-first video production app built around Babulus + an open-source, Remotion-inspired renderer, deployable as both a SaaS (AWS Amplify Gen2) and a local-first Electron app (optional cloud control plane).

---

## 1) Product Vision (North Star)

Build an “agent-based video generation machine”:

- **Humans** review/approve content at key checkpoints.
- **Agents** (eventually powered by Tactus) research, propose edits, and push items forward through a production pipeline.
- **Babulus** remains the timing + audio truth-source (narration-first storyboard → audio generation → timing artifacts).
- A **Remotion-inspired (but independent) renderer** renders videos and provides a live preview surface (frame/time-parametrized scenes).
- **Web pages / landing pages** accompany each video, sharing the same React visual components (video + web as two render targets).

The UI is intentionally **not** a timeline editor; it is **conversational + storyboard-structured**:

- **Chat** (Vercel AI Elements) drives changes and approvals.
- **Storyboard tree** represents scenes/cues/assets at a high level.
- **Preview** shows the evolving result continuously.

---

## 2) MVP Scope vs. Non-Goals

### MVP scope

- Multi-tenant SaaS: orgs/teams/projects/videos, basic RBAC, asset library.
- Video workspace: storyboard tree + chat + preview.
- “Generate” pipeline: compile storyboard → generate audio/timing → preview → render.
- Two execution modes:
  - **Cloud rendering** via worker infrastructure.
  - **Local rendering** via Electron “render agent” on a powerful workstation.

### Explicit non-goals (initially)

- A full timeline editor (Remotion Studio-like UX).
- Arbitrary tenant-supplied React/TypeScript execution in the SaaS runtime.
- Complex publishing automation (YouTube/X/email) beyond basic export hooks.
- Backward compatibility with legacy DSL formats.

---

## 3) Remotion (Reference Only) — Why We Won’t Depend On It

Remotion is a strong proof-of-concept for “React scenes as a function of time/frame”, but it is **not MIT** and uses the “Remotion License” (source-available, not copyleft).

- **Free license**: individuals, non-profits, and for-profit orgs with **≤ 3 employees** (commercial use allowed).
- **Company license required**: entities not eligible for the free license.
- **Not allowed**: copying/modifying Remotion code to sell/rent/license a derivative of Remotion.

Implication for this product:

- We should treat Remotion as **inspiration only** and implement our own renderer/player to avoid licensing constraints in a commercial SaaS.
- We can reuse the *ideas* (composition, scenes, frame-based animation) and design a similar schema, but we must not copy Remotion code.

References:

- Remotion license text: https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md
- Remotion Pro license pricing page: https://www.remotion.pro/license

AI Elements / AI SDK licensing:

- `ai-elements`, `@ai-sdk/react`, and Vercel’s repos are **Apache-2.0**.

---

## 4) Core UX Model

### Primary workspace layout

- **Left:** Storyboard tree (Scenes → Cues → attached assets/audio clips).
- **Center:** Chat (AI Elements) + activity feed (tasks, tool calls, approvals).
- **Right:** Preview (Babulus Player) + artifact panel (DSL, diffs, generated outputs).

### Key user flows

- Create/select project → create video item.
- Author storyboard (direct edit + chat-assisted edits).
- Generate (audio + timing) → review preview → iterate.
- Render video → export/publish artifacts.

### Electron vs web navigation mapping

Electron menu (native) likely needs:

- **File:** New/Open local project, Connect to cloud org, Import/Export, Settings.
- **Edit:** Undo/Redo, Find, Cut/Copy/Paste (text/editor affordances).
- **View:** Toggle panels, Reload, Toggle DevTools, Zoom.
- **Render:** Generate audio, Render video, Render stills, Open output folder.
- **Tools:** Cache manager, Provider credentials, Diagnostics.
- **Help:** Docs, About, Support.

Web app equivalents:

- Replace “File/Open” with **Project selector + upload/connect local agent**.
- Replace “Open output folder” with **Downloads + artifact links**.

---

## 5) Architecture Overview (SaaS + Local Agent)

### Principle: “Control plane” vs “Execution plane”

- **Control plane (SaaS):** stores state, versions, approvals, and schedules work.
- **Execution plane (workers):** runs Babulus + the renderer toolchain, uploads artifacts, streams progress back.

This enables:

- **Cloud rendering** (AWS workers).
- **Local rendering** (Electron “render agent” on user hardware).
- Same UI + job model across both.

### Recommended high-level components

- **Frontend:** Next.js + shadcn/ui + AI Elements (chat-first UI).
- **Auth:** Cognito (Amplify Gen2).
- **API:** AppSync GraphQL (Amplify Gen2).
- **Storage:** S3 (+ CloudFront) for assets and artifacts.
- **Async compute:** SQS/EventBridge + ECS/Fargate (or Step Functions) for Babulus + rendering workers (Chromium + ffmpeg).
- **Local agent:** Electron background worker (or separate daemon) that pulls jobs and executes locally.

---

## 6) Multi-Tenancy & Auth (Design Constraints)

### Data partitioning

Every top-level record should include `orgId` (tenant key). All reads/writes must be scoped to an active org.

### RBAC (minimum)

- `owner`, `admin`, `editor`, `viewer`
- Membership table: `OrgMember { orgId, userId, role }`

### Important constraint

Cognito “groups” don’t scale well for multi-tenant SaaS (group limits + awkward org switching). Prefer an **application-level membership model** and enforce org access via resolvers/authorizers.

Open question (Amplify Gen2 specifics):

- Best-practice enforcement for “active org” scoping (AppSync resolver checks vs custom authorizer vs dual-token approach).

---

## 7) Domain Model (Suggested)

Minimum entities:

- **Org** (tenant)
- **User** (Cognito identity + profile row)
- **OrgMember** (user↔org membership with role)
- **Project**
- **Video** (a content item / “video product”)
- **StoryboardVersion** (the canonical unified DSL text + metadata)
- **GenerationRun** (compile + audio generation outputs)
- **RenderRun** (MP4 + stills + logs)
- **Asset** (uploaded images/audio/video/fonts)
- **Template** (visual system / theme + component pack version)
- **Conversation / Message** (chat history per video or per run)
- **Approval / Task** (human-in-the-loop checkpoints)

Artifacts are stored in S3, referenced from DB with content hashes for caching/dedup.

### Publishing surfaces (web + channels)

Add these once we start shipping landing pages and distribution:

- **Site** (a publishable web surface: “channel page” + per-video landing pages)
- **DomainMapping** (hostnames → site/org routing; supports `*.babul.us` and custom domains)
- **Publication** (a record of “this render was published to X at URL Y”, per channel)

Custom domain approach (recommended):

- Default: wildcard `*.babul.us` (no per-tenant DNS automation required).
- Paid feature: customer-owned domains via CNAME + ACM certificate (DNS validation), attached to CloudFront/hosting.

---

## 8) Pipeline (Compile → Generate → Preview → Render)

### Compile (fast, deterministic)

- Input: unified DSL as a TypeScript module (`.babulus.ts`)
- Output: `script.json` (scenes/cues with `startSec/endSec`, plus composition metadata as needed)
- Store: versioned artifact + diff metadata

### Unified DSL (single artifact)

To avoid cross-file referential integrity problems, the system should have **one canonical DSL** per video version that contains:

- Composition metadata (fps/size/duration, scene tree, reusable components).
- Storyboard structure (scenes/cues) + narration and audio directives.
- Publishing metadata (optional): landing page copy, CTA, SEO fields, channel targets.

For security and determinism, separate the authored TypeScript source from the execution manifest:

- Canonical source: **TypeScript** (`.babulus.ts`).
- Execution model: compile/resolve the TypeScript module into a **serializable manifest** (JSON) that is used for preview/render and stored for reproducibility.
- Safety model (multi-tenant SaaS): run resolution in an isolated job environment with strict limits, capability-based APIs, and snapshotting (see below).
- Breaking changes are acceptable; no legacy fallback or compatibility paths.

### TypeScript DSL module (single authoring model)

The unified DSL is always a TypeScript module that exports a default resolver. This gives us one consistent way to author files while still allowing imperative “report-style” behavior.

Authoring goal:

- **One entrypoint:** `export default defineVideo(async (ctx) => ResolvedVideoSpec)`
- **No user-authored imports** (the harness injects runtime imports and template pack wiring).
- **Imperative allowed:** fetch data, compute structure, assemble narration/visuals — but only through `ctx` capabilities.
- **Serializable output:** the returned spec must be JSON-serializable (no React elements, no classes, no closures).

Example (`content/intro.babulus.ts`):

```ts
export default defineVideo(async (ctx) => {
  const headline = await ctx.sources.httpText({ url: "https://example.com" });
  return {
    id: "intro",
    composition: { fps: 30, width: 1920, height: 1080 },
    storyboard: {
      scenes: [
        {
          id: "title",
          componentId: "TitleScene",
          cues: [{ id: "hook", voice: `Today: ${headline}` }],
        },
      ],
    },
    publish: {
      slug: "intro",
      page: { title: "Intro", cta: { label: "Get started", href: "/signup" } },
    },
  } as const;
});
```

Optional: allow `satisfies BabulusVideo` for type-checking without imports by providing a project-level `d.ts` with global types.

### Resolution → manifest (reproducibility boundary)

The resolver runs in a **resolve step** (job) and produces:

- A **resolved manifest** (JSON) consumed by preview/render.
- A **snapshot record** of external inputs (or their hashes) used to resolve the manifest.
- Usage/cost events tied to resolution-time operations (fetching, connector calls).

Preview and render should consume the resolved manifest, not re-run the resolver, so what humans approved is what gets rendered.

### Static validation (AST) + runtime restrictions

We can still use the AST to enforce a strict “safe surface area”:

- Reject `import`, `require`, dynamic import, and Node built-ins access.
- Reject `eval`, `new Function`, and similar dynamic execution.
- Ensure all network/data access is routed through `ctx` (capability-based, metered).

The validator should emit precise errors (file/line/column) so the UX feels like a linter, not a “security wall”.

### Harness injection (hide the boilerplate)

The runtime preview/render harness can be generated around the validated data:

- Inject imports for the approved template pack(s) (React components, fonts, helpers).
- Map `componentId` → actual component implementation (allowlisted).
- Provide runtime helpers for interpolation/easing and rendering.

This keeps the authored DSL clean while still producing a real executable render bundle.

### Generate (expensive, cacheable)

- TTS segments (provider/model/voice dependent)
- SFX/music selection (variants + “pick”)
- Output: `timeline.json` + segment audio files + merged voiceover
- Store: artifacts by hash (org-scoped but de-duplicable)

### Preview (continuous)

- Babulus Player renders the current project state deterministically from the unified DSL + generated artifacts.
- Prefer **URL-based assets** (S3/CloudFront + signed URLs) over staging a `public/` directory in SaaS.

### Render (expensive, asynchronous)

- Render MP4 (and stills) via our renderer (headless browser frame capture + ffmpeg encode, or an equivalent deterministic pipeline).
- Upload artifacts + logs + metrics.

---

## 9) Renderer Strategy (Remotion-Inspired, Independent Implementation)

### Core concept

- A **composition** declares `fps`, `width`, `height`, `durationFrames`.
- A **scene graph** describes what to render.
- Every visual component is a **pure function of** `{ frame, fps, timeMs }` (no hidden clocks).
- Animations are implemented as deterministic helpers (`interpolate()`, easing, springs, etc.).

### Preview (web/Electron)

- A lightweight Player controls `frame` and renders React components in real time.
- No timeline editor required; the storyboard tree provides navigation.

### Rendering (server/local)

Two practical options:

1) **Headless Chromium screenshots + ffmpeg**
   - For each frame: render page at frame `n` → screenshot → encode to video.
   - Mix audio with ffmpeg from Babulus timeline artifacts.
2) **Canvas/WebGL render-to-video**
   - Harder to generalize for “web page + video share the same components”, but can be more efficient.

MVP recommendation: start with (1) for correctness + simplicity.

---

## 10) Local Rendering: “Render Agent” Concept

### Why

- Many creators have fast local hardware (e.g., high-end MacBook Pro).
- Rendering is compute-heavy; cloud is costly and sometimes slower.
- A hybrid model makes the SaaS a **control plane**, not a compute monopoly.

### Agent responsibilities

- Authenticate to the org (device registration flow).
- Poll/subscribe for jobs.
- Download required inputs (storyboard version, assets).
- Execute Babulus + the renderer toolchain.
- Upload artifacts + progress events.

### Trust & security considerations

- Agent should have a scoped credential (least privilege: only its org + jobs).
- Artifact uploads must be validated server-side (size/type, virus scanning if needed).

---

## 11) Tenant Code Policy (DSL vs Templates)

### DSL code (allowed, controlled)

The unified DSL is TypeScript and may contain imperative code. This code:

- Runs only in the **resolve step** (job), not inside the frame render loop.
- Must return a JSON-serializable resolved manifest.
- Executes under capability-based `ctx` APIs with metering and strict limits.

### Template / component code (restricted in SaaS)

We should not allow tenants to upload and execute arbitrary React/component code in a shared SaaS runtime. Instead:

- Ship curated, allowlisted template packs.
- Optionally support enterprise/self-host/local-only custom templates where the customer controls the runtime.

If we support SaaS-side templates later, it must be through isolated builds/runtimes and a hardened distribution model (not “npm install arbitrary deps in production”).

---

## 12) AWS Amplify Gen2 Notes (Implications)

Amplify Gen2 is a good fit for:

- Auth (Cognito), GraphQL (AppSync), data models, S3 storage integration.
- “Control plane” workloads (CRUD + orchestration triggers).

But **rendering and audio generation** likely need compute beyond typical Lambda ergonomics:

- Prefer ECS/Fargate workers (or equivalent) for rendering.
- Treat Babulus generation as a worker job (Python + ffmpeg deps).

---

## 13) Recommended Repo Layout (Monorepo)

This repo is currently a Python package. If we add web + Electron here, a workable layout is:

```
apps/
  studio-web/        # Next.js app (SaaS UI)
  studio-desktop/    # Electron wrapper (local UX + agent)
packages/
  ui/                # shadcn + AI Elements components
  shared/            # types, API client, shared logic
  render-agent/      # local agent protocol + implementation helpers
```

Decision: keep SaaS + Electron in a monorepo (public/private boundaries to be decided).

---

## 14) Milestones (Suggested Order)

1) **UI prototype (local mock):** storyboard tree + AI Elements chat + Babulus Player preview.
2) **Local unified-DSL integration:** open a local `.babulus.ts`, run resolve + generation, hot-reload preview.
3) **Electron wrapper:** menus + local project management + local render output browsing.
4) **Amplify Gen2 backend:** auth + org/projects/videos + S3 assets + basic activity log.
5) **Cloud job runner:** queue + worker (generate + render) + artifact uploads + progress UI.
6) **Hybrid mode:** SaaS schedules jobs → local agent executes.
7) **Agent pipeline (Tactus):** tasks, approvals, research ingestion, publish automation.

---

## 15) Open Questions / Things to Decide Early

- **Unified DSL:** exact module contract (`defineVideo` signature), plus how we snapshot external inputs for reproducible approved renders.
- **Sandboxing:** isolation boundary + capability model for resolver execution in SaaS (microVM/Firecracker, gVisor, dedicated per-tenant workers).
- **Framework choice:** Next.js everywhere vs Vite for Electron (AI Elements assumes Next.js).
- **Multi-org membership:** how to implement org switching securely in AppSync with Cognito.
- **Renderer strategy:** headless-browser screenshots vs canvas pipeline; determinism + performance targets.
- **Worker strategy:** where Babulus runs; artifact URL strategy; cache deduping.
- **Secrets model:** platform-managed keys vs BYOK; encryption + audit requirements.
- **Template strategy:** curated visuals vs tenant templates; when (if ever) to allow SaaS-side code.
- **Sync model:** local projects syncing to cloud (optional) vs cloud-only projects.

---

## 16) Additional Considerations (Common Pitfalls)

- **Reproducibility:** pin template versions, Node/Python, and ffmpeg; store “render inputs” so old renders can be reproduced.
- **Storage cost control:** S3 lifecycle policies for intermediate artifacts (segments, previews, logs) vs “final” exports.
- **Billing & quotas:** per-tenant budgets, rate limiting, usage metering (TTS chars, render minutes, storage/egress).
- **Content rights & safety:** asset licensing, music/SFX rights, source attribution, moderation policy, DMCA/process.
- **Secrets & keys:** encrypt-at-rest, audit access, rotation; define whether customers can bring their own provider keys.
- **Artifact access:** signed URLs vs public CDN; prevent cross-tenant URL guessing; consider watermarking in free tiers.
- **Observability:** per-job logs, progress events, retries/idempotency, traceability from chat action → job → artifact.
- **Collaboration:** version history, diff/merge semantics for storyboard edits, and conflict handling for concurrent changes.
- **Electron distribution:** code signing/notarization, auto-updates, bundling python/ffmpeg, and crash reporting.

---

## 17) Cost Tracking & Pricing Transparency (Must-Have)

We can’t price this product responsibly until we have **deep, per-operation cost transparency** from using it ourselves. This is a Munger-style “measure reality before optimizing” requirement, but it also directly drives product trust and long-term unit economics.

### Three different “truths” to track

Keep these separate in both the data model and the UI:

1) **Underlying usage** (objective): tokens/chars/seconds/frames/bytes/etc.
2) **Underlying cost** (estimated/actual): USD allocation for those units (provider + compute + storage + egress).
3) **Customer billing** (what they pay): plan-specific pricing (flat rate, credits, markup, BYOK, etc).

### Cost ledger (append-only)

Create an append-only ledger of `UsageEvent`/`CostEvent` records tied to real work:

- **Attribution:** `orgId`, `projectId`, `videoId`, `storyboardVersionId`, `generationRunId`, `renderRunId`, `jobId`
- **Provider context:** `provider`, `model/voice`, `region`, `operation` (tts/sfx/music/render/frame/encode/upload)
- **Units:** `unitType` + `quantity` (chars, tokens, seconds, frames, bytes, gb-seconds)
- **Rate card:** `rateCardId`, `rateCardVersion`, `currency`
- **Cost fields:** `estimatedCost`, `actualCost?`, `costConfidence` (estimated/actual/unknown)
- **Visibility:** flags for what can be shown to end users vs internal only
- **Local dev:** `.babulus/config.yml` can include a `pricing` rate card to compute `estimatedCost` immediately.

This ledger is the source of truth for:

- Internal cost dashboards (COGS, margin, top spenders, anomaly detection).
- Customer “usage” pages (BYOK and non-BYOK), with plan-specific redaction.
- Quotas/budgets and automated “are you sure?” confirmations.

### BYOK vs managed keys (two UX modes)

We need two first-class UI modes per org (plan-controlled, not just a UI preference):

**A) BYOK transparency mode**

- Show raw usage units (tokens/chars/etc) and computed costs using a versioned rate card.
- Make it clear what is **estimated** vs **confirmed** (we usually can’t see the provider invoice).
- Provide CSV export and per-run breakdown (“this render cost X because …”).

**B) Abstracted pricing mode (flat rate / credits / markup)**

- Hide raw token/char counts by default.
- Show **product-native units** (e.g., “render minutes”, “voice seconds”, “credits”) + remaining quota.
- Show billable totals without revealing provider unit economics.

### Cost previews + safety rails

- Provide **pre-flight cost estimates** before running expensive jobs (per run and per step).
- Support **org budgets** and per-project caps; block or require explicit approval when exceeding.
- Add anomaly detection (sudden cost spikes, runaway loops, repeated retries).

### Cloud vs local cost accounting

Even with local rendering:

- Track **usage** for work done locally (frames rendered, audio seconds) so teams can understand throughput.
- Track **SaaS-side costs** separately (storage/egress/orchestration) so we can still price the control plane.

---

## 18) Schema & API Sketch (Starting Point)

This is intentionally “minimum viable” and will evolve as agent/pipeline features land.

### Core types (conceptual)

- `Org { id, name, createdAt, planTier }`
- `OrgMember { orgId, userId, role, createdAt }`
- `Project { id, orgId, name, templateId, createdAt }`
- `Video { id, orgId, projectId, title, status, activeStoryboardVersionId }`
- `StoryboardVersion { id, orgId, videoId, sourceText, sourceFormat, parentVersionId, createdBy, createdAt }`
- `GenerationRun { id, orgId, videoId, storyboardVersionId, status, scriptArtifactKey, timelineArtifactKey, logsArtifactKey }`
- `RenderRun { id, orgId, videoId, generationRunId, status, mp4ArtifactKey, stillsArtifactPrefix, logsArtifactKey }`
- `Asset { id, orgId, projectId, kind, sha256, storageKey, metadataJson, createdAt }`
- `Conversation { id, orgId, videoId, createdAt }`
- `Message { id, orgId, conversationId, role, content, createdAt }`
- `Approval { id, orgId, videoId, kind, status, requestedBy, decidedBy, decidedAt }`
- `RenderAgent { id, orgId, label, status, lastSeenAt }`
- `Job { id, orgId, kind, status, claimedByAgentId?, inputJson, createdAt, updatedAt }`
- `RateCard { id, name, version, effectiveAt, json }`
- `UsageEvent { id, orgId, at, operation, unitType, quantity, provider?, model?, relatedIds..., estimatedCost?, actualCost?, visibility }`
- `BillingAccount { id, orgId, planId, billingMode, usageVisibilityMode, byokProviders?, budgets? }`

### Key operations (conceptual)

- `createOrg`, `inviteUser`, `setMemberRole`, `switchOrg` (client-side “active org”).
- `createProject`, `createVideo`, `createStoryboardVersion`.
- `startGeneration(videoId, storyboardVersionId, executionMode)`.
- `startRender(videoId, generationRunId, executionMode)`.
- `registerRenderAgent`, `claimJob`, `reportJobProgress`, `completeJob`.
- Subscriptions: `onJobProgress(jobId)` / `onRunUpdated(runId)` for real-time UI.
- Usage: `listUsageEvents`, `getCostBreakdown(videoId|runId|orgId)`, `setUsageVisibilityMode`, `setBudgets`.

---

## 19) How We Could Fail (Munger Inversion Checklist)

Failure modes to avoid:

- **Confuse the product:** build a timeline editor clone and lose the “chat + storyboard + approvals” differentiation.
- **Never pick a canonical artifact:** keep “audio DSL” and “visual TS” separate and spend years on referential integrity and drift bugs.
- **Let the resolver sandbox degrade:** allow imports, unrestricted network/filesystem, or arbitrary dependencies until tenants can execute arbitrary code in SaaS.
- **Make preview non-deterministic:** allow hidden clocks, randomness, network calls, or stateful animations that don’t reproduce in renders.
- **Underestimate rendering:** assume headless browser rendering is trivial; skip frame determinism, memory ceilings, cross-platform font/layout differences, and video/audio sync.
- **Skip version pinning:** don’t pin template packs, Node/Python/ffmpeg, browser versions, or fonts; make old renders impossible to reproduce.
- **Treat multi-tenancy as “add orgId later”:** forget org scoping in resolvers/storage paths and ship a cross-tenant data leak.
- **Misuse Cognito groups for tenants:** hard-limit yourself, make org switching painful, and create authorization edge cases you can’t reason about.
- **Implement a fragile job system:** no idempotency, no retries, no correlation IDs, no structured logs; every “stuck render” becomes a manual investigation.
- **Ignore cost physics:** unlimited generation/renders, no quotas/budgets, no artifact retention policy, no egress accounting → surprise bills and forced shutdowns.
- **Set pricing blindly:** without real cost telemetry and value signals you either lose money (negative margin) or price too high and get undercut.
- **Ship the local agent as “just log in”:** mint long-lived tokens on disk, no device identity, no revocation, no job-scoped credentials → inevitable compromise.
- **Publish pages without a domain plan:** no wildcard baseline, sloppy custom-domain verification, weak routing → domain takeover/security incidents.
- **Delay human-in-the-loop primitives:** no explicit approvals/tasks/audit trail; “agent did stuff” without accountability destroys trust.
- **No rollback story:** no version history, diffs, or revert; one bad agent run destroys a week of work.

Ways to avoid the above (mitigations):

- **Make the unified DSL the source of truth**; everything else is generated artifacts.
- **Keep the resolver sandbox strict** (AST validation + capability-based `ctx` + strict limits) and generate the harness automatically.
- **Make rendering deterministic by design** (frame-in → pixels-out) and pin toolchains.
- **Design multi-tenancy enforcement early** (org scoping + least-privilege) and test for leaks.
- **Treat generation/rendering as jobs** (idempotent, observable, retryable) with budgets + retention.
- **Ship publishing with a safe default** (`*.babul.us`) and a hardened custom-domain workflow.
