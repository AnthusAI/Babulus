# Babulus Studio / babul.us — Vision + Architecture (Alpha)

**Status:** Alpha (vision validated by initial implementation)
**Purpose:** Describe the product vision and the architecture as it exists today, with realistic scope for alpha/beta.

---

## Product Vision (Still True)

Build an agent-assisted video production system where:
- **Humans** review/approve key checkpoints.
- **Agents** propose edits and automate steps.
- **Babulus** is the timing + audio truth source (narration-first storyboard → audio → timing).
- A **renderer/player** provides deterministic frame-based preview and render outputs.
- **Video + web** share the same component system (single visual system, two outputs).

The UI is **not** a full timeline editor. It is conversational and storyboard-driven:
- Chat drives edits.
- Storyboard organizes scenes/cues.
- Preview shows the result continuously (or after generation in alpha).

---

## Architecture (Current Reality)

### Control plane vs execution plane
- **Control plane (SaaS):** Amplify Gen2 + AppSync + DynamoDB, stores org/project/video/version/run/job state.
- **Execution plane (workers):** generation + render jobs process assets and upload artifacts to S3.

### Project Storage: Unified Filesystem Abstraction
- **Projects are folders** containing `.babulus.ts` files and assets.
- **Web app (SaaS):** Projects live in S3 at `org/{orgId}/projects/{projectId}/`
  - Files tracked in `ProjectFile` GraphQL model for security and metadata
  - CloudFront CDN with permanent URLs (no expiration)
  - Lambda@Edge validates org membership at the edge
  - Server actions validate org membership before all file operations
- **Desktop app (future):** Projects are local folders on disk.
- **Same mental model** for both: list files, read/write, discover videos by filename.
- **Security:** Multi-layer approach:
  1. Application layer validates org access via GraphQL
  2. Lambda@Edge validates org access at CloudFront edge
  3. S3 bucket restricted to CloudFront Origin Access Identity

### File Organization Convention
```
org/{orgId}/projects/{projectId}/
  ├── video-001.babulus.ts       # Visible video (listed in UI)
  ├── video-002.babulus.ts       # Another video
  ├── _helpers.babulus.ts        # Shared code (hidden, starts with _)
  ├── _transitions.babulus.ts    # More utilities (hidden)
  └── assets/
      ├── logo.png               # User uploads
      ├── background.mp4
      └── music.wav
```

- **Videos**: Any `.babulus.ts` file NOT starting with `_`
- **Utilities**: Files like `_helpers.babulus.ts` (can be imported, not shown as videos)
- **Assets**: Images, audio, video files uploaded by users

### Web app (current)
- Next.js + shadcn/ui + custom layout.
- Monaco editor for DSL source.
- Preview uses `@babulus/renderer` Player with generated artifacts.
- Org/project/video navigation and basic org settings.
- **Projects accessed via S3** with pre-signed URLs for file operations.

### Desktop app (future)
- Electron app exists as a stub only.
- Will use **local filesystem** for projects (same folder structure).
- Local job execution and filesystem-backed projects are not implemented yet.

---

## Data Model (Current)

Primary models in the control plane:
- Org, OrgMember, Project, Video
- StoryboardVersion (DSL source text)
- GenerationRun, RenderRun
- Job, JobEvent
- Asset, UsageEvent
- PublishedVideo

### Data Model for Project Files

**New: ProjectFile Model**
Tracks individual files within projects:
- `orgId`, `projectId` - Ownership
- `relativePath` - e.g., "video-001.babulus.ts" or "assets/logo.png"
- `storageKey` - Full S3 path: "org/123/projects/abc/video-001.babulus.ts"
- `fileType` - "video", "utility", or "asset"
- `contentType`, `sizeBytes`, `sha256` - Metadata

**Why track files in GraphQL?**
- Enable secure, auditable file operations
- Filter/query files by type (list only videos, exclude utilities)
- Validate org access at application layer before generating S3 URLs
- Support file metadata (size, checksums, MIME types)

### Asset Model Purpose
The `Asset` model tracks **generated artifacts** (audio, renders, etc.) and links them to generation/render runs. It is separate from `ProjectFile` which tracks source files.

### Project Files vs Generated Artifacts
- **Project files** (`.babulus.ts`, user uploads): Tracked in `ProjectFile` model, stored in S3
- **Generated artifacts** (narration audio, rendered MP4s): Tracked in Asset/GenerationRun/RenderRun models
- Both use S3 paths: `org/{orgId}/projects/{projectId}/` for projects, `org/{orgId}/artifacts/` for outputs

---

## What Is Real vs Placeholder

**Real:**
- SaaS control plane (auth, org scoping, CRUD for core models)
- Generation + render job queues and artifacts
- Preview loading from S3 script artifacts
- Share pages for published videos
- Usage/cost analytics view

