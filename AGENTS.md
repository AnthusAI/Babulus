# Babulus - TypeScript DSL for Remotion Audio + Timing

## CRITICAL PROTOCOL: GIT COMMITS
**NEVER** commit changes without explicit user approval.
- Always show the user what you have done and ask for confirmation before running `git commit`.
- If the user asks you to "do X", implementing X is your job. Committing X is a separate step that requires separate approval.
- Exception: If the user explicitly says "fix X and commit", you may commit. Otherwise, assume you are in a "review pending" state.

## Brand Theme & Visual Design Policies

*   **Flat Design Only**:
    *   No gradients.
    *   No drop-shadows (unless totally flat/hard).
    *   No borders/outlines on containers or regions.
*   **Contrast & Separation**:
    *   Avoid thin lines (hrules, borders) for separating regions.
    *   Use **varying background colors** on flat rectangles with rounded corners to indicate regions and groupings.
    *   Use contrast carefully; avoid high contrast.
        *   Background black should not be fully black (e.g., use dark gray).
        *   Foreground white should not be fully white.
        *   Use a limited set of official colors: "not-black", "not-white", and 2-3 "muted" colors.
*   **Color System**:
    *   Themes use **Radix Colors** (Cool, Neutral, Warm).
    *   Support both Light and Dark modes.
*   **Typography & Layout**:
    *   Refined elegance, modern Bauhaus-inspired, Apple's modern minimalist Art Deco.
*   **Animations**:
    *   Subtle animation effects are encouraged.
    *   **NO CSS animations** (like Framer Motion) for components that feature in Babulus videos.
    *   Use **frame-parameterized animations**: Animations must be driven by a `frame` parameter so they can be rendered deterministically in videos.
*   **Development Workflow**:
    *   Refer to **Shadcn UI** for default UX design patterns.
    *   Provide examples of basic visual elements in **Storybook stories**.
    *   Do research into best practices for specific tasks.

## Agent autonomy (behavior)
- Proceed independently without stopping to ask permission after each change.
- Keep moving through the plan and report only when there is meaningful progress or a true blocker.
- Only pause for explicit approval when required (e.g., commits or destructive operations).

## What this is

Node/TypeScript CLI tool that compiles `.babulus.ts` DSL files into JSON timing for Remotion, plus generated TTS/SFX/music with environment-aware caching.

## How to run

```bash
# Install (from this repo)
npm install

# Generate audio + timing JSON
npm run babulus -- generate content/<video>.babulus.ts

# Watch mode (auto-regenerate on DSL changes)
npm run babulus -- generate --watch content/<video>.babulus.ts

# Watch all videos in content/ directory
npm run babulus -- generate --watch content/

# Environment-specific generation
BABULUS_ENV=development npm run babulus -- generate content/<video>.babulus.ts
BABULUS_ENV=production npm run babulus -- generate content/<video>.babulus.ts
```

## Key files

- `src/cli.ts` - CLI entry point
- `src/generate.ts` - Core generation logic (TTS/SFX/music)
- `src/dsl/builder.ts` - DSL builders (composition/scene/cue/voice)
- `src/dsl/load.ts` - DSL loader (dynamic import)
- `src/cache-resolver.ts` - Environment-aware cache fallback
- `src/sfx-workflow.ts` - SFX variant selection/archiving
- `.babulus/config.yml` - API keys (ElevenLabs, OpenAI, AWS, Azure)

## Official documentation (HTML source of truth)

The documentation source of truth lives in the Studio Web app (branded HTML, served at `/docs`).

- Docs landing page route: `apps/studio-web/app/(public)/docs/page.tsx`
- Docs router + link rewrite: `apps/studio-web/app/(public)/docs/[...slug]/page.tsx`
- Docs registry (slugs, categories): `apps/studio-web/lib/docs-registry.ts`
- Docs content (HTML strings): `apps/studio-web/lib/docs-content`

## Inputs/Outputs

**Inputs**:
- DSL: `content/<video>.babulus.ts` (scenes, cues, narration, audio clips)
- Config: `.babulus/config.yml` (API credentials)

**Outputs**:
- Script JSON: `src/videos/<video>/<video>.script.json` (timing data for Remotion)
- Timeline JSON: `src/videos/<video>/<video>.timeline.json` (audio tracks)
- Audio: `public/babulus/<video>.wav` (concatenated voiceover)
- Cache: `.babulus/out/<video>/env/<environment>/` (TTS segments, SFX, music)

