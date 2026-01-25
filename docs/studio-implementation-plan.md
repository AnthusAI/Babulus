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

**Status:** ✅ MAJOR MILESTONE COMPLETE - Full UI integration finished!

**Completed Infrastructure:**
- ✅ ProjectFile GraphQL model deployed
- ✅ S3 + CloudFront + Lambda@Edge architecture operational
- ✅ Server actions for file operations with org-level security
- ✅ All operations tested and validated
- ✅ Documentation complete with architecture diagrams

**✨ Completed in This Session (2026-01-25):**

**Phase 1: Video Editor Integration**
- ✅ Video Editor: Save button with visual feedback (saving/saved/error states)
- ✅ Video Editor: Generate button now also saves to S3 (dual storage)
- ✅ Video Editor: Loads from S3 on mount, falls back to StoryboardVersion

**Phase 2: Dashboard File Management**
- ✅ Dashboard: useProjectFiles() hook for fetching file list
- ✅ Dashboard: ProjectFileList component with view/delete actions
- ✅ Dashboard: Two-column layout showing Videos + Project Files

**Phase 3: Asset Upload & Management**
- ✅ AssetUpload: Drag-and-drop interface with multi-file support
- ✅ AssetBrowser: Gallery view with image thumbnails and file icons
- ✅ AssetManager: Tabbed interface for Browse/Upload
- ✅ Dashboard: Three-column layout (Videos | Files | Assets)
- ✅ Copy-to-clipboard for asset paths

**Phase 4: TypeScript Error Cleanup**
- ✅ Fixed test-storage.tsx type assertions (2 errors)
- ✅ Fixed project-storage.ts File/Blob handling (2 errors)
- ✅ Fixed scripts/list-projects.ts client calls (3 errors)
- ✅ Fixed control-plane-graphql.test.ts type assertions (8 errors)
- ✅ All 15 pre-existing TypeScript errors resolved

**Summary:**
- 7 new components created (video-editor enhancements, file list, asset upload/browser/manager)
- 1 hook added (useProjectFiles)
- 4 files modified (video-editor, dashboard, use-org-data, plan docs)
- 15 TypeScript errors fixed (test files, storage, scripts)
- ✅ ZERO TypeScript errors remaining

**Next Steps (Priority Order):**

### HIGH PRIORITY - Storage UI Integration

**1. Video Editor Integration** - ✅ COMPLETE

**Current State:**
- Video editor: `components/video-editor.tsx` (Monaco editor integrated)
- Dual storage: StoryboardVersion (DynamoDB) + ProjectFile (S3)
- UI: Save button (incremental saves) + Generate button (save + queue job)
- Loading: Prefers S3, falls back to StoryboardVersion

**Implementation Status:**
- ✅ DONE: Added import for `uploadProjectFileAction` and `readProjectFileAction`
- ✅ DONE: Modified `handleGenerate()` to include S3 upload after StoryboardVersion
- ✅ DONE: Dual storage implemented - StoryboardVersion (existing) + S3 ProjectFile (new)
- ✅ DONE: File naming sanitizes video title → `video-title.babulus.ts`
- ✅ DONE: S3 upload wrapped in try-catch - won't break generation if S3 fails
- ✅ DONE: Added standalone "Save" button with visual feedback (saving/saved/error states)
- ✅ DONE: Load from S3 on mount if ProjectFile exists, fallback to StoryboardVersion
- ✅ DONE: TypeScript check passed (no new errors introduced)
- ⏳ TODO: Add `sourceFileRelativePath` field to Video model (optional enhancement)

**Files Modified:**
- ✅ `components/video-editor.tsx` (lines 18, 186, 303-328, 622-644, 648-671)
  - Added imports for S3 actions
  - Added saveStatus state for UI feedback
  - Created handleSave() function for incremental saves
  - Modified handleGenerate() to include S3 upload
  - Updated useEffect to load from S3 first, fallback to StoryboardVersion
  - Added toolbar with Save and Generate buttons

**2. Project Dashboard Updates** - ✅ COMPLETE

**Current State:**
- Dashboard: `components/studio-dashboard.tsx`
- Shows both Video list (legacy) and ProjectFile list (new) side-by-side
- Two-column layout when project selected (responsive: stacks on mobile)

