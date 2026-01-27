import { marked } from "marked";
import type { DocsEntry } from "@/lib/docs-registry";

const content = `
# Rendering Videos

After generating your video composition (script, timeline, and audio), you need to render it into a final MP4 file. Babulus supports three rendering modes to suit different use cases.

## Overview

| Mode | Use Case | Requirements | Speed | Cost |
|------|----------|--------------|-------|------|
| **Local (No Container)** | Development, testing | Node.js, ffmpeg | Fast | Free |
| **Local Container** | Testing production setup | Docker | Medium | Free |
| **Cloud (ECS Fargate)** | Production at scale | AWS account | Auto-scales | Pay per render |

## Mode 1: Local Rendering (No Container)

**Best for:** Development, testing, and small batch renders on your local machine.

### Requirements

- Node.js 20+
- ffmpeg installed locally
- Playwright (automatically installed with \`npm install\`)

### Quick Start

\`\`\`bash
# Step 1: Generate your composition
cd test-projects/introduction-video
npx babulus generate introduction.babulus.ts

# Step 2: Render locally
npx tsx ../../test-local-render.ts
\`\`\`

### Programmatic Usage

\`\`\`typescript
import { readFileSync } from 'fs';
import { renderVideoFromScript } from './packages/renderer/src/video-render.js';

async function renderVideo() {
  const videoName = 'my-video';
  const script = JSON.parse(readFileSync(\`src/videos/\${videoName}/\${videoName}.script.json\`, 'utf8'));
  const timeline = JSON.parse(readFileSync(\`src/videos/\${videoName}/\${videoName}.timeline.json\`, 'utf8'));

  const result = await renderVideoFromScript({
    script,
    timeline,
    audioPath: \`public/babulus/\${videoName}.wav\`,
    outputPath: \`public/babulus/\${videoName}.mp4\`,
    framesDir: \`.babulus/temp/frames/\${videoName}\`,
    title: 'My Video',
  });

  console.log(\`✓ Rendered: \${result.outputPath}\`);
}
\`\`\`

### Pros & Cons

**Pros:**
- Fast iteration during development
- No Docker/container overhead
- Easy to debug
- Runs on any machine with Node.js

**Cons:**
- Requires local dependencies (ffmpeg, Chromium)
- No isolation from host system
- Not suitable for production at scale

---

## Mode 2: Local Container Rendering

**Best for:** Testing containerized rendering locally, reproducing production issues, or running on machines where you don't want to install dependencies.

### Requirements

- Docker Desktop
- Docker image built locally

### Quick Start

\`\`\`bash
# Step 1: Build the Docker image
docker build --platform linux/amd64 -t babulus-render-worker:latest -f Dockerfile .

# Step 2: Run the container with local files mounted
docker run --rm \\
  -v "\$(pwd)/src:/app/src:ro" \\
  -v "\$(pwd)/public:/app/public" \\
  -v "\$(pwd)/test-container-local.ts:/app/test-container-local.ts:ro" \\
  --platform linux/amd64 \\
  babulus-render-worker:latest \\
  npx tsx test-container-local.ts
\`\`\`

### Environment Variables

When running the container with cloud integration (processing jobs from the database):

\`\`\`bash
docker run --rm \\
  -e AWS_REGION=us-east-1 \\
  -e NODE_ENV=production \\
  -e WORKER_EMAIL="render-worker@babulus.internal" \\
  -e WORKER_PASSWORD="your-password" \\
  -e AMPLIFY_OUTPUTS="\$(cat /tmp/amplify_outputs_compact.json)" \\
  -e JOB_ID="your-job-id" \\
  -e WORKER_ID="local-test-\$(date +%s)" \\
  babulus-render-worker:latest
\`\`\`

### Pros & Cons

**Pros:**
- Identical environment to production
- No local dependency installation needed
- Can test on any machine with Docker
- Isolated from host system

**Cons:**
- Slower startup (container initialization)
- Requires Docker Desktop running
- Larger resource footprint

---

## Mode 3: Cloud Container Rendering (ECS Fargate)

**Best for:** Production rendering at scale, handling long videos, parallel processing of multiple renders.

### Architecture

Cloud rendering uses AWS ECS Fargate to run containerized render workers:

1. User creates a render job (status: \`queued\`)
2. EventBridge trigger Lambda runs every 1 minute
3. Lambda queries for queued render jobs
4. Lambda starts an ECS Fargate task for each job
5. ECS task processes the render and exits
6. Fargate automatically provisions resources and tears down after completion

### Infrastructure Components

- **ECR Repository**: Stores Docker images
- **ECS Cluster**: Runs Fargate tasks (4 vCPU, 16GB RAM per task)
- **Task Definition**: Container configuration with environment variables
- **VPC**: Private subnets with NAT gateway
- **Lambda Trigger**: Polls for jobs and starts tasks
- **CloudWatch Logs**: Captures worker output

### Creating a Render Job

Via the API:

\`\`\`typescript
import { generateClient } from 'aws-amplify/data';

const client = generateClient({ authMode: 'userPool' });

const { data: job } = await client.models.Job.create({
  kind: 'render',
  status: 'queued',
  orgId: 'your-org-id',
  inputJson: JSON.stringify({
    generationRunId: 'your-generation-run-id'
  })
});

console.log(\`Created render job: \${job.id}\`);
\`\`\`

### Monitoring

Check ECS tasks:

\`\`\`bash
aws ecs list-tasks \\
  --cluster babulus-render-cluster \\
  --region us-east-1
\`\`\`

View logs:

\`\`\`bash
aws logs tail "amplify-...-RenderTaskDefinition..." \\
  --region us-east-1 \\
  --follow
\`\`\`

### Pros & Cons

**Pros:**
- Scales automatically (up to 10 concurrent tasks)
- No server management
- Pay only for task runtime
- Handles long-running renders (no timeout limits)
- Isolated execution environment per job
- CloudWatch monitoring and logging

**Cons:**
- Cold start time (task provisioning: ~2 minutes)
- Requires AWS infrastructure
- More complex setup
- Costs more per render than local

---

## Troubleshooting

### Local Rendering

**Error: \`Cannot find module './packages/renderer/src/video-render.js'\`**
- Make sure you're in the repo root directory
- Run \`npm install\` to ensure dependencies are installed

**Error: \`ffmpeg: command not found\`**
- Install ffmpeg: \`brew install ffmpeg\` (macOS) or download from [ffmpeg.org](https://ffmpeg.org)

**Error: \`Playwright browser not found\`**
- Run \`npx playwright install chromium --with-deps\`

### Container Rendering

**Error: \`The requested image's platform does not match\`**
- Add \`--platform linux/amd64\` to docker run command (if on Apple Silicon)

**Error: \`Auth UserPool not configured\`**
- Check that \`AMPLIFY_OUTPUTS\` environment variable is properly formatted JSON
- Verify amplify_outputs.json contains auth configuration

### Cloud Rendering

**Task fails immediately with exit code 1**
- Check CloudWatch logs for the task
- Common issues: empty AMPLIFY_OUTPUTS, invalid credentials, missing S3 permissions

**Lambda trigger not starting tasks**
- Check Lambda logs for errors
- Verify EventBridge rule is enabled
- Ensure Lambda has \`ecs:RunTask\` and \`iam:PassRole\` permissions

**Task stuck in PENDING**
- Check VPC/subnet configuration
- Verify security group allows outbound traffic
- Check NAT gateway is attached to private subnets

---

## Next Steps

- [Project Storage](/docs/project-storage/quickstart) - Learn how generation artifacts are stored
- [Worker Job Spec](/docs/worker-job-spec) - Understand the job processing pipeline
- [Environments](/docs/environments) - Configure different rendering environments
`;

export const renderingGuideDoc: DocsEntry = {
  slug: ["rendering-guide"],
  title: "Rendering Videos",
  description: "Learn how to render your videos locally, in containers, or in the cloud with ECS Fargate",
  category: "Getting Started",
  html: marked.parse(content, { async: false }) as string,
};
