import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { transitionVideoStatus, updateVideoStatus } from "../../packages/shared/src/video-status.js";
import type { Video, VideoStatus } from "../../packages/shared/src/index.js";

let currentStatus: VideoStatus | null = null;
let resolvedStatus: VideoStatus | null = null;
let statusError: string | null = null;
let videoRecord: Video | null = null;

const reset = () => {
  resolvedStatus = null;
  statusError = null;
};

Given("a video status {string}", (status: string) => {
  reset();
  currentStatus = status as VideoStatus;
});

When("I transition video status to {string}", (next: string) => {
  reset();
  try {
    resolvedStatus = transitionVideoStatus(currentStatus as VideoStatus, next as VideoStatus);
  } catch (error) {
    statusError = error instanceof Error ? error.message : String(error);
  }
});

Then("the transitioned video status should be {string}", (expected: string) => {
  assert.equal(resolvedStatus ?? videoRecord?.status, expected);
});

Then("the video status error should include {string}", (snippet: string) => {
  assert.ok(statusError?.includes(snippet));
});

Given("a video record with status {string}", (status: string) => {
  reset();
  videoRecord = {
    id: "vid-1",
    orgId: "acme",
    projectId: "proj-1",
    title: "Intro",
    status: status as VideoStatus,
    activeStoryboardVersionId: null,
    createdAt: "2026-01-22T10:00:00.000Z",
  };
});

When("I update the video status to {string}", (next: string) => {
  reset();
  try {
    videoRecord = updateVideoStatus(videoRecord as Video, next as VideoStatus);
  } catch (error) {
    statusError = error instanceof Error ? error.message : String(error);
  }
});