**Implementation Status:**
- ✅ DONE: Created `useProjectFiles()` hook in `lib/use-org-data.ts`
- ✅ DONE: Created `components/project-file-list.tsx` component
- ✅ DONE: Integrated ProjectFileList into dashboard layout
- ✅ DONE: Added file actions: View (eye icon) and Delete (trash icon with confirmation)
- ✅ DONE: Display file metadata: filename, size (KB), last modified (relative time)
- ✅ DONE: Filter to show only video files (exclude utilities starting with `_`)
- ✅ DONE: TypeScript check passed (no new errors)
- ⏳ TODO: Wire up "Open" action to navigate to video editor
- ⏳ TODO: Add "New File" button functionality (currently disabled)

**Files Modified:**
- ✅ `lib/use-org-data.ts` (lines 601-640)
  - Added useProjectFiles() hook with async file loading
- ✅ `components/project-file-list.tsx` (NEW FILE - 118 lines)
  - Complete file list UI with delete functionality
  - Shows filename, size, last modified timestamp
  - Eye icon for viewing, trash icon for deleting
- ✅ `components/studio-dashboard.tsx` (lines 9, 199-218)
  - Added import for ProjectFileList
  - Changed layout to two-column grid (VideoList + ProjectFileList)

### MEDIUM PRIORITY - Enhanced Capabilities

**3. Asset Upload UI** - ✅ COMPLETE

**Current State:**
- Three-column dashboard layout: Videos | Files | Assets
- Drag-and-drop upload interface with file selection fallback
- Asset browser with image previews and file type icons
- Copy-to-clipboard for asset paths (for use in video code)

**Implementation Status:**
- ✅ DONE: Created AssetUpload component with drag-and-drop
- ✅ DONE: Created AssetBrowser component with previews
- ✅ DONE: Created AssetManager wrapper with tabs (Browse/Upload)
- ✅ DONE: Integrated AssetManager into dashboard (third column)
- ✅ DONE: Upload progress indicators (uploading/success/error per file)
- ✅ DONE: File type detection (image/audio/video icons)
- ✅ DONE: Image thumbnails in asset browser
- ✅ DONE: Copy path button (copies `./assets/filename` to clipboard)
- ✅ DONE: Delete asset functionality with confirmation
- ✅ DONE: Open in new tab for preview
- ✅ DONE: TypeScript check passed (no new errors)

**Files Created:**
- ✅ `components/asset-upload.tsx` (166 lines)
  - Drag-and-drop zone with visual feedback
  - Multi-file upload with progress tracking
  - Uploads to `assets/` subfolder with `fileType = "asset"`
- ✅ `components/asset-browser.tsx` (145 lines)
  - Grid view with thumbnails for images
  - File metadata display (size in KB)
  - Copy path, preview, and delete actions
- ✅ `components/asset-manager.tsx` (40 lines)
  - Tabbed interface for Browse/Upload
  - Auto-refresh browser after upload
- ✅ `components/studio-dashboard.tsx` (lines 10, 201-221)
  - Added AssetManager as third column
  - Changed grid to lg:grid-cols-3

**4. Security Verification** - ✅ DOCUMENTED (Manual testing required)

**Current State:**
- Comprehensive security test plan created
- 5 test scenarios documented with implementation examples
- Security checklist with expected behaviors

**Documentation Created:**
- ✅ `docs/security-verification.md` (180 lines)
  - Cross-org access prevention tests
  - Path traversal prevention tests
  - CloudFront authentication tests
  - GraphQL isolation tests
  - File type validation tests

**Test Scenarios:**
1. Cross-Org Access Prevention - Verify users from Org A cannot access Org B files
2. Path Traversal Prevention - Block malicious paths like `../../`
3. CloudFront Authentication - Require valid JWT with org membership
4. GraphQL Isolation - Filter queries by org boundary
5. File Type Validation - Correctly classify and filter video/utility/asset files

**Status:**
- ✅ Test plan documented with pseudo-code
- ✅ Security checklist defined
- ⏳ Manual testing needed (requires two test users in different orgs)
- ⏳ Automated test suite implementation pending

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

