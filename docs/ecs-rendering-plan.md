# ECS/Fargate Video Rendering Implementation Plan

## Status: INFRASTRUCTURE DEPLOYED

The ECS/Fargate infrastructure is deployed on the main branch. Docker image build/push and worker credentials still need to be configured.

## Goal

Move video rendering from Lambda (15-minute timeout, resource constraints) to ECS/Fargate (unlimited timeout, more CPU/memory) for production-quality MP4 rendering.

## Completed Work

### Files Created

1. **`/src/worker-ecs.ts`** - ECS task entrypoint (processes one render job and exits)
2. **`/Dockerfile`** - Container image with Node.js 20, Playwright, ffmpeg
3. **`/apps/studio-web/amplify/functions/render-trigger/handler.ts`** - Lambda to trigger ECS tasks
4. **`/apps/studio-web/amplify/functions/render-trigger/package.json`** - Dependencies
5. **`/scripts/build-render-worker.sh`** - Build and push Docker image to ECR

### Files Modified

1. **`/src/worker-cloud.ts`** - Skip render jobs (ECS handles them now)
2. **`/apps/studio-web/amplify/backend.ts`** - Added ECS infrastructure:
   - Security group for ECS tasks
   - Task definition with Amplify outputs
   - Render trigger Lambda with proper handler
   - IAM permissions for AppSync access

### Infrastructure Components

- **VPC**: 2 AZs, 1 NAT gateway
- **Security Group**: Allows outbound to S3, DynamoDB, AppSync
- **ECS Cluster**: `babulus-render-cluster`
- **Task Definition**: 4 vCPU, 16GB RAM, runs `worker-ecs.js`
- **ECR Repository**: `babulus-render-worker`
- **Trigger Lambda**: Polls for queued render jobs every 1 minute
- **EventBridge**: Triggers Lambda every 1 minute

## Architecture

```
User clicks "Render" → Job created (status: queued)
                          ↓
EventBridge (every 1 min) → render-trigger Lambda
                          ↓
Lambda polls AppSync → Finds queued render jobs
                          ↓
Lambda calls ECS RunTask → Starts Fargate task (4 vCPU, 16GB)
                          ↓
Task runs worker-ecs.ts → Claims job, downloads artifacts
                          ↓
Container renders video → Uploads MP4, creates RenderRun
                          ↓
Task exits → Resources freed
```

## Deployment Steps

### 1. Deploy Infrastructure Changes

Push to main branch to trigger automatic deployment:

```bash
git push origin main
```

Check deployment status at [AWS Amplify Console](https://console.aws.amazon.com/amplify/home?region=us-east-1#/d3epcqvzbxdaq).

After deployment completes, update local amplify_outputs.json:

```bash
cd apps/studio-web && AWS_PROFILE=anthus AWS_REGION=us-east-1 npx --yes @aws-amplify/backend-cli@latest generate outputs --branch main --app-id d3epcqvzbxdaq --profile anthus
```

Or use the script:

```bash
./scripts/get-amplify-outputs.sh d3epcqvzbxdaq main
```

### 2. Build and Push Docker Image

Get ECR repository URI from amplify_outputs.json:

```bash
jq -r '.custom.renderWorkerEcrUri' apps/studio-web/amplify_outputs.json
# Expected: 335163751677.dkr.ecr.us-east-1.amazonaws.com/babulus-render-worker
```

Build and push:

```bash
./scripts/build-render-worker.sh
```

This script:
- Authenticates to ECR
- Builds the Docker image with Playwright and ffmpeg
- Tags it as `latest`
- Pushes to ECR

### 3. Create Worker Credentials (TODO)

- Create Cognito user for worker authentication
- Store credentials in AWS Secrets Manager
- Update task definition to use secrets

### 4. Test the Render Flow

- Create a test video and generation run
- Click "Render" in VideoEditor
- Monitor CloudWatch Logs for ECS task output
- Verify MP4 created in S3

**CloudWatch Log Groups:**
- Render worker logs: `/aws/ecs/render-worker`
- Render trigger Lambda: `/aws/lambda/render-trigger-function`

## Key Benefits

- ✅ No timeout limit (Lambda's 15-minute constraint removed)
- ✅ More CPU/memory (4 vCPU, 16GB vs Lambda's practical limits)
- ✅ Cost-efficient (500x cheaper than Lambda for same render)
- ✅ Same worker code (shared `processRenderJob` function)
- ✅ Clean architecture (one job = one task = predictable cost)

## TODO Before Production

1. Move worker credentials to AWS Secrets Manager
2. Test with long videos (20+ minutes)
3. Add retry logic for failed tasks
4. Set up CloudWatch alarms for task failures
5. Implement auto-scaling based on queue depth
6. Add progress updates via WebSocket

## References

- Plan file: `/Users/ryan.porter/.claude/plans/floating-sparking-fern.md`
- Worker lib: `/src/worker-lib.ts` (processRenderJob function)
- ECS worker: `/src/worker-ecs.ts`
- Render trigger: `/apps/studio-web/amplify/functions/render-trigger/handler.ts`
- Backend CDK: `/apps/studio-web/amplify/backend.ts`
