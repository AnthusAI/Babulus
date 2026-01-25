# Next Steps: Project Storage UI Integration

**Status:** Core storage infrastructure complete (ProjectFile model, S3 + CloudFront + Lambda@Edge, server actions all tested). Ready for UI integration.

**Last Updated:** 2026-01-25

---

## HIGH PRIORITY - What to Do Next

### Step 5: Video Editor Integration 🎯

**Goal:** Enable users to persist video source code to S3 and load it back

**Current State:**
- Video editor exists at `apps/studio-web/components/video-editor.tsx` (649 lines)
- Monaco editor already integrated for `.babulus.ts` editing
- Source code currently stored in `StoryboardVersion.sourceText` (DynamoDB)
- Video → StoryboardVersion relationship (many versions per video)
- `Video.activeStoryboardVersionId` points to current version
- "Generate" button creates new StoryboardVersion, then queues generation job

**Implementation Plan:**

1. **Dual Storage Strategy** (keep both for transition):
   - Continue storing in `StoryboardVersion.sourceText` (existing behavior)
   - ALSO upload to S3 as `ProjectFile` for new file-based workflow
   - This allows gradual migration without breaking existing features

2. **Update `handleGenerate()` in video-editor.tsx** (lines 431-457):
   ```typescript
   const handleGenerate = async () => {
     // EXISTING: Save to StoryboardVersion
     const version = await createStoryboardVersionAction({...});

     // NEW: Also save to S3 as ProjectFile
     const fileName = `${video.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.babulus.ts`;
     await uploadProjectFileAction(
       video.projectId,
       fileName,
       editorCode,
       'video',
       'text/typescript'
     );

     // Continue with existing workflow
     await setActiveStoryboardVersionAction(...);
     await createJobAction(...);
   };
   ```

3. **Add "Save to S3" button** (optional, separate from Generate):
   - New button in video-editor.tsx toolbar
   - Allows saving without triggering generation
   - Calls `uploadProjectFileAction()` directly
   - Shows toast notification on success/failure

4. **Load from S3 on mount** (if ProjectFile exists):
   - Check if ProjectFile exists for this video
   - If yes, load from S3 instead of StoryboardVersion
   - Fallback to StoryboardVersion if no ProjectFile

5. **File naming convention**:
   - Use video title as filename: `video-title.babulus.ts`
   - Sanitize: lowercase, replace spaces/special chars with hyphens
   - Store mapping in Video model: add `sourceFileRelativePath?: string` field

**Files to modify:**
- `apps/studio-web/components/video-editor.tsx` (add S3 save/load)
- `apps/studio-web/amplify/data/resource.ts` (add `sourceFileRelativePath` to Video model)
- `apps/studio-web/app/actions.ts` (ensure project-file actions exported)

---

### Step 6: Project Dashboard UI Updates 🎯

**Goal:** Show users what files exist in their projects

**Current State:**
- Dashboard at `apps/studio-web/components/studio-dashboard.tsx`
- Currently shows videos from `Video` GraphQL model
- Navigation: Org → Project → Videos
- Uses `useVideos()` hook to fetch videos for selected project

**Implementation Plan:**

1. **Add ProjectFile section to dashboard**:
   - New panel showing files from `ProjectFile` model
   - Query: `listProjectFilesAction(selectedProject.id)`
   - Filter: `fileType = "video"` (exclude utilities and assets)
   - Display: filename, size, last modified date

2. **File list UI**:
   ```typescript
   const { files, loading } = useProjectFiles(selectedProject.id);
   const videoFiles = files.filter(f => f.fileType === 'video' && !f.relativePath.startsWith('_'));

   return (
     <div className="file-list">
       {videoFiles.map(file => (
         <FileCard
           key={file.id}
           filename={file.relativePath}
           size={file.sizeBytes}
           lastModified={file.updatedAt}
           onOpen={() => openVideoEditor(file)}
           onDelete={() => deleteFile(file)}
         />
       ))}
     </div>
   );
   ```

3. **Actions on each file**:
   - **Open**: Navigate to video editor with file loaded
   - **Delete**: Call `deleteProjectFileAction()` with confirmation dialog
   - **Rename**: (future) Update ProjectFile record and S3 key

4. **Create new file button**:
   - Dialog prompts for filename
   - Validates filename format (`.babulus.ts`)
   - Creates empty ProjectFile record
   - Opens video editor with default template

5. **Dual view** (transition period):
   - Show both Video-based list (current)
   - AND ProjectFile-based list (new)
   - Label clearly: "Videos (legacy)" vs "Project Files"
   - This allows gradual migration

**Files to modify:**
- `apps/studio-web/components/studio-dashboard.tsx` (add file list)
- `apps/studio-web/lib/use-org-data.ts` (add `useProjectFiles()` hook)
- Create new component: `apps/studio-web/components/project-file-list.tsx`

---

## MEDIUM PRIORITY

### Step 7: Asset Upload UI

**Goal:** Enable users to upload custom assets (images, audio, video) for use in videos

- Drag-and-drop file upload interface
- Upload to `assets/` subfolder with `fileType = "asset"`
- Asset browser/gallery with previews
- Copy asset paths for use in video code

### Step 8: Security Verification

**Goal:** Verify multi-tenant isolation works correctly

- Test cross-org access blocking
- Test path traversal prevention
- Test CloudFront/Lambda@Edge authentication
- Verify GraphQL isolation

---

## LOWER PRIORITY

### Step 9: Import/Utility File Support

**Goal:** Support shared code across multiple video files in a project

- Create `_helpers.babulus.ts` utility files (`fileType = "utility"`)
- Parse import statements in video source
- Fetch and bundle utility file dependencies
- Show utilities separately in dashboard

---

## Architecture Reference

**Storage Infrastructure (COMPLETED):**
- ✅ ProjectFile GraphQL model deployed
- ✅ CloudFront + Lambda@Edge (domain: `delwevc80vpcd.cloudfront.net`)
- ✅ AWS SDK S3 Client with authenticated credentials
- ✅ Server actions: `uploadProjectFileAction()`, `listProjectFilesAction()`, `readProjectFileAction()`, `deleteProjectFileAction()`
- ✅ All operations tested at `/test-storage`

**Documentation:**
- Full architecture: `apps/studio-web/docs/project-storage-architecture.md`
- Vision & planning: `docs/studio-implementation-plan.md`, `docs/saas-electron-plan.md`

---

## How to Start

1. Read the architecture docs first:
   - `apps/studio-web/docs/project-storage-architecture.md`
   - This document (NEXT-STEPS.md)

2. Start with Step 5 (Video Editor Integration):
   - Open `apps/studio-web/components/video-editor.tsx`
   - Find `handleGenerate()` function (lines 431-457)
   - Add S3 upload after StoryboardVersion creation
   - Test with `/test-storage` to verify upload works

3. Test thoroughly:
   - Create video, edit code, click Generate
   - Verify ProjectFile record created in database
   - Verify file uploaded to S3
   - Check `/test-storage` page shows the file

4. Move to Step 6 (Dashboard):
   - Open `apps/studio-web/components/studio-dashboard.tsx`
   - Add new section for ProjectFile list
   - Create `useProjectFiles()` hook
   - Test file listing and actions