**Placeholder/partial:**
- Chat UI (placeholder content)
- Live preview from editor source (not implemented)
- Desktop/local workflows

---

## Project Storage Implementation Status

### ✅ COMPLETED (Phase 6 Storage Infrastructure)

**Backend Infrastructure:**
- ✅ CloudFront + Lambda@Edge for secure, permanent asset URLs
- ✅ ProjectFile GraphQL model deployed and operational
- ✅ Server actions for secure file CRUD with org validation
- ✅ S3 file operations via AWS SDK (authenticated credentials)
- ✅ Multi-layer security model (application + edge + IAM)
- ✅ All operations tested and validated

**Documentation:**
- ✅ Comprehensive architecture documentation at `apps/studio-web/docs/project-storage-architecture.md`
- ✅ Mermaid diagrams for architecture and data flows
- ✅ Security model, API reference, troubleshooting guide
- ✅ Updated main README with storage references

**Technical Details:**
- Uses AWS SDK S3 Client with `fetchAuthSession()` for authenticated Cognito credentials
- CloudFront domain: `delwevc80vpcd.cloudfront.net`
- Lambda@Edge validates JWT tokens and org membership at edge
- Test page at `/test-storage` validates all operations

### ✅ COMPLETED (Storage UI Integration - Session 2026-01-25)

**Video Editor Integration:**
- ✅ Save button with visual feedback (saving/saved/error states)
- ✅ Dual storage: StoryboardVersion (DynamoDB) + ProjectFile (S3)
- ✅ Load from S3 on mount, fallback to StoryboardVersion
- ✅ Generate button now also saves to S3

**Project Dashboard:**
- ✅ useProjectFiles() hook for fetching file list
- ✅ ProjectFileList component with view/delete actions
- ✅ Three-column layout (Videos | Files | Assets)

**Asset Management:**
- ✅ AssetUpload: Drag-and-drop multi-file upload
- ✅ AssetBrowser: Gallery with image thumbnails
- ✅ AssetManager: Tabbed Browse/Upload interface
- ✅ Copy-to-clipboard for asset paths

**Quality:**
- ✅ Fixed all 15 pre-existing TypeScript errors (now 0 errors)
- ✅ Security verification plan documented

---

## 🔴 CRITICAL ALPHA BLOCKERS - Must Complete Next

**Status:** Storage/UI complete. Core video workflow incomplete.

### Priority 1: Generation Pipeline (CRITICAL)

**Problem:** Users can edit code but can't generate TTS audio.

**Investigation Needed:**
- Is `worker-cloud.ts` deployed and processing jobs?
- Are TTS API keys configured?
- Does preview reload with generated audio?

**Success Criteria:**
- User clicks Generate → Job created
- Worker processes job within 10 seconds
- TTS audio generated for each cue
- Artifacts uploaded to S3
- Preview plays with synchronized audio

**Estimated:** 1-2 days if worker exists, 3-4 days if building from scratch

### Priority 2: Render Pipeline (CRITICAL)

**Problem:** No way to produce final MP4 videos.

**What's Missing:**
- Render worker with headless browser + ffmpeg
- Video capture and encoding
- MP4 upload to S3

**Implementation Options:**
- Option A: Lambda + Layers (15min timeout, complex)
- Option B: ECS/Fargate (recommended for alpha - no timeout)

**Success Criteria:**
- User clicks Render → Job created
- Worker records browser video + audio
- ffmpeg encodes to MP4
- User can download rendered video

**Estimated:** 4-5 days

### Priority 3: Publishing (Important)

**Status:** Partially implemented, needs verification

**What's Needed:**
- Verify artifact copying to public S3 path
- Polish share page UI
- Test public access without auth

**Estimated:** 2-3 days

---

## Alpha Testing Readiness

**Current Status:** ~70% ready

**Completed (Infrastructure):**
- ✅ Auth, orgs, projects, videos
- ✅ Editor with Monaco
- ✅ File storage (S3 + CloudFront)
- ✅ Asset upload/management
- ✅ Preview player

**Blocking Alpha (Core Workflow):**
- 🔴 Generation not verified working
- 🔴 Rendering not implemented
- 🟡 Publishing partially done

**Alpha Readiness Checklist:**
- [ ] End-to-end: Edit → Generate → Render → Publish
- [ ] User can produce and share a video
- [ ] TTS audio generation working
- [ ] MP4 rendering working
- [ ] Public share links working

---

### 📋 REMAINING BETA OBJECTIVES (Post-Alpha)

After alpha validation, focus on:

- Live preview from editor source (client-side execution)
- Import resolution for `_*.babulus.ts` utility files
- Asset path resolution in DSL (`./assets/*` → URLs)
- Real chat integration and agent approvals
- Deterministic render validation + toolchain pinning
- Local/Electron workflow (filesystem + local render agent)
- Custom domains for published videos

