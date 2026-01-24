import assert from "node:assert/strict";
import { Given, Then, When, type DataTable } from "@cucumber/cucumber";
import {
  createControlPlaneStore,
  createGenerationRun,
  createJob,
  createProject,
  createRenderAgent,
  createVideo,
  type ControlPlaneStore,
} from "../../packages/shared/src/control-plane.js";
import { claimNextJob, executeJob, type ExecutionResult } from "../../packages/shared/src/execution-plane.js";
import type { JobStatus } from "../../packages/shared/src/index.js";
import type { CreateJobInput, RecordContext } from "../../packages/shared/src/records.js";

let store: ControlPlaneStore | null = null;
let claimedJobId: string | null = null;
let executionResult: ExecutionResult | null = null;
let executionError: string | null = null;

const reset = () => {
  claimedJobId = null;
  executionResult = null;
  executionError = null;
};

const contextFor = (id: string, iso: string): Partial<RecordContext> => {
  return {
    id: () => id,
    now: () => new Date(iso),
  };
};

const isDataTable = (value: unknown): value is DataTable => {
  return typeof value === "object" && value !== null && typeof (value as DataTable).hashes === "function";
};

const buildJobInputJson = (table: DataTable): string | null => {
  if (!isDataTable(table)) {
    return null;
  }
  const rows = table.hashes();
  if (rows.length === 0) {
    return null;
  }
  const input: Record<string, string> = {};
  for (const row of rows) {
    const field = row.field?.trim();
    if (!field) {
      continue;
    }
    input[field] = row.value ?? "";
  }
  return JSON.stringify(input);
};

Given("an execution plane store", () => {
  store = createControlPlaneStore();
  reset();
});

Given(
  "an execution project {string} in org {string} created {string}",
  (projectId: string, orgId: string, createdAt: string) => {
    createProject(
      store ?? createControlPlaneStore(),
      { name: projectId },
      orgId,
      contextFor(projectId, createdAt),
    );
  },
);

Given(
  "an execution video {string} in project {string} org {string} created {string}",
  (videoId: string, projectId: string, orgId: string, createdAt: string) => {
    createVideo(
      store ?? createControlPlaneStore(),
      { projectId, title: videoId },
      orgId,
      contextFor(videoId, createdAt),
    );
  },
);

Given(
  "an execution generation run {string} in video {string} org {string} storyboard {string} created {string}",
  (runId: string, videoId: string, orgId: string, storyboardVersionId: string, createdAt: string) => {
    createGenerationRun(
      store ?? createControlPlaneStore(),
      { videoId, storyboardVersionId, status: "succeeded" },
      orgId,
      contextFor(runId, createdAt),
    );
  },
);

Given(
  "an execution render agent {string} in org {string} status {string} created {string}",
  (agentId: string, orgId: string, status: string, createdAt: string) => {
    createRenderAgent(
      store ?? createControlPlaneStore(),
      {
        label: agentId,
        status: status as "online" | "offline" | "busy",
      },
      orgId,
      contextFor(agentId, createdAt),
    );
  },
);

Given(
  "an execution job {string} in org {string} kind {string} status {string} created {string}",
  (jobId: string, orgId: string, kind: string, status: string, createdAt: string) => {
    const jobInput: CreateJobInput = {
      kind: kind as CreateJobInput["kind"],
      status: status as JobStatus,
    };
    createJob(store ?? createControlPlaneStore(), jobInput, orgId, contextFor(jobId, createdAt));
  },
);

Given(
  "an execution job {string} in org {string} kind {string} status {string} created {string} with input:",
  (jobId: string, orgId: string, kind: string, status: string, createdAt: string, table: DataTable) => {
    const inputJson = buildJobInputJson(table);
    const jobInput: CreateJobInput = {
      kind: kind as CreateJobInput["kind"],
      status: status as JobStatus,
      inputJson,
    };
    createJob(store ?? createControlPlaneStore(), jobInput, orgId, contextFor(jobId, createdAt));
  },
);

When("I claim the next job for agent {string} in org {string}", (agentId: string, orgId: string) => {
  reset();
  const job = claimNextJob(store ?? createControlPlaneStore(), agentId, orgId);
  claimedJobId = job?.id ?? null;
});

When("I execute job {string} as agent {string} in org {string}", (jobId: string, agentId: string, orgId: string) => {
  reset();
  try {
    executionResult = executeJob(store ?? createControlPlaneStore(), jobId, agentId, orgId);
  } catch (error) {
    executionError = error instanceof Error ? error.message : String(error);
  }
});

Then("the claimed job id should be {string}", (expected: string) => {
  assert.equal(claimedJobId, expected);
});

Then("the job {string} status should be {string}", (jobId: string, expected: string) => {
  const job = (store ?? createControlPlaneStore()).jobs.find((entry) => entry.id === jobId);
  assert.equal(job?.status, expected);
});

Then("the job {string} claimedBy should be {string}", (jobId: string, expected: string) => {
  const job = (store ?? createControlPlaneStore()).jobs.find((entry) => entry.id === jobId);
  assert.equal(job?.claimedByAgentId ?? null, expected === "none" ? null : expected);
});

Then(
  "a generation run should exist for video {string} storyboard {string} with status {string}",
  (videoId: string, storyboardVersionId: string, expected: string) => {
    const run = (store ?? createControlPlaneStore()).generationRuns.find(
      (entry) =>
        entry.videoId === videoId &&
        entry.storyboardVersionId === storyboardVersionId &&
        entry.status === expected,
    );
    assert.ok(run, "Expected generation run");
  },
);

Then(
  "a render run should exist for video {string} generation {string} with status {string}",
  (videoId: string, generationRunId: string, expected: string) => {
    const run = (store ?? createControlPlaneStore()).renderRuns.find(
      (entry) =>
        entry.videoId === videoId && entry.generationRunId === generationRunId && entry.status === expected,
    );
    assert.ok(run, "Expected render run");
  },
);

Then(
  "a usage event should exist for video {string} unit {string} quantity {string}",
  (videoId: string, unitType: string, quantity: string) => {
    const expectedQuantity = Number(quantity);
    const events = (store ?? createControlPlaneStore()).usageEvents.filter(
      (entry) =>
        entry.videoId === videoId && entry.unitType === unitType && entry.quantity === expectedQuantity,
    );
    assert.ok(events.length > 0, "Expected usage event");
  },
);

Then(
  "a job event should exist for job {string} type {string} message {string}",
  (jobId: string, type: string, message: string) => {
    const events = (store ?? createControlPlaneStore()).jobEvents.filter(
      (event) => event.jobId === jobId && event.type === type,
    );
    const matched = events.some((event) => (event.message ?? "").includes(message));
    assert.ok(matched, "Expected job event");
  },
);

Then("the render agent {string} status should be {string}", (agentId: string, expected: string) => {
  const agent = (store ?? createControlPlaneStore()).renderAgents.find((entry) => entry.id === agentId);
  assert.equal(agent?.status, expected);
});

Then("the execution error should include {string}", (expected: string) => {
  assert.ok(executionError?.includes(expected));
});

Then("the execution result should exist", () => {
  assert.ok(executionResult);
});
