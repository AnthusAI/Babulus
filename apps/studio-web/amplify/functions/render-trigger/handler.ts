/**
 * Render Trigger Lambda
 *
 * This Lambda is triggered by EventBridge every 1 minute.
 * It polls for queued render jobs and starts ECS Fargate tasks to process them.
 *
 * Each render job gets its own Fargate task, which:
 * - Downloads generation artifacts from S3
 * - Renders video frames with Playwright
 * - Encodes MP4 with ffmpeg
 * - Uploads result to S3
 * - Creates RenderRun record
 * - Exits
 */

import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';

// Configure Amplify with environment variables set by CDK
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: process.env.GRAPHQL_ENDPOINT!,
      region: process.env.AWS_REGION!,
      defaultAuthMode: 'iam'
    }
  }
});

const ecs = new ECSClient({});
const client = generateClient<any>({ authMode: 'iam' });

// Environment variables set by CDK (backend.ts)
const CLUSTER_ARN = process.env.CLUSTER_ARN!;
const TASK_DEFINITION_ARN = process.env.TASK_DEFINITION_ARN!;
const SUBNET_IDS = process.env.SUBNET_IDS!.split(',');
const SECURITY_GROUP_ID = process.env.SECURITY_GROUP_ID!;
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'render-worker';
const MAX_CONCURRENT_TASKS = parseInt(process.env.MAX_CONCURRENT_TASKS || '10', 10);

export const handler = async (event: any) => {
  console.log('Render trigger Lambda invoked by EventBridge');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // 1. Query for queued render jobs
    const { data: jobs, errors } = await client.models.Job.list({
      filter: {
        kind: { eq: 'render' },
        status: { eq: 'queued' }
      },
      limit: MAX_CONCURRENT_TASKS
    });

    if (errors) {
      console.error('Error querying jobs:', errors);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to query jobs', details: errors })
      };
    }

    if (!jobs || jobs.length === 0) {
      console.log('No queued render jobs found');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No jobs to process' })
      };
    }

    console.log(`Found ${jobs.length} queued render job(s)`);

    // 2. Start ECS task for each job
    const taskPromises = jobs.map(async (job: any) => {
      try {
        console.log(`Starting ECS task for job ${job.id}...`);

        const command = new RunTaskCommand({
          cluster: CLUSTER_ARN,
          taskDefinition: TASK_DEFINITION_ARN,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: SUBNET_IDS,
              securityGroups: [SECURITY_GROUP_ID],
              assignPublicIp: 'DISABLED' // Use NAT gateway for internet access
            }
          },
          overrides: {
            containerOverrides: [
              {
                name: CONTAINER_NAME,
                environment: [
                  { name: 'JOB_ID', value: job.id },
                  { name: 'WORKER_ID', value: `ecs-task-${Date.now()}` },
                  // Worker credentials come from task definition secrets
                  // (configured in backend.ts to use Secrets Manager)
                ]
              }
            ]
          },
          tags: [
            { key: 'JobId', value: job.id },
            { key: 'VideoId', value: job.inputJson ? JSON.parse(job.inputJson).videoId : 'unknown' },
            { key: 'OrgId', value: job.orgId }
          ]
        });

        const response = await ecs.send(command);
        const taskArn = response.tasks?.[0]?.taskArn;

        if (!taskArn) {
          throw new Error('ECS task ARN not returned');
        }

        console.log(`ECS task started: ${taskArn} for job ${job.id}`);

        return {
          jobId: job.id,
          taskArn,
          status: 'started'
        };
      } catch (error) {
        console.error(`Failed to start ECS task for job ${job.id}:`, error);
        return {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        };
      }
    });

    const results = await Promise.all(taskPromises);

    const successCount = results.filter((r: { status: string }) => r.status === 'started').length;
    const failureCount = results.filter((r: { status: string }) => r.status === 'failed').length;

    console.log(`Task trigger results: ${successCount} started, ${failureCount} failed`);
    console.log('Details:', JSON.stringify(results, null, 2));

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
