/**
 * Render Trigger Lambda
 *
 * This Lambda is triggered by DynamoDB Streams when render jobs are created or updated to 'queued' status.
 * It immediately starts ECS Fargate tasks to process them - no polling delay.
 *
 * Each render job gets its own Fargate task, which:
 * - Downloads generation artifacts from S3
 * - Renders video frames with Playwright
 * - Encodes MP4 with ffmpeg
 * - Uploads result to S3
 * - Creates RenderRun record
 * - Exits
 */

import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { decideLaunch } from './decision.js';

const ecs = new ECSClient({});
const ddb = new DynamoDBClient({});

// Environment variables set by CDK (backend.ts)
const CLUSTER_ARN = process.env.CLUSTER_ARN!;
const TASK_DEFINITION_ARN = process.env.TASK_DEFINITION_ARN!;
const SUBNET_IDS = process.env.SUBNET_IDS!.split(',');
const SECURITY_GROUP_ID = process.env.SECURITY_GROUP_ID!;
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'render-worker';
const JOB_TABLE_NAME = process.env.JOB_TABLE_NAME!;

/**
 * Extract Job record from DynamoDB Stream event
 */
function extractJobFromRecord(record: DynamoDBRecord): any | null {
  const decision = decideLaunch(record as any);
  if (!decision.launch) {
    console.log(`Skipping record: ${decision.reason}`);
    return null;
  }

  try {
    return unmarshall(record.dynamodb!.NewImage as any);
  } catch (error) {
    console.error('Failed to unmarshall DynamoDB record:', error);
    return null;
  }
}

/**
 * Claim a job before launching: conditional queued -> claimed. At most one task per queued transition,
 * even if the stream batch is retried or delivered twice. Returns false if someone else already claimed it.
 */
async function claimJob(jobId: string): Promise<boolean> {
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: JOB_TABLE_NAME,
      Key: { id: { S: jobId } },
      UpdateExpression: 'SET #status = :claimed, claimedByAgentId = :by, updatedAt = :now',
      ConditionExpression: '#status = :queued',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':claimed': { S: 'claimed' },
        ':queued': { S: 'queued' },
        ':by': { S: 'render-trigger' },
        ':now': { S: new Date().toISOString() },
      },
    }));
    return true;
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') {
      console.log(`Job ${jobId} already claimed or no longer queued; not launching another task`);
      return false;
    }
    throw error;
  }
}

/**
 * The task could not be started after the job was claimed. Mark the job failed rather than
 * re-queueing it, so a persistent launch error cannot cause a launch loop.
 */
async function failClaimedJob(jobId: string, reason: string) {
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: JOB_TABLE_NAME,
      Key: { id: { S: jobId } },
      UpdateExpression: 'SET #status = :failed, failureReason = :reason, updatedAt = :now',
      ConditionExpression: '#status = :claimed',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':failed': { S: 'failed' },
        ':claimed': { S: 'claimed' },
        ':reason': { S: `Render task launch failed: ${reason}` },
        ':now': { S: new Date().toISOString() },
      },
    }));
  } catch (error) {
    console.error(`Failed to mark job ${jobId} as failed:`, error);
  }
}

/**
 * Start ECS Fargate task for a render job
 */
async function startRenderTask(job: any) {
  try {
    if (!(await claimJob(job.id))) {
      return { jobId: job.id, status: 'skipped' };
    }

    console.log(`Starting ECS task for job ${job.id}...`);

    const command = new RunTaskCommand({
      cluster: CLUSTER_ARN,
      taskDefinition: TASK_DEFINITION_ARN,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: SUBNET_IDS,
          securityGroups: [SECURITY_GROUP_ID],
          assignPublicIp: 'ENABLED' // Public subnets, no NAT gateway: task needs a public IP for ECR/S3/AppSync (no inbound rules)
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: CONTAINER_NAME,
            environment: [
              { name: 'JOB_ID', value: job.id },
              { name: 'WORKER_ID', value: `ecs-task-${Date.now()}` },
              // Worker credentials come from task definition environment
            ]
          }
        ]
      },
      tags: [
        { key: 'JobId', value: job.id },
        { key: 'VideoId', value: (job.inputJson ? JSON.parse(job.inputJson).videoId : null) || 'unknown' },
        ...(job.orgId ? [{ key: 'OrgId', value: job.orgId }] : [])
      ]
    });

    const response = await ecs.send(command);
    const taskArn = response.tasks?.[0]?.taskArn;

    if (!taskArn) {
      throw new Error('ECS task ARN not returned');
    }

    console.log(`✓ ECS task started: ${taskArn} for job ${job.id}`);

    return {
      jobId: job.id,
      taskArn,
      status: 'started'
    };
  } catch (error) {
    console.error(`✗ Failed to start ECS task for job ${job.id}:`, error);
    await failClaimedJob(job.id, error instanceof Error ? error.message : 'Unknown error');
    return {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed'
    };
  }
}

/**
 * Lambda handler - processes DynamoDB Stream events
 */
export const handler = async (event: DynamoDBStreamEvent) => {
  console.log(`Render trigger Lambda invoked by DynamoDB Stream (${event.Records.length} records)`);

  try {
    // Extract render jobs from stream records
    const jobs = event.Records
      .map(extractJobFromRecord)
      .filter(Boolean);

    if (jobs.length === 0) {
      console.log('No queued render jobs in stream records');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No render jobs to process' })
      };
    }

    console.log(`Found ${jobs.length} queued render job(s) in stream`);

    // Start ECS task for each job
    const results = await Promise.all(
      jobs.map(job => startRenderTask(job))
    );

    const successCount = results.filter(r => r.status === 'started').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    console.log(`Task trigger results: ${successCount} started, ${failureCount} failed`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: jobs.length,
        started: successCount,
        failed: failureCount,
        results
      })
    };
  } catch (error) {
    console.error('Render trigger Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};
