# Babulus Studio Web

Next.js application for the Babulus Studio - a frame-driven video preview and generation interface with AWS Amplify Gen2 backend.

## Architecture

### Backend (AWS Amplify Gen2)

- **Auth:** Cognito User Pool with email/password authentication
- **Data:** AppSync GraphQL API with 16 models (Org, Project, Video, Job, Asset, **ProjectFile**, etc.)
- **Storage:** S3 bucket with org-scoped access patterns + CloudFront CDN
- **Database:** DynamoDB tables (auto-provisioned per model)
- **CDN:** CloudFront distribution with Lambda@Edge for authenticated asset delivery

### Frontend (Next.js 14)

- **Framework:** Next.js with App Router
- **UI:** React with Amplify UI components
- **Rendering:** Browser-based video preview with @babulus/renderer
- **State:** Server Actions for data fetching, React hooks for UI state

### 📚 Detailed Architecture Documentation

- **Project Storage Architecture** - Complete guide to S3 storage, CloudFront CDN, Lambda@Edge authentication, and multi-tenant security model
  - Web docs: `/docs/project-storage/architecture`
  - Source: `lib/docs-content/project-storage-architecture.ts`

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Amplify Outputs (After Backend Deployment)

After the Amplify backend is deployed, download the configuration:

```bash
# From repository root
./scripts/get-amplify-outputs.sh <app-id> main
```

Replace `<app-id>` with your Amplify App ID from the AWS Console.

Alternatively, download manually:
1. Go to AWS Amplify Console
2. Select your app (Babulus)
3. Go to Hosting → Download outputs
4. Save as `apps/studio-web/amplify_outputs.json`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the studio.

## Testing

### Integration Tests

Run tests against the deployed Amplify backend:

```bash
npm run test:integration
```

**Prerequisites:**
- `amplify_outputs.json` must exist
- Cognito User Pool must have auto-confirm enabled (or manually confirm test users)

## Amplify Sandbox

Run a local Amplify sandbox environment (requires AWS credentials):

```bash
npm run amplify:sandbox
```

This creates an ephemeral backend stack for development.

## Deploy

### Manual Deployment

Deploy backend and frontend:

```bash
npm run amplify:deploy
```

### Automatic Deployment (Recommended)

Push to the `main` branch on GitHub. Amplify automatically:
1. Provisions backend (Cognito, AppSync, DynamoDB, S3)
2. Builds frontend (Next.js)
3. Deploys to CloudFront
4. Generates `amplify_outputs.json`

## Project Structure

```
apps/studio-web/
├── amplify/              # Amplify Gen2 backend configuration
│   ├── backend.ts        # Backend entry point
│   ├── auth/            # Cognito auth config
│   ├── data/            # GraphQL schema (15 models)
│   └── storage/         # S3 storage config
├── app/                 # Next.js app router
│   ├── layout.tsx       # Root layout (configures Amplify)
│   ├── page.tsx         # Main studio UI
│   └── actions.ts       # Server Actions (GraphQL bridge)
├── lib/                 # Shared utilities
│   ├── amplify-config.ts           # Amplify configuration
│   ├── control-plane-graphql.ts    # GraphQL client adapter
│   ├── storage-client.ts           # S3 storage operations
│   ├── use-auth.ts                 # Auth hook
│   ├── use-org-data.ts             # Data fetching hooks
│   └── README-GraphQL-Integration.md  # Integration guide
├── components/          # React components
│   └── authenticator.tsx  # Auth wrapper
└── tests/              # Integration tests
    └── control-plane-graphql.test.ts
```

## Key Files

### Backend Configuration

- **[amplify/data/resource.ts](amplify/data/resource.ts)** - GraphQL schema with 15 models
- **[amplify/auth/resource.ts](amplify/auth/resource.ts)** - Cognito User Pool config
- **[amplify/storage/resource.ts](amplify/storage/resource.ts)** - S3 bucket with org-scoped access

### GraphQL Integration

- **[lib/control-plane-graphql.ts](lib/control-plane-graphql.ts)** - GraphQL client that replaces in-memory store
- **[app/actions.ts](app/actions.ts)** - Server Actions for client components
- **[lib/use-org-data.ts](lib/use-org-data.ts)** - React hooks (useOrgs, useProjects, useVideos, etc.)

