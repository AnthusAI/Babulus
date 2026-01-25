/**
 * Lambda handler for generation worker
 *
 * This handler is invoked by EventBridge on a schedule to poll for
 * queued generation jobs and process them.
 *
 * Job processing flow:
 * 1. Query for jobs with status="queued" and kind="generate"
 * 2. Claim one job (optimistic locking with conditional update)
 * 3. Fetch video + storyboard version data
 * 4. Parse Babulus DSL and generate composition
 * 5. Call TTS API to generate audio
 * 6. Upload artifacts (script.json, timeline.json, audio.wav) to S3
 * 7. Create GenerationRun record
 * 8. Update job status to "succeeded" or "failed"
 * 9. Emit JobEvents for progress tracking
 *
 * The actual worker logic is imported from src/worker-cloud.ts
 * and adapted for Lambda execution.
 */

import type { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource.js';
import amplifyConfig from '../../../amplify_outputs.json';

// Configure Amplify for Lambda execution
Amplify.configure(amplifyConfig, {
  ssr: true,
});

const client = generateClient<Schema>({
  authMode: 'iam', // Lambda uses IAM role, not user pool
});

/**
 * Lambda handler function
 * Invoked by EventBridge scheduler every 30 seconds
 */
export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log('Generation worker triggered', { event });

  try {
    // Query for queued generation jobs
    const { data: jobs, errors } = await client.models.Job.list({
      filter: {
        status: { eq: 'queued' },
        kind: { eq: 'generate' },
      },
      limit: 1, // Process one at a time
    });

    if (errors) {
      console.error('Failed to list jobs:', errors);
      return { statusCode: 500, body: 'Failed to list jobs' };
    }

    if (!jobs || jobs.length === 0) {
      console.log('No queued generation jobs found');
      return { statusCode: 200, body: 'No jobs to process' };
    }

    const job = jobs[0];
    console.log('Found queued job:', { jobId: job.id, kind: job.kind });

    // TODO: Import and call actual worker logic from src/worker-cloud.ts
    // For now, this is a placeholder that will be implemented next

    // Claim the job
    const agentId = `lambda-${process.env.AWS_LAMBDA_LOG_STREAM_NAME}`;
    const { data: claimedJob, errors: claimErrors } = await client.models.Job.update({
      id: job.id,
      status: 'claimed',
      claimedByAgentId: agentId,
    });

    if (claimErrors) {
      console.error('Failed to claim job (may have been claimed by another worker):', claimErrors);
      return { statusCode: 409, body: 'Job already claimed' };
    }

    console.log('Claimed job:', { jobId: job.id, agentId });

    // Process the job
    // await processGenerationJob(claimedJob, client);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Job processed successfully',
        jobId: job.id,
      }),
    };
  } catch (error) {
    console.error('Worker error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Worker error',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

/**
 * Process a generation job
 *
 * This function will be extracted from src/worker-cloud.ts and refactored
 * to be more testable and reusable between local and Lambda execution.
 *
 * @param job - The claimed job to process
 * @param client - AppSync GraphQL client
 */
async function processGenerationJob(
  job: any,
  client: ReturnType<typeof generateClient<Schema>>
): Promise<void> {
  // Implementation will be added in next commit
  // This will call the refactored worker logic
  throw new Error('Not implemented yet');
}
