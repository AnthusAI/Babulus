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
import { uploadData, downloadData } from 'aws-amplify/storage';
import {
  claimNextJob,
  processGenerationJob,
  updateJobStatus,
  handleJobFailure,
  emitJobEvent,
  type StorageClient,
} from '../../../../../src/worker-lib.js';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const amplifyConfig = loadAmplifyOutputs();

// Configure Amplify for Lambda execution
Amplify.configure(amplifyConfig, {
  ssr: true,
});

const client = generateClient<any>({
  authMode: 'iam', // Lambda uses IAM role, not user pool
});

const workerClient = client as any;

// Storage client wrapper
const storage: StorageClient = {
  uploadData: (params) => uploadData(params),
  downloadData: (params) => downloadData(params),
};

/**
 * Lambda handler function
 * Invoked by EventBridge scheduler every 30 seconds
 */
export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log('Generation worker triggered', { event });

  const agentId = `lambda-${process.env.AWS_LAMBDA_LOG_STREAM_NAME || 'unknown'}`;
  let job: any = null;

  try {
    // Claim next queued generation job
    job = await claimNextJob(workerClient, agentId, 'generate');

    if (!job) {
      console.log('No queued generation jobs found');
      return { statusCode: 200, body: 'No jobs to process' };
    }

    console.log('Claimed job:', { jobId: job.id, kind: job.kind, agentId });

    // Create temporary working directory
    const workDir = join('/tmp', 'worker', job.id);
    mkdirSync(workDir, { recursive: true });

    try {
      // Process the generation job
      const result = await processGenerationJob(job, workerClient, storage, workDir);

      if (result.success) {
        await updateJobStatus(workerClient, job.id, 'succeeded');
        console.log('Job succeeded:', { jobId: job.id });
      } else {
        const retryResult = await handleJobFailure(
          workerClient,
          job.id,
          result.error || 'Unknown error'
        );
        console.error('Job failed:', {
          jobId: job.id,
          error: result.error,
          willRetry: retryResult.shouldRetry,
          retryCount: retryResult.retryCount,
        });
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: result.success ? 'Job processed successfully' : 'Job failed',
          jobId: job.id,
          artifacts: result.artifactKeys,
        }),
      };
    } finally {
      // Clean up temp directory
      try {
        rmSync(workDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to clean up work directory:', e);
      }
    }
  } catch (error) {
    console.error('Worker error:', error);

    // Handle job failure with retry logic if we claimed one
    if (job) {
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const retryResult = await handleJobFailure(workerClient, job.id, errorMessage);

        await emitJobEvent(
          workerClient,
          job.id,
          job.orgId,
          'error',
          retryResult.shouldRetry
            ? `Error (will retry ${retryResult.retryCount}): ${errorMessage}`
            : `Permanent failure: ${errorMessage}`
        );
      } catch (updateError) {
        console.error('Failed to handle job failure:', updateError);
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Worker error',
        error: error instanceof Error ? error.message : String(error),
        jobId: job?.id,
      }),
    };
  }
};

function loadAmplifyOutputs(): Record<string, unknown> {
  if (process.env.AMPLIFY_OUTPUTS) {
    try {
      return JSON.parse(process.env.AMPLIFY_OUTPUTS);
    } catch (error) {
      console.warn('Failed to parse AMPLIFY_OUTPUTS env var:', error);
    }
  }

  try {
    const outputsPath = join(__dirname, '../../../amplify_outputs.json');
    return JSON.parse(readFileSync(outputsPath, 'utf8'));
  } catch (error) {
    console.warn('Amplify outputs not found. Using empty config.');
    return {};
  }
}