### Storage Operations

- **[lib/project-storage.ts](lib/project-storage.ts)** - S3 operations via AWS SDK
  - Upload/download files using authenticated credentials
  - Server-side only (uses Next.js server actions)
  - Org-scoped paths: `org/{orgId}/projects/{projectId}/...`
- **[app/actions/project-files.ts](app/actions/project-files.ts)** - Secure server actions for file operations
  - Verifies org membership before any S3 operation
  - Tracks file metadata in ProjectFile GraphQL model
  - See Project Storage Architecture docs:
    - Web docs: `/docs/project-storage/architecture`
    - Source: `lib/docs-content/project-storage-architecture.ts`

### CloudFront + Lambda@Edge

- **[amplify/edge-functions/auth/](amplify/edge-functions/auth/)** - Lambda@Edge for authenticated asset delivery
  - Validates JWT tokens at CloudFront edge
  - Checks org membership before serving files
  - Enables permanent URLs with edge security

## Usage Examples

### Server Actions (in Client Components)

```typescript
import { getOrgsForUser, createProjectAction } from "./actions";

// In component:
const { userId, orgs } = await getOrgsForUser();
const project = await createProjectAction(
  { name: "My Project" },
  orgs[0].id
);
```

### React Hooks

```typescript
import { useOrgs, useProjects, useVideos } from "../lib/use-org-data";

function MyComponent() {
  const { orgs, loading } = useOrgs();
  const { projects } = useProjects(orgs[0]?.id);
  const { videos } = useVideos(orgs[0]?.id, projects[0]?.id);

  if (loading) return <div>Loading...</div>;
  return <div>{/* Render UI */}</div>;
}
```

### Project File Storage

```typescript
import {
  uploadProjectFileAction,
  listProjectFilesAction,
  readProjectFileAction,
  deleteProjectFileAction
} from "../app/actions/project-files";

// Upload a file
const file = await uploadProjectFileAction(
  projectId,
  'video-001.babulus.ts',
  '// Babulus source code...',
  'video',
  'text/typescript'
);

// List files in a project
const files = await listProjectFilesAction(projectId);
// Returns files with CloudFront URLs

// Read file content
const content = await readProjectFileAction(projectId, 'video-001.babulus.ts');

// Delete file
await deleteProjectFileAction(projectId, 'video-001.babulus.ts');
```

See Project Storage Architecture docs for complete API documentation:
- Web docs: `/docs/project-storage/architecture`
- Source: `lib/docs-content/project-storage-architecture.ts`

## Environment Variables

No environment variables required! Configuration is loaded from `amplify_outputs.json`.

## Deployment Status

The build will succeed even without `amplify_outputs.json`. The app falls back to an in-memory control-plane store for development.

Once deployed, Amplify provides:
- Backend API URL
- Cognito User Pool ID
- S3 Bucket name
- All stored in `amplify_outputs.json`

## Development Workflow

### With Backend (Production Mode)

1. Ensure `amplify_outputs.json` exists
2. Run `npm run dev`
3. App connects to real Cognito/AppSync/S3
4. Data persists to DynamoDB

### Without Backend (Local Mode)

1. Remove or rename `amplify_outputs.json`
2. Run `npm run dev`
3. App uses in-memory control-plane store
4. Data resets on page refresh

## Troubleshooting

### Build fails with "Module not found: amplify_outputs.json"

The build is configured to handle missing `amplify_outputs.json` gracefully. If you see this error:

1. Ensure `lib/amplify-config.ts` has the try/catch wrapper
2. Clear Next.js cache: `rm -rf .next`
3. Rebuild: `npm run build`

### Integration tests fail with "User not authenticated"

1. Check `amplify_outputs.json` exists
2. Verify Cognito User Pool has auto-confirm enabled
3. Or manually confirm test users via AWS Console

### Storage upload fails with "Access Denied"

1. Check storage resource allows authenticated access: `org/*`
2. Verify user is authenticated (check Cognito session)
3. Ensure storage key follows pattern: `org/{orgId}/...`
