# Babulus Studio — Implementation Landscape (Alpha)

**Status:** Alpha (post phase 1-9 buildout; testing in progress)
**Companion docs:**
- `docs/saas-electron-plan.md` (vision + architecture)
- `docs/babulus-language-design.md` (language status)

This document replaces the old step-by-step plan. It captures what actually exists now, what is still placeholder, and what remains for alpha/beta validation.

---

## What Exists vs Placeholder

**Real (implemented and wired):**
- Amplify Gen2 control plane with org/project/video models and server actions.
- Studio Web UI with org -> project -> video navigation.
- Storyboard versioning (DSL source stored per video version).
- Generation/render job records and polling in the UI.
- S3-backed artifacts for generated script/audio; preview loads from those when available.
- Analytics view for usage/cost events.
- Public share pages for published renders.

**Placeholder / Partial:**
- Chat panel UI is placeholder content (real chat integration pending).
- Video preview shows a fallback script until a generation run produces artifacts.
- Local render agent / Electron job execution is not implemented yet.
- Some UX is still evolving (layouts, resizers, design polish).

---

## Phase-by-Phase Current State (Phases 0–9)

### Phase 0 — Decisions + Guardrails
**Current state**
- Canonical source is TypeScript DSL (`.babulus.ts`), stored as storyboard version text.
- Control plane vs execution plane separation is established in code and docs.

**Gaps / notes**
- Template pack concept is not implemented as a first-class model yet.
- Cloud-resolved sandboxed DSL execution is not in place.

### Phase 1 — Monorepo Skeleton + Tooling
**Current state**
- Monorepo exists with `apps/` and `packages/`:
  - `apps/studio-web` and a minimal `apps/studio-desktop` stub.
  - `packages/dsl`, `packages/renderer`, `packages/shared`, `packages/telemetry`, `packages/ui`.

**Gaps / notes**
- Desktop app is scaffolding only (no active job execution).

### Phase 2 — Unified DSL + Resolver
**Current state**
- DSL types and helpers exist in `packages/dsl`.
- Storyboard source is persisted per video version (GraphQL model).
- Editor uses Monaco for authoring.

**Gaps / notes**
- Web app does not run a secure sandboxed resolver; it relies on generation jobs to produce artifacts.
- Static validation and AST enforcement are not wired into the web editor yet.

### Phase 3 — Player Runtime (Preview)
**Current state**
- Preview uses `@babulus/renderer` Player in the web UI.
- Preview reads `script.json` artifacts from S3 when a generation run succeeds.
- If no artifacts exist, preview uses a fallback script.

**Gaps / notes**
- Live preview from the editor source is not implemented (no client-side DSL resolution).

### Phase 4 — Generation Integration (Audio + Timing)
**Current state**
- Generation runs are modeled in the control plane and queued as jobs.
- S3 artifacts (script/audio/timeline) are used as the preview source when available.

**Gaps / notes**
- Real-time “preview-as-you-edit” is not present; preview updates only after generation.

### Phase 5 — Renderer v0 (Headless Browser + ffmpeg)
**Current state**
- Render runs are modeled and stored.
- Render artifacts (MP4) are stored in S3 and used by publish/share.

**Gaps / notes**
- Toolchain pinning and deterministic render validation are not fully documented/tested yet.

### Phase 6 — SaaS Control Plane (Amplify Gen2)
**Current state**
- Auth via Cognito (Amplify Gen2) with org scoping in the API layer.
- GraphQL operations (org/project/video/version/run/job) are implemented.
- Studio UI uses server actions and the typed GraphQL client.
- Amplify Storage configured with `org/*` and `published/*` access patterns.
- Using `getUrl()` for pre-signed URLs and `downloadData()` for fetching artifacts.

**Project Storage Architecture**
- Projects stored in S3 with path pattern: `org/{orgId}/projects/{projectId}/`
- File organization:
  - `*.babulus.ts` (no underscore) = visible videos
  - `_*.babulus.ts` = shared utilities (hidden from video list)
  - `assets/*` = user-uploaded images, audio, video
- **New: ProjectFile GraphQL model** tracks each file with metadata:
  - `orgId`, `projectId`, `relativePath`, `storageKey`
  - `fileType` ("video", "utility", "asset")
  - `contentType`, `sizeBytes`, `sha256`
- **Security model:**
  1. Server actions validate org membership before file operations
  2. CloudFront distribution with Lambda@Edge validates org access at edge
  3. S3 bucket restricted to CloudFront Origin Access Identity
- **Permanent URLs:** CloudFront provides permanent, cacheable URLs (no expiration)
- Asset model separate - reserved for tracking generated artifacts (audio, renders)

**Gaps / notes**
- ProjectFile model not yet added to schema
- Server actions for secure file CRUD not yet implemented
- Project file listing UI not yet built
- Import resolution for `_helpers.babulus.ts` style includes not yet built.
- Some management surfaces are still thin (admin-level org management, deeper settings).

### Phase 7 — Execution Plane (Cloud Workers + Local Agent)
**Current state**
- Job records and job polling are implemented.
- A reference cloud worker exists in `src/worker-cloud.ts` to process generation/render jobs.

**Gaps / notes**
- Local/Electron render agent is not implemented.

### Phase 8 — Cost Tracking
**Current state**
- Usage events are recorded and visible in the Studio analytics view.
- UI supports visibility modes (credits vs raw cost).

**Gaps / notes**
- Coverage audit needed to ensure all spend paths emit usage events.

### Phase 9 — Publishing Surfaces
**Current state**
- Public share pages exist (`/share/[slug]`).
- Published video records are created and artifacts are copied to public storage.

**Gaps / notes**
- Custom domains and full distribution workflows require validation and hardening.

---

## Alpha Testing Focus (Now)

1) **Preview correctness**
   - Confirm preview uses latest generation artifacts.
   - Validate fallback behavior vs generated data.

2) **Job reliability**
   - Generation and render job queueing works across multiple videos.

3) **Artifact integrity**
   - S3 artifacts are readable and linked correctly.

4) **UI/UX stability**
   - Layout resizers, panes, and editor usability under real usage.

5) **Security / tenancy**
   - Verify org scoping in all reads/writes.

---

## Open Work Toward Beta (Short List)

- Live preview from editor source or fast local preview pipeline.
- Proper chat integration and approval workflows.
- Local/Electron execution path.
- Deterministic render validation + toolchain pinning tests.
- **Project filesystem abstraction:**
  - S3-backed projects for web app (list, read, write via Amplify Storage)
  - Local filesystem for desktop app (same interface, different implementation)
  - Unified API: `listProjectFiles()`, `readProjectFile()`, `writeProjectFile()`
- **File discovery and organization:**
  - List `.babulus.ts` files (exclude `_*` files from video list)
  - Support user uploads to `assets/` subfolder
  - Handle imports from `_helpers.babulus.ts` and similar utilities
- **Execution model:**
  - Client-side: Preview with existing artifacts or lightweight parsing
  - Server-side: Full generation (TTS, audio) and rendering from same source files

