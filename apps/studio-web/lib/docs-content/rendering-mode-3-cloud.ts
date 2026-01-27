import { marked } from "marked";
import type { DocsEntry } from "@/lib/docs-registry";

const content = `
# Mode 3: Cloud Rendering

Run video rendering at scale on AWS Fargate. Best for production deployments, long videos, and parallel batch processing.

## Overview

Cloud rendering uses AWS ECS Fargate to run containerized render workers in the cloud. Each render job gets its own isolated task with dedicated resources (4 vCPU, 16GB RAM).

**Ideal for:**
- Production video rendering at scale
- Long videos (5+ minutes)
- Parallel batch processing (10+ concurrent renders)
- Hands-off automated rendering
- No local compute resource consumption

**Not ideal for:**
- Development and testing (use Mode 1)
- Immediate render results (2-minute cold start)
- Cost-sensitive small batches (Lambda cheaper for short videos)

## How It Works

Cloud rendering follows this workflow:

\`\`\`
1. User clicks "Render" in UI
   ↓
2. Job record created (status: queued)
   ↓
3. EventBridge trigger (every 1 minute)
   ↓
4. Lambda polls for queued jobs
   ↓
5. Lambda starts ECS Fargate task
   ↓
6. Task provisions (~ 2 minutes)
   ↓
7. Container starts, runs worker
   ↓
8. Worker processes render job
   ↓
9. MP4 uploaded to S3
   ↓
10. RenderRun record created
   ↓
11. Task exits, resources released
\`\`\`

## Architecture Components

### 1. ECR Repository
Stores Docker images for render workers.

- **Name:** \`babulus-render-worker\`
- **Region:** \`us-east-1\`
- **Retention:** Images retained on stack deletion

### 2. VPC & Networking
Private network for task execution.

- **Configuration:** 2 availability zones, 1 NAT gateway
- **Subnets:** Private subnets with NAT for internet access
- **Security:** Outbound-only, no inbound connections

### 3. ECS Cluster
Orchestrates Fargate task execution.

- **Name:** \`babulus-render-cluster\`
- **Type:** ECS with Fargate launch type
- **Container Insights:** Enabled for monitoring

### 4. Task Definition
Defines container configuration.

- **CPU:** 4 vCPU (4096 units)
- **Memory:** 16 GB (16384 MB)
- **Image:** Latest from ECR
- **Entrypoint:** \`src/worker-ecs.ts\`

### 5. Render Trigger Lambda
Polls for jobs and starts tasks.

- **Trigger:** EventBridge schedule (every 1 minute)
- **Runtime:** Node.js 20
- **Timeout:** 30 seconds
- **IAM:** Permissions to run ECS tasks, query AppSync

### 6. CloudWatch Monitoring
Tracks worker health and performance.

- **Alarms:** High error rate, long execution, no completions
- **Dashboard:** Lambda invocations, task metrics, errors
- **Log Retention:** 1 week

## Prerequisites

### AWS Account
You need an AWS account with:
- ECS Fargate enabled
- Sufficient service quotas (10 concurrent tasks)
- Permissions to create VPC, ECS, Lambda resources

### Docker Image
The render worker image must be built and pushed to ECR:

\`\`\`bash
# Build image
docker build --platform linux/amd64 -t babulus-render-worker:latest -f Dockerfile .

# Tag for ECR
docker tag babulus-render-worker:latest \\
  335163751677.dkr.ecr.us-east-1.amazonaws.com/babulus-render-worker:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | \\
  docker login --username AWS --password-stdin \\
  335163751677.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push 335163751677.dkr.ecr.us-east-1.amazonaws.com/babulus-render-worker:latest
\`\`\`

### Infrastructure Deployed
The ECS infrastructure must be deployed via Amplify Gen 2:

\`\`\`bash
cd apps/studio-web
npx ampx sandbox
\`\`\`

Or deployed to production by pushing to the \`main\` branch (Amplify Hosting auto-deploys).

## Creating Render Jobs

### Via API

Use the Amplify Data client to create a job:

\`\`\`typescript
import { generateClient } from 'aws-amplify/data';

const client = generateClient({ authMode: 'userPool' });

// Create render job
const { data: job, errors } = await client.models.Job.create({
  kind: 'render',
  status: 'queued',
  orgId: 'your-org-id',
  inputJson: JSON.stringify({
    generationRunId: 'your-generation-run-id'  // Links to generated assets
  })
});

if (errors) {
  console.error('Failed to create job:', errors);
} else {
  console.log(\`Created render job: \${job.id}\`);
}
\`\`\`

### Via GraphQL

Direct GraphQL mutation:

\`\`\`graphql
mutation CreateRenderJob {
  createJob(input: {
    kind: "render"
    status: "queued"
    orgId: "your-org-id"
    inputJson: "{\\"generationRunId\\":\\"gen-123\\"}"
  }) {
    id
    status
    createdAt
  }
}
\`\`\`

## Monitoring Render Jobs

### Check ECS Tasks

List running tasks:

\`\`\`bash
aws ecs list-tasks \\
  --cluster babulus-render-cluster \\
  --region us-east-1
\`\`\`

Get task details:

\`\`\`bash
aws ecs describe-tasks \\
  --cluster babulus-render-cluster \\
  --tasks <task-arn> \\
  --region us-east-1
\`\`\`

### View Logs

Task logs are in CloudWatch:

\`\`\`bash
aws logs tail "amplify-...-RenderTaskDefinition..." \\
  --region us-east-1 \\
  --follow
\`\`\`

Lambda trigger logs:

\`\`\`bash
aws logs tail "/aws/lambda/amplify-...-RenderTriggerFunction..." \\
  --region us-east-1 \\
  --follow
\`\`\`

### CloudWatch Dashboard

Access the pre-configured dashboard:

1. Open AWS Console
2. Navigate to CloudWatch → Dashboards
3. Select \`babulus-generation-worker\`
4. View metrics for invocations, errors, duration, throttles

## Cost Analysis

Cloud rendering costs are based on task runtime:

**Pricing (us-east-1):**
- **vCPU:** $0.04048 per vCPU per hour
- **Memory:** $0.004445 per GB per hour

**Per-task cost (4 vCPU, 16GB RAM):**
- vCPU: 4 × $0.04048 = $0.16192/hour
- Memory: 16 × $0.004445 = $0.07112/hour
- **Total:** $0.23304/hour = **$0.00388/minute**

**Example costs:**

| Video Duration | Render Time | Task Cost |
|----------------|-------------|-----------|
| 30 seconds | ~2 minutes | $0.008 |
| 60 seconds | ~3 minutes | $0.012 |
| 5 minutes | ~8 minutes | $0.031 |
| 30 minutes | ~40 minutes | $0.155 |

**Additional costs:**
- **ECR storage:** $0.10/GB/month (minimal for Docker images)
- **Data transfer:** $0.09/GB out (only MP4 downloads)
- **CloudWatch logs:** $0.50/GB ingested (typical: $1-5/month)

**Monthly estimate (100 renders/day):**
- 100 renders × 3 minutes × $0.00388/min = $1.16/day
- **~$35/month** for compute
- **~$2-5/month** for logs and storage
- **Total: ~$40/month**

## Performance Characteristics

### Task Provisioning
**Cold start:** 1.5 - 2.5 minutes
- Pull Docker image from ECR
- Initialize container
- Start Node.js process

**Warm starts:** Not applicable (tasks exit after each render)

### Rendering Speed
With 4 vCPU, 16GB RAM:

| Video Length | Render Time | FPS | Total Time (provision + render) |
|--------------|-------------|-----|-------------------------------|
| 30 seconds | 1-2 minutes | ~15-30 | 3-4 minutes |
| 60 seconds | 2-3 minutes | ~20-30 | 4-5 minutes |
| 5 minutes | 6-8 minutes | ~20-30 | 8-10 minutes |
| 30 minutes | 35-45 minutes | ~15-25 | 37-47 minutes |

**Frame capture rate:** 15-30 FPS (varies by scene complexity)
**Encoding speed:** ~60-120x realtime

### Parallel Processing

ECS can run up to 10 concurrent tasks (configurable):

\`\`\`
Sequential: 10 videos × 3 minutes = 30 minutes
Parallel:   10 videos ÷ 10 tasks = 3 minutes
\`\`\`

**Scale limit:** \`MAX_CONCURRENT_TASKS\` environment variable (default: 10)

## Troubleshooting

### Task Fails Immediately
**Check CloudWatch logs:**
\`\`\`bash
aws logs tail "amplify-...-RenderTaskDefinition..." --since 10m --region us-east-1
\`\`\`

**Common causes:**
- Empty AMPLIFY_OUTPUTS (authentication fails)
- Invalid worker credentials
- Missing S3 permissions
- Network connectivity issues

### Task Stuck in PENDING
**Check VPC configuration:**
- NAT gateway attached to private subnets
- Route tables configured correctly
- Security group allows outbound HTTPS

**Check service quotas:**
\`\`\`bash
aws service-quotas get-service-quota \\
  --service-code ecs \\
  --quota-code L-3032A538 \\
  --region us-east-1
\`\`\`

### Lambda Not Triggering Tasks
**Check EventBridge rule:**
\`\`\`bash
aws events list-rules --name-prefix amplify- --region us-east-1
\`\`\`

**Check Lambda logs:**
\`\`\`bash
aws logs tail "/aws/lambda/amplify-...-RenderTriggerFunction..." --region us-east-1
\`\`\`

**Verify Lambda has IAM permissions:**
- \`ecs:RunTask\`
- \`ecs:DescribeTasks\`
- \`iam:PassRole\`
- \`appsync:GraphQL\`

### High Task Failure Rate
**Check CloudWatch alarm:**
- Navigate to CloudWatch → Alarms
- Look for \`babulus-worker-high-error-rate\`

**Common fixes:**
- Update Docker image with bug fix
- Increase task timeout
- Add retry logic
- Check for intermittent network issues

## Scaling Configuration

### Increase Concurrent Tasks

Edit \`apps/studio-web/amplify/backend.ts\`:

\`\`\`typescript
environment: {
  // ... other vars
  MAX_CONCURRENT_TASKS: '20',  // Increase from 10 to 20
}
\`\`\`

Deploy:
\`\`\`bash
git add apps/studio-web/amplify/backend.ts
git commit -m "Increase concurrent render tasks to 20"
git push origin main
\`\`\`

### Adjust Task Resources

For longer videos, increase CPU/RAM:

\`\`\`typescript
const renderTaskDefinition = new ecs.FargateTaskDefinition(backend.stack, 'RenderTaskDefinition', {
  cpu: 8192,        // 8 vCPU (was 4096)
  memoryLimitMiB: 30720,  // 30 GB (was 16384)
  // ...
});
\`\`\`

### Change Polling Interval

Edit EventBridge schedule:

\`\`\`typescript
const renderWorkerRule = new events.Rule(backend.stack, 'RenderWorkerSchedule', {
  schedule: events.Schedule.rate(Duration.seconds(30)),  // Every 30 seconds (was 1 minute)
  // ...
});
\`\`\`

## Security Best Practices

### 1. Use Secrets Manager for Worker Credentials
Currently worker credentials are in plaintext environment variables. Move to Secrets Manager:

\`\`\`typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

const workerSecret = new secretsmanager.Secret(backend.stack, 'WorkerCredentials', {
  secretName: 'babulus-worker-credentials',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ email: 'render-worker@babulus.internal' }),
    generateStringKey: 'password',
  },
});

// Grant task read access
workerSecret.grantRead(taskRole);

// Update task definition
renderTaskDefinition.addContainer('render-worker', {
  // ...
  secrets: {
    WORKER_EMAIL: ecs.Secret.fromSecretsManager(workerSecret, 'email'),
    WORKER_PASSWORD: ecs.Secret.fromSecretsManager(workerSecret, 'password'),
  },
});
\`\`\`

### 2. Restrict Task IAM Permissions
Only grant permissions the worker actually needs:

\`\`\`typescript
taskRole.addToPolicy(
  new iam.PolicyStatement({
    actions: ['s3:GetObject', 's3:PutObject'],  // No DeleteObject
    resources: [\`\${bucket.bucketArn}/renders/*\`],  // Only renders prefix
  })
);
\`\`\`

### 3. Enable VPC Flow Logs
Monitor network traffic:

\`\`\`typescript
vpc.addFlowLog('FlowLog', {
  destination: ec2.FlowLogDestination.toCloudWatchLogs(),
  trafficType: ec2.FlowLogTrafficType.ALL,
});
\`\`\`

## Pros & Cons

### Advantages
✅ Scales automatically (up to 10 concurrent)
✅ No server management required
✅ Pay only for task runtime
✅ Handles long-running renders (no Lambda timeout)
✅ Isolated execution per job
✅ CloudWatch monitoring built-in

### Disadvantages
❌ Cold start overhead (~2 minutes)
❌ Requires AWS infrastructure
❌ More complex setup vs. local
❌ Costs more per render than local
❌ Debugging requires CloudWatch access

## Next Steps

- [Monitoring & Alerts](/docs/rendering/monitoring) - Configure SNS alerts
- [Cost Optimization](/docs/rendering/cost) - Reduce render costs
- [Performance Tuning](/docs/rendering/performance) - Speed up renders
- [Troubleshooting Guide](/docs/rendering/troubleshooting) - Common issues
`;

export const renderingMode3Doc: DocsEntry = {
  slug: ["rendering", "cloud"],
  title: "Cloud Rendering",
  description: "Scale video rendering to production with AWS ECS Fargate",
  category: "Rendering",
  html: marked.parse(content, { async: false }) as string,
};
