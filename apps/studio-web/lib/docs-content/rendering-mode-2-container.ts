import { marked } from "marked";
import type { DocsEntry } from "@/lib/docs-registry";

const content = `
# Mode 2: Container Rendering

Run video rendering in a Docker container locally. Best for testing containerized deploys and ensuring reproducible builds.

## Overview

Container rendering packages the entire render environment (Node.js, Playwright, Chromium, ffmpeg) into a Docker image. This provides consistency across different machines and matches the production Cloud environment.

**Ideal for:**
- Testing containerized deployment locally
- Reproducing production rendering issues
- Running on machines without local dependencies
- Ensuring consistent output across team members

**Not ideal for:**
- Rapid development iteration (slower startup)
- Environments without Docker Desktop
- Low-powered machines (container overhead)

## Prerequisites

### Docker Desktop
Install Docker Desktop for your platform:

- **macOS:** [https://docs.docker.com/desktop/install/mac-install/](https://docs.docker.com/desktop/install/mac-install/)
- **Windows:** [https://docs.docker.com/desktop/install/windows-install/](https://docs.docker.com/desktop/install/windows-install/)
- **Linux:** [https://docs.docker.com/desktop/install/linux-install/](https://docs.docker.com/desktop/install/linux-install/)

Verify installation:
\`\`\`bash
docker --version
docker ps
\`\`\`

## Quick Start

### Step 1: Build the Docker Image

From the repository root:

\`\`\`bash
docker build \\
  --platform linux/amd64 \\
  -t babulus-render-worker:latest \\
  -f Dockerfile .
\`\`\`

**Note for Apple Silicon users:** The \`--platform linux/amd64\` flag is required to match AWS Fargate architecture.

This creates a Docker image with:
- Node.js 20
- Playwright with Chromium
- ffmpeg
- All project dependencies

**Build time:** 5-10 minutes (cached on subsequent builds)

### Step 2: Create a Test Script

Create \`test-container-local.ts\`:

\`\`\`typescript
import { readFileSync } from 'fs';
import { renderVideoFromScript } from './packages/renderer/src/video-render.js';

async function testContainerLocal() {
  console.log('=== Test Container Render ===\\n');

  const videoName = 'my-video';

  // Load generated assets
  const script = JSON.parse(
    readFileSync(\`src/videos/\${videoName}/\${videoName}.script.json\`, 'utf8')
  );
  const timeline = JSON.parse(
    readFileSync(\`src/videos/\${videoName}/\${videoName}.timeline.json\`, 'utf8')
  );

  console.log('Rendering in container...');

  const result = await renderVideoFromScript({
    script,
    timeline,
    audioPath: \`public/babulus/\${videoName}.wav\`,
    outputPath: \`public/babulus/\${videoName}-container.mp4\`,
    framesDir: \`.babulus/temp/frames/\${videoName}-container\`,
    title: \`\${videoName} (Container)\`,
  });

  console.log(\`✓ Rendered: \${result.outputPath}\`);
}

testContainerLocal().catch(console.error);
\`\`\`

### Step 3: Run the Container

Mount local directories and run:

\`\`\`bash
docker run --rm \\
  -v "\$(pwd)/src:/app/src:ro" \\
  -v "\$(pwd)/public:/app/public" \\
  -v "\$(pwd)/test-container-local.ts:/app/test-container-local.ts:ro" \\
  --platform linux/amd64 \\
  babulus-render-worker:latest \\
  npx tsx test-container-local.ts
\`\`\`

**What this does:**
- \`-v "\$(pwd)/src:/app/src:ro"\` - Mount script/timeline files (read-only)
- \`-v "\$(pwd)/public:/app/public"\` - Mount audio input and video output
- \`-v "\$(pwd)/test-container-local.ts:/app/test-container-local.ts:ro"\` - Mount test script
- \`--platform linux/amd64\` - Match cloud platform
- \`npx tsx test-container-local.ts\` - Execute render script

### Step 4: Find Your Video

The rendered video is written to your local filesystem:
\`\`\`
public/babulus/my-video-container.mp4
\`\`\`

## Understanding the Dockerfile

Let's break down what's in the container image:

\`\`\`dockerfile
FROM node:20-bullseye-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    # Playwright/Chromium dependencies
    libnss3 libnspr4 libatk1.0-0 (...) \\
    # ffmpeg for video encoding
    ffmpeg \\
    # Build tools for native modules
    python3 make g++ \\
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# CRITICAL: Set Playwright browser path BEFORE installation
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium --with-deps

# Copy application code
COPY . .

# Create working directory for renders
RUN mkdir -p /app/.babulus/worker

# Default command (ECS mode - will override for local testing)
CMD ["npx", "tsx", "src/worker-ecs.ts"]
\`\`\`

**Key points:**
- **System dependencies:** All libraries Chromium needs to run
- **Playwright browser path:** Ensures browsers install to consistent location
- **All dependencies installed:** Including devDependencies for playwright

## Advanced Usage

### Testing Cloud Integration Locally

You can test the full cloud worker flow locally by providing cloud credentials:

\`\`\`bash
# Export Amplify config
cd apps/studio-web
npx tsx ../../scripts/export-amplify-config.ts

# Run container with cloud access
docker run --rm \\
  -e AWS_REGION=us-east-1 \\
  -e NODE_ENV=production \\
  -e WORKER_EMAIL="render-worker@babulus.internal" \\
  -e WORKER_PASSWORD="your-password" \\
  -e AMPLIFY_OUTPUTS="\$(cat /tmp/amplify_outputs_compact.json)" \\
  -e JOB_ID="your-job-id" \\
  -e WORKER_ID="local-test-\$(date +%s)" \\
  --platform linux/amd64 \\
  babulus-render-worker:latest
\`\`\`

This runs the ECS worker script (\`src/worker-ecs.ts\`) which:
1. Authenticates with Cognito
2. Claims the specified job
3. Downloads generation artifacts from S3
4. Renders the video
5. Uploads MP4 to S3
6. Creates RenderRun record
7. Exits

### Custom Container Configuration

You can modify the Dockerfile for specific needs:

**Change Node.js version:**
\`\`\`dockerfile
FROM node:22-bullseye-slim
\`\`\`

**Add additional tools:**
\`\`\`dockerfile
RUN apt-get install -y imagemagick
\`\`\`

**Increase memory limit:**
\`\`\`bash
docker run --rm \\
  --memory="8g" \\
  -v "\$(pwd)/src:/app/src:ro" \\
  ...
\`\`\`

## Performance Comparison

Comparing container vs. local rendering for a 60-second video:

| Metric | Local (Mode 1) | Container (Mode 2) |
|--------|----------------|-------------------|
| First run | 2m 30s | 3m 15s (+30s startup) |
| Subsequent runs | 2m 30s | 3m 00s (+30s startup) |
| Memory usage | 2-4 GB | 3-5 GB (+Docker overhead) |
| Disk I/O | Direct | Virtualized (slower) |

**Container overhead:**
- ~30 seconds startup time
- ~1 GB extra RAM for Docker
- Slightly slower file I/O (10-20%)

## Troubleshooting

### Error: "The requested image's platform does not match"
**Cause:** Running ARM image on x86 or vice versa

**Solution:** Always specify platform:
\`\`\`bash
docker build --platform linux/amd64 ...
docker run --platform linux/amd64 ...
\`\`\`

### Error: "Playwright browser not found"
**Cause:** \`PLAYWRIGHT_BROWSERS_PATH\` was set after \`npm install\`

**Solution:** Rebuild image. The Dockerfile must set this env var BEFORE running \`npm install\`.

### Error: "Permission denied" when writing output
**Cause:** Container user doesn't have write access to mounted volume

**Solution:** Ensure mounted directories are writable:
\`\`\`bash
chmod -R 777 public/babulus
\`\`\`

Or run container as your user:
\`\`\`bash
docker run --user "\$(id -u):\$(id -g)" ...
\`\`\`

### Container Runs But No Output
**Check container logs:**
\`\`\`bash
docker run \\
  -v "\$(pwd)/src:/app/src:ro" \\
  -v "\$(pwd)/public:/app/public" \\
  babulus-render-worker:latest \\
  npx tsx test-container-local.ts 2>&1 | tee render.log
\`\`\`

### Slow Container Build
**Use build cache:**
\`\`\`bash
# Don't use --no-cache flag
docker build --platform linux/amd64 -t babulus-render-worker:latest -f Dockerfile .
\`\`\`

**Parallel builds:**
\`\`\`bash
DOCKER_BUILDKIT=1 docker build ...
\`\`\`

## Pros & Cons

### Advantages
✅ Identical environment to production (Mode 3)
✅ No local dependency installation
✅ Reproducible across all machines
✅ Isolated from host system
✅ Can test cloud worker locally

### Disadvantages
❌ Slower startup (~30 seconds)
❌ Requires Docker Desktop
❌ Higher memory footprint
❌ Slower iteration cycle vs. Mode 1
❌ Docker expertise required for troubleshooting

## When to Use Container vs. Local

**Use Local (Mode 1) when:**
- Developing new features
- Iterating on styles/animations
- Quick test renders
- You have dependencies installed

**Use Container (Mode 2) when:**
- Testing before deploying to cloud
- Reproducing production issues
- Sharing renders with team (consistent environment)
- Working on multiple machines

## Next Steps

- [Mode 3: Cloud Rendering](/docs/rendering/cloud) - Deploy to AWS
- [Docker Best Practices](/docs/rendering/docker) - Optimize your images
- [Performance Comparison](/docs/rendering/performance) - Detailed benchmarks
`;

export const renderingMode2Doc: DocsEntry = {
  slug: ["rendering", "container"],
  title: "Container Rendering",
  description: "Run rendering in Docker containers locally to match production environment",
  category: "Rendering",
  html: marked.parse(content, { async: false }) as string,
};
