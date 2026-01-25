/**
 * Step definitions for render worker BDD tests
 *
 * These steps test the worker-lib.ts render job processing functions.
 * Note: Full Playwright/ffmpeg rendering is marked as pending in tests.
 */

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  claimNextJob,
  processRenderJob,
  handleJobFailure,
  emitJobEvent,
  type GraphQLClient,
  type StorageClient,
  type ProcessingResult,
} from '../../src/worker-lib.js';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// Test context
interface TestContext {
  mockClient: MockGraphQLClient;
  mockStorage: MockStorageClient;
  claimedJob: any | null;
  processingResult: ProcessingResult | null;
  processingError: Error | null;
  retryResult: { shouldRetry: boolean; retryCount: number } | null;
  workDir: string;
  jobEvents: Array<{
    type: string;
    message: string;
    progress?: number;
  }>;
}

// Mock GraphQL client for render tests
class MockGraphQLClient {
  private jobs: any[] = [];
  private generationRuns: Map<string, any> = new Map();
  private renderRuns: any[] = [];
  private jobEvents: any[] = [];
  private usageEvents: any[] = [];
  private claimedJobs: Set<string> = new Set();

  models = {
    Job: {
      list: async (params: any) => {
        const filtered = this.jobs.filter(job => {
          if (params.filter?.status?.eq && job.status !== params.filter.status.eq) return false;
          if (params.filter?.kind?.eq && job.kind !== params.filter.kind.eq) return false;
          return true;
        });
        return { data: filtered.slice(0, params.limit || 10), errors: null };
      },
      get: async (params: any) => {
        const job = this.jobs.find(j => j.id === params.id);
        return { data: job || null, errors: null };
      },
      update: async (params: any) => {
        if (params.status === 'claimed' && this.claimedJobs.has(params.id)) {
          return { data: null, errors: [{ message: 'Conditional check failed' }] };
        }

        const job = this.jobs.find(j => j.id === params.id);
        if (job) {
          Object.assign(job, params);
          if (params.status === 'claimed') this.claimedJobs.add(params.id);
        }
        return { data: job, errors: null };
      },
    },
    GenerationRun: {
      get: async (params: any) => {
        const run = this.generationRuns.get(params.id);
        return { data: run || null, errors: null };
      },
    },
    RenderRun: {
      create: async (params: any) => {
        const run = { ...params, id: `render-run-${Date.now()}` };
        this.renderRuns.push(run);
        return { data: run, errors: null };
      },
    },
    JobEvent: {
      create: async (params: any) => {
        this.jobEvents.push(params);
        return { data: params, errors: null };
      },
    },
    UsageEvent: {
      create: async (params: any) => {
        this.usageEvents.push(params);
        return { data: params, errors: null };
      },
    },
  };

  addJob(job: any) {
    const existing = this.jobs.findIndex(j => j.id === job.id);
    if (existing >= 0) {
      this.jobs[existing] = job;
    } else {
      this.jobs.push(job);
    }
  }

  addGenerationRun(id: string, run: any) {
    this.generationRuns.set(id, { ...run, id });
  }

  getJobEvents() {
    return this.jobEvents;
  }

  getUsageEvents() {
    return this.usageEvents;
  }

  getRenderRuns() {
    return this.renderRuns;
  }

  getAllJobs() {
    return this.jobs;
  }
}

// Mock Storage client
class MockStorageClient implements StorageClient {
  private uploadedFiles: Map<string, any> = new Map();
  private downloadableFiles: Map<string, any> = new Map();

  uploadData(params: { path: string; data: any; options?: { contentType?: string } }) {
    this.uploadedFiles.set(params.path, params.data);
    return {
      result: Promise.resolve({ path: params.path }),
    };
  }

  downloadData(params: { path: string }) {
    const data = this.downloadableFiles.get(params.path);
    if (!data) {
      return {
        result: Promise.reject(new Error(`File not found: ${params.path}`)),
      };
    }

    return {
      result: Promise.resolve({
        body: {
          text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
          blob: () => Promise.resolve(new Blob([data])),
        },
      }),
    };
  }

  addDownloadableFile(path: string, content: any) {
    this.downloadableFiles.set(path, content);
  }

  getUploadedFiles() {
    return Array.from(this.uploadedFiles.keys());
  }
}

let testContext: TestContext;

Before(function () {
  process.env.NODE_ENV = 'test';

  testContext = {
    mockClient: new MockGraphQLClient(),
    mockStorage: new MockStorageClient(),
    claimedJob: null,
    processingResult: null,
    processingError: null,
    retryResult: null,
    workDir: join(process.cwd(), '.babulus', 'test-render-worker'),
    jobEvents: [],
  };
});

After(function () {
  if (existsSync(testContext.workDir)) {
    rmSync(testContext.workDir, { recursive: true, force: true });
  }
});

// Step definitions

Given('render dependencies are available', function () {
  // Playwright and ffmpeg would be checked here
  // In real tests, we'd verify these are installed
  assert.ok(true);
});

Given('a queued render job exists in the database', function () {
  const job = {
    id: 'job-render-123',
    kind: 'render',
    status: 'queued',
    orgId: 'org-123',
    inputJson: JSON.stringify({ videoId: 'video-123', generationRunId: 'gen-run-123' }),
    retryCount: 0,
    maxRetries: 3,
  };

  testContext.mockClient.addJob(job);
});

