# Testing Babulus Rendering Modes

This guide explains how to test all three rendering modes with the new preview feature.

## Prerequisites

### All Modes
- Node.js 20+
- ffmpeg installed (`brew install ffmpeg` on macOS)

### Mode 2 & 3
- Docker Desktop (for Mode 2)
- AWS CLI configured with `anthus` profile (for Mode 3)
- Intro video assets in `../Tactus-web/`:
  - `intro.script.json`
  - `intro.timeline.json`
  - `intro.wav`
  - `browser-components.js`

## Mode 1: Local (No Container)

**Best for:** Fast iteration during development

### Full Render
```bash
npx tsx test-local-render.ts
```

### Preview Render (Fast!)
```bash
# First 2 seconds at 15fps (default)
npx tsx test-local-render.ts --preview

# Middle section (15-17 seconds)
npx tsx test-local-render.ts --preview --offset 15 --duration 2

# Custom: 5 seconds from 10s mark at 10fps
npx tsx test-local-render.ts --preview --offset 10 --duration 5 --fps 10
```

**Output:** Video automatically opens for review after rendering.

---

## Mode 2: Local Container

**Best for:** Testing production environment locally

### Build Container
```bash
docker build -t babulus-render-worker:latest -f Dockerfile .
```

### Full Render
```bash
docker run --rm \
  -v "$(pwd):/workspace" \
  -v "$(cd ../Tactus-web && pwd):/tactus-web:ro" \
  -w /workspace \
  babulus-render-worker:latest \
  npx tsx test-container-local.ts
```

### Preview Render
```bash
docker run --rm \
  -v "$(pwd):/workspace" \
  -v "$(cd ../Tactus-web && pwd):/tactus-web:ro" \
  -w /workspace \
  babulus-render-worker:latest \
  npx tsx test-container-local.ts --preview
```

**Open Output:**
```bash
open public/babulus/intro-container.mp4          # Full render
open public/babulus/intro-container-preview.mp4  # Preview render
```

---

## Mode 3: AWS ECS Fargate

**Best for:** Production rendering at scale

### Deploy Infrastructure (First Time)

```bash
# 1. Deploy Amplify backend
cd apps/studio-web
npx ampx deploy --branch main

# 2. Build and push Docker image
cd ../..
AWS_PROFILE=anthus AWS_REGION=us-east-1 ./scripts/build-render-worker.sh

# 3. Redeploy to populate AMPLIFY_OUTPUTS
cd apps/studio-web
npx ampx deploy --branch main
```

### Create Test Job

```bash
# Upload intro assets to S3 and create GenerationRun
npx tsx scripts/upload-test-assets-to-s3.ts
# Output: ✓ Created GenerationRun: <generation-run-id>

# Create render job
npx tsx test-ecs-direct.ts <generation-run-id>
# Output: ✓ Created render job: <job-id>
```

### Monitor Execution

```bash
# Lambda trigger runs every 1 minute, or invoke manually:
aws lambda invoke \
  --function-name <render-trigger-function-name> \
  --region us-east-1 \
  /tmp/response.json \
  --profile anthus

# Watch logs
aws logs tail "/aws/lambda/<render-trigger-function-name>" --follow --profile anthus
aws logs tail "<ecs-task-log-group>" --follow --profile anthus
```

### Download and Review

```bash
# Find the output in S3
aws s3 ls s3://<bucket>/org/test-org/videos/<video-id>/renders/ --profile anthus

# Download
aws s3 cp s3://<bucket>/org/test-org/videos/<video-id>/renders/<render-run-id>/output.mp4 \
  ./test-output.mp4 \
  --profile anthus

# Open
open ./test-output.mp4
```

---

## Preview Mode Details

### Parameters

- `--preview`: Enable preview mode (required for preview)
- `--offset N`: Start time in seconds (default: 0)
- `--duration N`: Duration in seconds (default: 2)
- `--fps N`: Frame rate (default: 15, vs 30 for full render)

### Examples

```bash
# First 2 seconds (great for title screen)
--preview

# Skip intro, render 3 seconds from middle
--preview --offset 30 --duration 3

# End credits preview
--preview --offset 55 --duration 5

# Very fast test (10fps)
--preview --fps 10 --duration 1
```

### Performance

- **Full render**: 5-10 minutes for 60 second video
- **Preview (2s at 15fps)**: 10-20 seconds
- **Frame count**: Preview = ~30 frames vs Full = ~1800 frames

---

## Troubleshooting

### "Cannot find module" errors
- Run `npm install` in project root
- Ensure all packages are built: `npm run build`

### Docker build fails
- Ensure Docker Desktop is running
- Check available disk space (image is ~3.5GB)

### ECS tasks fail
- Check CloudWatch logs for specific errors
- Verify AMPLIFY_OUTPUTS is populated (second deployment required)
- Ensure ECR image is pushed: `aws ecr list-images --repository-name babulus-render-worker --profile anthus`

### Video doesn't open automatically
- macOS only feature (uses `open` command)
- Manually open the file from the path shown in output

---

## Infrastructure Status

Check deployment status:
```bash
aws amplify list-jobs --app-id d3epcqvzbxdaq --branch-name main --region us-east-1 --profile anthus --max-results 1
```

Check ECS tasks:
```bash
aws ecs list-tasks --cluster babulus-render-cluster --region us-east-1 --profile anthus
```

Check Lambda logs:
```bash
aws logs tail "/aws/lambda/<function-name>" --follow --region us-east-1 --profile anthus
```
