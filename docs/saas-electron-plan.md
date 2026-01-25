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

## Beta Objectives (Short List)

- **CloudFront + Lambda@Edge** for secure, permanent asset URLs
- **ProjectFile GraphQL model** for tracking project files with metadata
- **Server actions** for secure file CRUD with org validation
- **S3 file operations** via Amplify Storage
- **Project file UI** - list, upload, delete files in project dashboard
- **Import resolution** for `_*.babulus.ts` utility files
- Live preview from editor source or fast local preview path
- Deterministic render validation (toolchain pinning + reproducibility tests)
- Real chat integration and approvals
- Dual execution model: client-side preview + server-side generation/render
- Local/Electron workflow (filesystem-backed projects + local render agent)
- Custom domain support for published videos

