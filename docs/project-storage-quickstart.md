# Project Storage Quick Start Guide

## For Developers

### Video Editor: Saving Your Work

**Two Ways to Save:**

1. **Save Button** (Incremental)
   - Click "Save" to save current source code to S3
   - Visual feedback: "Saving..." → "Saved!" → returns to "Save"
   - Does NOT trigger generation
   - Use this while editing to save progress

2. **Generate Button** (Full Workflow)
   - Saves to both StoryboardVersion AND S3
   - Queues a generation job
   - Use this when ready to generate audio/artifacts

**File Naming:**
- Videos are automatically saved as `video-title.babulus.ts`
- Spaces and special characters are converted to hyphens
- Example: "My Amazing Video" → `my-amazing-video.babulus.ts`

### Dashboard: Managing Files

**Three Columns:**
1. **Videos** (left) - Traditional video list from GraphQL
2. **Project Files** (center) - New S3-based file list
3. **Assets** (right) - Uploaded media files

**File Actions:**
- 👁️ **View** - Open file in editor (coming soon)
- 🗑️ **Delete** - Remove file (with confirmation)
- 📋 **Copy Path** - Copy asset path for use in code

### Assets: Uploading Media

**Upload Methods:**
1. **Drag & Drop**: Drag files into the upload zone
2. **Select Files**: Click button to browse files

**Supported Types:**
- Images: JPG, PNG, GIF, SVG, WebP
- Audio: MP3, WAV, OGG, M4A, AAC
- Video: MP4, WebM, MOV, AVI

**Using Assets in Code:**
```typescript
import { composition, scene } from '@babulus/dsl';

export default composition('my-video', () => {
  scene('intro', 'Introduction', () => {
    // Copy path from asset browser
    background('./assets/logo.png');
    audio('./assets/background-music.mp3');
  });
});
```

## File Organization

```
org/{orgId}/projects/{projectId}/
├── video-001.babulus.ts         # Visible video file
├── video-002.babulus.ts         # Another video
├── _helpers.babulus.ts          # Utility (hidden from video list)
└── assets/
    ├── logo.png                 # Image asset
    ├── background-music.wav     # Audio asset
    └── intro.mp4                # Video asset
```

**File Types:**
- **Video** (`*.babulus.ts`) - Visible in video list
- **Utility** (`_*.babulus.ts`) - Hidden from video list (for imports)
- **Asset** (`assets/*`) - Media files for use in videos

## Loading Behavior

**Video Editor Load Priority:**
1. Try loading from S3 (`{video-title}.babulus.ts`)
2. If not found, fallback to StoryboardVersion (legacy)
3. If neither exists, use default template

This ensures backward compatibility while migrating to the new system.

## Storage Architecture

**Data Flow:**
```
User Action (Save)
    ↓
Server Action (org validation)
    ↓
S3 Upload (authenticated)
    ↓
ProjectFile Record (GraphQL)
    ↓
CloudFront URL (permanent, authenticated)
```

**Security Layers:**
1. **Server Actions** - Validate org membership
2. **S3 IAM** - Restrict to authenticated users
3. **Lambda@Edge** - Validate JWT at CloudFront edge

## Best Practices

### Development Workflow
1. Open video editor
2. Edit source code
3. Click "Save" frequently (incremental saves)
4. When ready, click "Generate" to create artifacts
5. Check preview in output pane

### Asset Workflow
1. Upload assets to Assets tab
2. Click 📋 Copy button to get path
3. Paste path into video source code
4. Save and generate

### File Management
- Use descriptive video titles (becomes filename)
- Organize assets in `assets/` folder
- Create utilities with `_` prefix for shared code
- Delete unused files to save storage

## Troubleshooting

### Save Button Shows "Error"
- Check network connectivity
- Verify you're authenticated
- Check browser console for details

### Asset Not Loading in Video
- Verify asset path is correct (use copy button)
- Check asset was uploaded successfully
- Ensure path starts with `./assets/`

### File Not Appearing in List
- Refresh the page
- Check file type (utilities starting with `_` are hidden)
- Verify you're in the correct project

### Cross-Org Access Denied
- This is expected behavior (security feature)
- Each org can only access its own files
- Check you're logged into the correct org

## API Reference

### Server Actions

```typescript
// Upload file
await uploadProjectFileAction(
  projectId: string,
  relativePath: string,
  content: string | File | Blob,
  fileType: 'video' | 'utility' | 'asset',
  contentType?: string
);

// List files
const files = await listProjectFilesAction(projectId: string);

// Read file
const content = await readProjectFileAction(
  projectId: string,
  relativePath: string
);

// Delete file
await deleteProjectFileAction(
  projectId: string,
  relativePath: string
);
```

### React Hooks

```typescript
// In components
import { useProjectFiles } from '@/lib/use-org-data';

const { files, loading, error, refetch } = useProjectFiles(projectId);

// Filter by type
const videoFiles = files.filter(f => f.fileType === 'video');
const assetFiles = files.filter(f => f.fileType === 'asset');
```

## Known Limitations

- ⏳ "Open" action in file list not yet wired up
- ⏳ "New File" button is disabled (coming soon)
- ⏳ Import resolution for utility files not implemented
- ⏳ Live preview from editor source not available
- ⏳ Toast notifications not implemented (using console.log)

## Next Features

Coming in future releases:
- Import/utility file support (`import { helper } from './_helpers'`)
- Live preview without generation
- Automated security tests
- File versioning UI
- Collaborative editing
- Template library

## Support

For issues or questions:
- Check browser console for error details
- Verify TypeScript compilation: `npx tsc --noEmit`
- Review security documentation: `docs/security-verification.md`
- Contact: [Your contact info]
