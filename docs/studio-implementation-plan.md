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

**Completed:**
- ✅ ProjectFile model added to GraphQL schema
- ✅ Server actions for secure file CRUD (upload, read, delete, list)
- ✅ AWS SDK S3 Client integration with authenticated credentials
- ✅ CloudFront + Lambda@Edge for permanent authenticated URLs
- ✅ Test page validates all file operations
- ✅ Comprehensive architecture documentation with diagrams

**Gaps / notes**
- Project file listing UI not yet integrated into dashboard
- Video editor not yet saving/loading from S3
- Import resolution for `_helpers.babulus.ts` style includes not yet built
- Some management surfaces are still thin (admin-level org management, deeper settings)

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

## Current Work: Project Storage UI Integration

**Status:** Core storage infrastructure complete; UI integration in progress

**Completed Infrastructure:**
- ✅ ProjectFile GraphQL model deployed
- ✅ S3 + CloudFront + Lambda@Edge architecture operational
- ✅ Server actions for file operations with org-level security
- ✅ All operations tested and validated
- ✅ Documentation complete with architecture diagrams

**Next Steps (Priority Order):**

### HIGH PRIORITY - Storage UI Integration

**1. Video Editor Integration** - ✅ PARTIALLY COMPLETE

**Current State:**
- Video editor: `components/video-editor.tsx` (649 lines, Monaco editor integrated)
- Source stored in `StoryboardVersion.sourceText` (DynamoDB)
- Relationship: Video → StoryboardVersion (many versions), `Video.activeStoryboardVersionId` points to current
- "Generate" button: creates StoryboardVersion → queues generation job

**Implementation Status:**
- ✅ DONE: Added import for `uploadProjectFileAction` from `app/actions/project-files`
- ✅ DONE: Modified `handleGenerate()` (lines 432-476) to include S3 upload after StoryboardVersion
- ✅ DONE: Dual storage implemented - StoryboardVersion (existing) + S3 ProjectFile (new)
- ✅ DONE: File naming sanitizes video title → `video-title.babulus.ts`
- ✅ DONE: S3 upload wrapped in try-catch - won't break generation if S3 fails
- ✅ DONE: TypeScript check passed (no new errors introduced)
- ⏳ TODO: Add optional "Save" button (separate from Generate)
- ⏳ TODO: Load from S3 on mount if ProjectFile exists, fallback to StoryboardVersion
- ⏳ TODO: Add `sourceFileRelativePath` field to Video model

**Files Modified:**
- ✅ `components/video-editor.tsx` (S3 save integrated into handleGenerate)

**2. Project Dashboard Updates**

**Current State:**
- Dashboard: `components/studio-dashboard.tsx`
- Shows videos from `Video` GraphQL model
- Uses `useVideos()` hook for selected project

**Implementation:**
- Add ProjectFile section alongside existing Video list
- Query: `listProjectFilesAction(selectedProject.id)`, filter `fileType = "video"`
- Display: filename, size, last modified
- Actions: Open (navigate to editor), Delete (with confirmation)
- Create new file: dialog → validate `.babulus.ts` → create ProjectFile → open editor
- Dual view: "Videos (legacy)" and "Project Files" (transition period)

**Files to modify:**
- `components/studio-dashboard.tsx` (add file list UI)
- `lib/use-org-data.ts` (add `useProjectFiles()` hook)
- Create: `components/project-file-list.tsx` (new component)

### MEDIUM PRIORITY - Enhanced Capabilities

**3. Asset Upload UI**
- Drag-and-drop file upload for images/audio/video
- Upload to `assets/` subfolder with `fileType = "asset"`
- Asset browser/gallery with previews
- Copy asset paths for use in video code

**4. Security Verification**
- Test cross-org access blocking
- Test path traversal prevention
- Test CloudFront/Lambda@Edge authentication
- Verify GraphQL isolation

### LOWER PRIORITY - Advanced Features

**5. Import/Utility File Support**
- Create `_helpers.babulus.ts` utility files (`fileType = "utility"`)
- Parse import statements in video source
- Fetch and bundle utility file dependencies
- Show utilities separately in dashboard

## Additional Beta Work (Beyond Storage)

- Live preview from editor source or fast local preview pipeline
- Proper chat integration and approval workflows
- Local/Electron execution path
- Deterministic render validation + toolchain pinning tests