## Environment-aware caching

Cache structure: `.babulus/out/<video>/env/<environment>/`

Environments: `development`, `aws`, `azure`, `production`, `static`

Fallback chain: development -> aws -> azure -> production -> static

**Why**: Prevents burning through API quotas when switching environments or making DSL edits. Only regenerates changed segments.

## Common tasks

```bash
# Watch mode (all videos)
BABULUS_ENV=development npm run babulus -- generate --watch content/

# Force regenerate everything
npm run babulus -- generate --fresh content/intro.babulus.ts

# Audition SFX variants
npm run babulus -- sfx next --clip whoosh --variants 8
npm run babulus -- sfx prev --clip whoosh --variants 8
npm run babulus -- sfx set --clip whoosh --pick 3

# Clean generated files (environment-aware)
npm run babulus -- clean --yes                          # Current env only
npm run babulus -- clean --env production --yes         # Specific env
npm run babulus -- clean --only-voice --yes            # Only voice
npm run babulus -- clean --only-sfx --only-music --yes # Multiple types
```

---

# Babulus Studio Web (AWS Amplify Gen2)

## Getting amplify_outputs.json

**CRITICAL:** After deploying the Amplify backend, you must download `amplify_outputs.json` to connect your local dev environment to the backend.

### Method 1: Using the Script (Easiest)

```bash
# From repository root
./scripts/get-amplify-outputs.sh <app-id> main
```

**Finding your App ID:**
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/home?region=us-east-1)
2. Click on your app (Babulus)
3. Copy the App ID from the URL (looks like `d3abc123xyz`)

**Example:**
```bash
./scripts/get-amplify-outputs.sh d3abc123xyz main
```

The file will be saved to `apps/studio-web/amplify_outputs.json`.

### Method 2: Manual Download from Console

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/home?region=us-east-1)
2. Select your app (Babulus)
3. Select the branch (main)
4. Click "Hosting" → "Download outputs"
5. Save as `apps/studio-web/amplify_outputs.json`

### Method 3: Using CLI Directly

```bash
cd apps/studio-web
AWS_PROFILE=anthus npx @aws-amplify/backend-cli@latest generate outputs \
  --branch main \
  --app-id <app-id> \
  --profile anthus
```

### Verifying the File

```bash
# Check that it exists and is valid JSON
cat apps/studio-web/amplify_outputs.json | jq .

# Should contain auth, data, and storage config
jq 'keys' apps/studio-web/amplify_outputs.json
# Expected output: ["auth", "data", "storage", "version"]
```

## Studio Development

```bash
# Install dependencies
cd apps/studio-web
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run integration tests (requires amplify_outputs.json)
npm run test:integration
```

## Amplify Deployment

### Automatic (Recommended)

Push to `main` branch triggers automatic deployment:

```bash
git push origin main
```

Check status at: [AWS Amplify Console](https://console.aws.amazon.com/amplify/home?region=us-east-1)

### Manual

```bash
cd apps/studio-web
npm run amplify:deploy
```

## AWS Account Info

- **Profile:** `anthus`
- **Account ID:** 335163751677
- **Region:** us-east-1
- **Amplify App:** Babulus

## Amplify Build Failure Troubleshooting

If the build fails, check these common issues:

1. **Missing amplify_outputs.json during build**
   - The build should handle this gracefully with a try/catch in `lib/amplify-config.ts`
   - If it doesn't, check that the try/catch wrapper exists

2. **TypeScript errors**
   - Check build logs in Amplify Console
   - Run `npm run build` locally to reproduce

3. **Module resolution issues**
   - Ensure ESM imports use `.js` extensions (even for `.ts` files)
   - Check `next.config.mjs` has correct `transpilePackages` config

4. **Missing dependencies**
   - Check that all required packages are in `dependencies` (not devDependencies)
   - Backend packages must be in dependencies for Amplify to install them

## Studio Architecture

- **Backend:** Amplify Gen2 (Cognito + AppSync + DynamoDB + S3)
- **Frontend:** Next.js 14 with App Router
- **Data Layer:** GraphQL via `lib/control-plane-graphql.ts`
- **Storage:** S3 with org-scoped paths via `lib/storage-client.ts`
- **Auth:** Cognito with `lib/use-auth.ts` hook

See [apps/studio-web/README.md](apps/studio-web/README.md) for detailed documentation.
