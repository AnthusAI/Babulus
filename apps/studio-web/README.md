# Babulus Studio Web

Next.js-based web application for Babulus Studio with AWS Amplify Gen2 backend.

## Setup

### Prerequisites

- Node.js 18+
- AWS Amplify Gen2 backend deployed
- `amplify_outputs.json` from Amplify Console

### Installation

```bash
npm install
```

### Configuration

1. Download `amplify_outputs.json` from AWS Amplify Console:
   - Go to your Amplify app in the AWS Console
   - Navigate to the deployed branch
   - Click "Download amplify_outputs.json"

2. Place the file in `apps/studio-web/amplify_outputs.json`

3. The app will automatically configure Amplify on startup

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Building

```bash
npm run build
npm start
```

## Architecture

### Authentication

- Uses AWS Cognito for user authentication
- Email-based sign-in with password
- Amplify UI React components for auth UI

### Data Layer

- AWS AppSync GraphQL API
- DynamoDB tables for all entities
- Org-scoped access control via Cognito

### Storage

- S3 bucket for media assets
- Org-scoped access via IAM policies

## File Structure

```
apps/studio-web/
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout with Amplify config
│   ├── page.tsx             # Main studio UI
│   └── globals.css          # Global styles
├── components/              # React components
│   └── authenticator.tsx    # Auth wrapper component
├── lib/                     # Utilities
│   ├── amplify-config.ts    # Amplify initialization
│   └── use-auth.ts          # Auth state hook
├── amplify/                 # Amplify backend definition
│   ├── backend.ts           # Backend entry point
│   ├── auth/                # Cognito config
│   ├── data/                # GraphQL schema
│   └── storage/             # S3 config
└── amplify_outputs.json     # Generated backend config (gitignored)
```

## Next Steps

1. **Auth Integration**: Replace in-memory `userId` with real Cognito user
2. **GraphQL Client**: Add typed GraphQL operations
3. **Org Management**: Create/join orgs via AppSync
4. **Project/Video CRUD**: Wire up to DynamoDB
5. **Asset Upload**: S3 integration for media files
