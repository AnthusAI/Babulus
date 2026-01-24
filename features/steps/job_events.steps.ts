import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  summarizeJobEvents,
  type JobEvent,
  type JobEventSummary,
} from "../../packages/shared/src/index.js";

let jobEvents: JobEvent[] = [];
let jobEventSummaries: Map<string, JobEventSummary> | null = null;

const normalizeOptional = (value?: string) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") {
    return null;
  }
  return trimmed;
};

Given("job events:", (table: { hashes: () => Array<Record<string, string>> }) => {
  jobEvents = table.hashes().map((row, index) => ({
    id: `job-event-${index + 1}`,
    orgId: "org-1",
    jobId: row.jobId,
    type: row.type as JobEvent["type"],
    message: normalizeOptional(row.message),
    progress: normalizeOptional(row.progress) ? Number(row.progress) : null,
    createdAt: row.createdAt,
  }));
});

When("I summarize job events", () => {
  jobEventSummaries = summarizeJobEvents(jobEvents);
});

Then(
  "the job event summary for {string} status message should be {string}",
  (jobId: string, expected: string) => {
    const summary = jobEventSummaries?.get(jobId);
    assert.equal(summary?.status?.message, expected);
  },
);

Then(
  "the job event summary for {string} progress should be {string}",
  (jobId: string, expected: string) => {
    const summary = jobEventSummaries?.get(jobId);
    assert.equal(summary?.progress?.progress, Number(expected));
  },
);

Then(
  "the job event summary for {string} log message should be {string}",
  (jobId: string, expected: string) => {
    const summary = jobEventSummaries?.get(jobId);
    assert.equal(summary?.log?.message, expected);
  },
);
