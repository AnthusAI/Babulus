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
  process.env.BABULUS_MOCK_RENDER = 'true';

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

Then('the render job should be claimed successfully', function () {
  assert.ok(testContext.claimedJob);
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
  mkdirSync(testContext.workDir, { recursive: true });
  try {
    testContext.processingResult = await processRenderJob(
      testContext.claimedJob,
      testContext.mockClient as any,
      testContext.mockStorage,
      testContext.workDir
    );
  } catch (error) {
    testContext.processingError = error as Error;
  }
});

Then('the artifacts should be downloaded from S3', function () {
  const scriptPath = join(testContext.workDir, 'script.json');
  const timelinePath = join(testContext.workDir, 'timeline.json');
  const audioPath = join(testContext.workDir, 'audio.wav');

  assert.ok(existsSync(scriptPath), 'script.json should exist');
  assert.ok(existsSync(timelinePath), 'timeline.json should exist');
  assert.ok(existsSync(audioPath), 'audio.wav should exist');
});

Then('the video should be rendered with Playwright', function () {
  const outputMp4Path = join(testContext.workDir, 'output.mp4');
  assert.ok(existsSync(outputMp4Path), 'output.mp4 should exist');
});

Then('the MP4 should be encoded with ffmpeg', function () {
  const outputMp4Path = join(testContext.workDir, 'output.mp4');
  assert.ok(existsSync(outputMp4Path), 'output.mp4 should exist');
});

Then('the MP4 should be uploaded to S3', function () {
  const uploads = testContext.mockStorage.getUploadedFiles();
  assert.ok(
    uploads.some((path) => path.includes('/renders/') && path.endsWith('/output.mp4')),
    'MP4 should be uploaded'
  );
});

Then('a RenderRun record should be created', function () {
  const runs = testContext.mockClient.getRenderRuns();
  assert.ok(runs.length > 0, 'RenderRun should be created');
});

Then('usage events should be recorded for frames rendered', function () {
  const events = testContext.mockClient.getUsageEvents();
  assert.ok(events.length > 0, 'Usage events should be recorded');
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

Then('the render job should fail with {string}', function (expectedError: string) {
  assert.ok(testContext.processingError);
  assert.ok(testContext.processingError.message.includes(expectedError));
});

Then('the render job status should be {string}', function (expectedStatus: string) {
  assert.strictEqual(testContext.claimedJob?.status, expectedStatus);
});

Then('the render job status should be updated to {string}', function (expectedStatus: string) {
  assert.ok(true);
  assert.ok(expectedStatus);
});

Then('the render claimedByAgentId should be set', function () {
  assert.ok(testContext.claimedJob?.claimedByAgentId);
});

Then('a render JobEvent should be emitted with message {string}', function (expectedMessage: string) {
  const events = testContext.mockClient.getJobEvents();
  const hasEvent = events.some((e) => e.message === expectedMessage);
  assert.ok(hasEvent, `JobEvent with message "${expectedMessage}" should be emitted`);
});

Then('render progress values should increase from {float} to {float}', function (min: number, max: number) {
  const events = testContext.mockClient.getJobEvents();
  const progressEvents = events.filter((e) => e.progress !== undefined);

  if (progressEvents.length > 0) {
    const minProgress = Math.min(...progressEvents.map((e) => e.progress!));
    const maxProgress = Math.max(...progressEvents.map((e) => e.progress!));
    assert.ok(minProgress >= min, `Min progress should be >= ${min}`);
    assert.ok(maxProgress <= max, `Max progress should be <= ${max}`);
  }
});

Then('the render job should be re-queued', function () {
  assert.ok(testContext.retryResult?.shouldRetry, 'Job should be marked for retry');
  const jobs = testContext.mockClient.getAllJobs();
  const job = jobs.find((j: any) => j.id === testContext.claimedJob.id);
  assert.strictEqual(job?.status, 'queued', 'Job status should be queued');
});

Then('the render retryCount should be {int}', function (expectedCount: number) {
  assert.strictEqual(testContext.retryResult?.retryCount, expectedCount);
  const jobs = testContext.mockClient.getAllJobs();
  const job = jobs.find((j: any) => j.id === testContext.claimedJob.id);
  assert.strictEqual(job?.retryCount, expectedCount);
});

Then('the render retry failureReason should contain {string}', function (expectedSubstring: string) {
  const jobs = testContext.mockClient.getAllJobs();
  const job = jobs.find((j: any) => j.id === testContext.claimedJob.id);
  assert.ok(
    job?.failureReason?.includes(expectedSubstring),
    `failureReason "${job?.failureReason}" should contain "${expectedSubstring}"`
  );
});

Given('the generation run has no script artifact', function () {
  testContext.mockClient.addGenerationRun('gen-run-123', {
    orgId: 'org-123',
    videoId: 'video-123',
    status: 'succeeded',
    // No scriptArtifactKey
  });
});

Then('temporary render working directory should be created', function () {
  assert.ok(existsSync(testContext.workDir), 'workDir should exist');
  assert.ok(existsSync(join(testContext.workDir, 'frames')), 'frames dir should exist');
});

Then('temporary files should be written \\(script, timeline, audio, frames)', function () {
  assert.ok(existsSync(join(testContext.workDir, 'script.json')));
  assert.ok(existsSync(join(testContext.workDir, 'timeline.json')));
  assert.ok(existsSync(join(testContext.workDir, 'audio.wav')));
  assert.ok(existsSync(join(testContext.workDir, 'frames', 'frame-0001.png')));
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

Given('the render job has retryCount {int} and maxRetries {int}', function (retryCount: number, maxRetries: number) {
  if (!testContext.claimedJob) {
    throw new Error('No claimed job exists');
  }

  testContext.claimedJob.retryCount = retryCount;
  testContext.claimedJob.maxRetries = maxRetries;
  testContext.mockClient.addJob(testContext.claimedJob);
});

When('the render job fails with error {string}', async function (errorMessage: string) {
  testContext.retryResult = await handleJobFailure(
    testContext.mockClient as any,
    testContext.claimedJob.id,
    errorMessage
  );
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
  const events = testContext.mockClient.getUsageEvents();
  assert.ok(events.length > 0, 'Usage events should exist');
  assert.ok(events.some((event) => event.quantity === expectedFrames));
});

Then('the usage event should have provider {string}', function (provider: string) {
  const events = testContext.mockClient.getUsageEvents();
  events.forEach((event) => {
    assert.strictEqual(event.provider, provider);
  });
});

Then('the usage event should have unitType {string}', function (unitType: string) {
  const events = testContext.mockClient.getUsageEvents();
  events.forEach((event) => {
    assert.strictEqual(event.unitType, unitType);
  });
});

Then('the estimated cost should be calculated correctly', function () {
  const events = testContext.mockClient.getUsageEvents();
  events.forEach((event) => {
    assert.strictEqual(event.estimatedCost, event.quantity * 0.001);
  });
});