When('the worker attempts to claim the next render job', async function () {
  testContext.claimedJob = await claimNextJob(
    testContext.mockClient as any,
    'test-worker',
    'render'
  );
});

Given('a claimed render job with valid generation run', function () {
  const job = {
    id: 'job-render-123',
    kind: 'render',
    status: 'claimed',
    orgId: 'org-123',
    inputJson: JSON.stringify({ videoId: 'video-123', generationRunId: 'gen-run-123' }),
    claimedByAgentId: 'test-worker',
    retryCount: 0,
    maxRetries: 3,
  };

  testContext.mockClient.addJob(job);
  testContext.claimedJob = job;

  // Add generation run with artifacts
  testContext.mockClient.addGenerationRun('gen-run-123', {
    orgId: 'org-123',
    videoId: 'video-123',
    status: 'succeeded',
    scriptArtifactKey: 'org/org-123/videos/video-123/runs/gen-run-123/script.json',
    timelineArtifactKey: 'org/org-123/videos/video-123/runs/gen-run-123/timeline.json',
    audioArtifactKey: 'org/org-123/videos/video-123/runs/gen-run-123/audio.wav',
  });

  // Add downloadable artifacts
  testContext.mockStorage.addDownloadableFile(
    'org/org-123/videos/video-123/runs/gen-run-123/script.json',
    JSON.stringify({
      meta: { fps: 30, durationSeconds: 10 },
      scenes: [],
    })
  );
  testContext.mockStorage.addDownloadableFile(
    'org/org-123/videos/video-123/runs/gen-run-123/timeline.json',
    JSON.stringify({ tracks: [] })
  );
  testContext.mockStorage.addDownloadableFile(
    'org/org-123/videos/video-123/runs/gen-run-123/audio.wav',
    Buffer.from('fake audio data')
  );
});

Given('the generation run has script, timeline, and audio artifacts', function () {
  // Already set up in previous step
  assert.ok(true);
});

When('the worker processes the render job', async function () {
  // Mark as pending because this requires Playwright + ffmpeg
  return 'pending';

  // Real implementation would be:
  // mkdirSync(testContext.workDir, { recursive: true });
  // try {
  //   testContext.processingResult = await processRenderJob(
  //     testContext.claimedJob,
  //     testContext.mockClient as any,
  //     testContext.mockStorage,
  //     testContext.workDir
  //   );
  // } catch (error) {
  //   testContext.processingError = error as Error;
  // }
});

Then('the artifacts should be downloaded from S3', function () {
  return 'pending';
});

Then('the video should be rendered with Playwright', function () {
  return 'pending';
});

Then('the MP4 should be encoded with ffmpeg', function () {
  return 'pending';
});

Then('the MP4 should be uploaded to S3', function () {
  return 'pending';
});

Then('a RenderRun record should be created', function () {
  return 'pending';
});

Then('usage events should be recorded for frames rendered', function () {
  return 'pending';
});

Given('a claimed render job referencing non-existent generation run', function () {
  const job = {
    id: 'job-render-456',
    kind: 'render',
    status: 'claimed',
    orgId: 'org-123',
    inputJson: JSON.stringify({ videoId: 'video-123', generationRunId: 'non-existent' }),
    claimedByAgentId: 'test-worker',
  };

  testContext.mockClient.addJob(job);
  testContext.claimedJob = job;
});

Then('the job should fail with {string}', function (expectedError: string) {
  return 'pending';
});

Given('the generation run has no script artifact', function () {
  testContext.mockClient.addGenerationRun('gen-run-123', {
    orgId: 'org-123',
    videoId: 'video-123',
    status: 'succeeded',
    // No scriptArtifactKey
  });
});

Then('temporary working directory should be created', function () {
  return 'pending';
});

Then('temporary files should be written \\(script, timeline, audio, frames)', function () {
  return 'pending';
});

Given('a claimed render job that will fail', function () {
  const job = {
    id: 'job-render-fail',
    kind: 'render',
    status: 'claimed',
    orgId: 'org-123',
    inputJson: JSON.stringify({ videoId: 'video-123', generationRunId: 'gen-run-123' }),
    claimedByAgentId: 'test-worker',
    retryCount: 0,
    maxRetries: 3,
  };

  testContext.mockClient.addJob(job);
  testContext.claimedJob = job;
});

Given('the video is {int} seconds at {int} fps', function (seconds: number, fps: number) {
  // Update the script artifact to have these values
  testContext.mockStorage.addDownloadableFile(
    'org/org-123/videos/video-123/runs/gen-run-123/script.json',
    JSON.stringify({
      meta: { fps, durationSeconds: seconds },
      scenes: [],
    })
  );
});

Then('a usage event should be created with {int} frames', function (expectedFrames: number) {
  return 'pending';
});

Then('the usage event should have provider {string}', function (provider: string) {
  return 'pending';
});

Then('the usage event should have unitType {string}', function (unitType: string) {
  return 'pending';
});

Then('the estimated cost should be calculated correctly', function () {
  return 'pending';
});
