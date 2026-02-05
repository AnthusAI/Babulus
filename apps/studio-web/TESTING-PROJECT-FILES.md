# Testing Project File Storage

This guide covers how to test the new S3 project file storage system with CloudFront URLs.

## Architecture Overview

- **Storage**: S3 bucket via Amplify Storage
- **CDN**: CloudFront distribution with permanent URLs
- **Security**: Lambda@Edge validates org membership
- **Tracking**: ProjectFile GraphQL model tracks metadata

## Testing Options

### Option 1: Automated Script Test (Backend Only)

This tests the storage layer directly without authentication:

```bash
cd apps/studio-web

# You'll need an existing orgId and projectId from your database
tsx scripts/test-project-files.ts <orgId> <projectId>
```

**What it tests:**
- ✓ Upload file to S3
- ✓ List files in project
- ✓ Read file content
- ✓ Generate CloudFront URL
- ✓ Delete file
- ✗ Does NOT test authentication/authorization
- ✗ Does NOT test GraphQL ProjectFile records

### Option 2: Test via Server Actions (Full Stack)

This tests the complete flow including authentication and GraphQL:

1. **Log into the Studio app** at https://studio.babulus.ai (or local dev)

2. **Open browser console** and run:

```javascript
// Import the server actions
const { uploadProjectFileAction, listProjectFilesAction, readProjectFileAction, deleteProjectFileAction }
  = await import('/app/actions/project-files');

// Get your projectId from the URL or database
const projectId = 'your-project-id-here';

// Test upload
const testFile = await uploadProjectFileAction(
  projectId,
  'test-video.babulus.xml',
  `// Test video
export default function TestVideo() {
  return scene('intro', () => {
    text('Hello from S3!');
  });
}`,
  'video',
  'text/typescript'
);
console.log('Uploaded:', testFile);

// Test list
const files = await listProjectFilesAction(projectId);
console.log('Files:', files);
// Should see the test file with a CloudFront URL

// Test read
const content = await readProjectFileAction(projectId, 'test-video.babulus.xml');
console.log('Content:', content);

// Test delete
await deleteProjectFileAction(projectId, 'test-video.babulus.xml');
console.log('Deleted');

// Verify deletion
const filesAfter = await listProjectFilesAction(projectId);
console.log('Files after deletion:', filesAfter);
```

**What it tests:**
- ✓ Full authentication flow
- ✓ Org membership validation
- ✓ S3 upload/read/delete operations
- ✓ GraphQL ProjectFile record creation/deletion
- ✓ CloudFront URL generation
- ✗ Does NOT test Lambda@Edge authorization (requires actual CloudFront request)

### Option 3: Test Lambda@Edge Authorization (Production Only)

This tests the CloudFront security layer:

1. **Get a file URL from Option 2** (the CloudFront URL from `listProjectFilesAction`)

2. **Test authenticated access:**
   ```bash
   # Copy your auth cookie from browser DevTools
   curl -H "Cookie: accessToken=<your-token>" \
     https://<cloudfront-domain>/org/<orgId>/projects/<projectId>/test-video.babulus.xml
   ```
   Should return file content.

3. **Test unauthenticated access:**
   ```bash
   curl https://<cloudfront-domain>/org/<orgId>/projects/<projectId>/test-video.babulus.xml
   ```
   Should return 401 Unauthorized.

4. **Test cross-org access:**
   - Get auth token for User A (member of Org A)
   - Try to access Org B's files
   - Should return 403 Forbidden

**What it tests:**
- ✓ Lambda@Edge authorization
- ✓ JWT validation
- ✓ Org membership enforcement
- ✓ Cross-org isolation

## Manual UI Testing (When Implemented)

Once the UI is built:

1. Create a new project
2. Upload a `.babulus.xml` file via file picker
3. Upload an asset (image/audio) to `assets/` folder
4. View the file list in the project dashboard
5. Click on a video file to edit it
6. Reference an asset in your code: `background('./assets/logo.png')`
7. Preview the video (should load asset via CloudFront URL)

## Environment Variables

The CloudFront domain should be automatically added to `amplify_outputs.json` after deployment:

```json
{
  "custom": {
    "assetsDomain": "d111111abcdef8.cloudfront.net"
  }
}
```

This gets loaded as `process.env.NEXT_PUBLIC_ASSETS_DOMAIN` in the app.

## Troubleshooting

### "Module not found" errors in test script
```bash
cd apps/studio-web
npm install tsx --save-dev
```

### "ASSETS_DOMAIN is undefined"
Check `amplify_outputs.json` was generated. If missing, the backend deployment may have failed.

### CloudFront URLs return 403
- Check Lambda@Edge function is deployed
- Check CloudFront distribution is fully deployed (can take 15-20 minutes)
- Verify auth token is valid

### Files upload but don't appear in list
- Check GraphQL ProjectFile record was created
- Check S3 path matches: `org/{orgId}/projects/{projectId}/{relativePath}`

## Next Steps

After verifying basic operations work:

1. **Add UI** - File upload component in studio dashboard
2. **Add file browser** - Show videos, utilities, and assets
3. **Add editor integration** - Load/save `.babulus.xml` files from S3
4. **Add asset resolution** - Replace `./assets/*` paths with CloudFront URLs at runtime
5. **Add import resolution** - Support `import { helper } from './_helpers.babulus.xml'`
