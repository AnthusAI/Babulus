import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import {
  buildGenerationRunRecord,
  buildGenerationRunInput,
  buildOrgRecord,
  buildOrgMemberInput,
  buildOrgMemberRecord,
  buildBillingAccountInput,
  buildUserProfileRecord,
  buildConversationRecord,
  buildMessageInput,
  buildApprovalRecord,
  buildUsageEventRecord,
  buildRenderAgentRecord,
  buildAssetInput,
  buildAssetRecord,
  buildJobInput,
  buildJobRecord,
  buildJobEventRecord,
  buildProjectRecord,
  buildProjectInput,
  buildRenderRunRecord,
  buildRenderRunInput,
  buildStoryboardVersionRecord,
  buildStoryboardVersionInput,
  buildVideoRecord,
  buildVideoInput,
  type CreateGenerationRunInput,
  type CreateOrgInput,
  type CreateOrgMemberInput,
  type CreateBillingAccountInput,
  type CreateUserProfileInput,
  type CreateConversationInput,
  type CreateMessageInput,
  type CreateApprovalInput,
  type CreateUsageEventInput,
  type CreateRenderAgentInput,
  type CreateAssetInput,
  type CreateJobInput,
  type CreateJobEventInput,
  type CreateProjectInput,
  type CreateRenderRunInput,
  type CreateStoryboardVersionInput,
  type CreateVideoInput,
  type RecordContext,
} from "../../packages/shared/src/records.js";

let projectInput: CreateProjectInput | null = null;
let orgInput: CreateOrgInput | null = null;
let orgMemberInput: CreateOrgMemberInput | null = null;
let billingInput: CreateBillingAccountInput | null = null;
let userInput: CreateUserProfileInput | null = null;
let conversationInput: CreateConversationInput | null = null;
let messageInput: CreateMessageInput | null = null;
let approvalInput: CreateApprovalInput | null = null;
let usageInput: CreateUsageEventInput | null = null;
let renderAgentInput: CreateRenderAgentInput | null = null;
let videoInput: CreateVideoInput | null = null;
let storyboardInput: CreateStoryboardVersionInput | null = null;
let generationRunInput: CreateGenerationRunInput | null = null;
let renderRunInput: CreateRenderRunInput | null = null;
let jobInput: CreateJobInput | null = null;
let jobEventInput: CreateJobEventInput | null = null;
let assetInput: CreateAssetInput | null = null;
let recordError: string | null = null;
let lastRecord: Record<string, unknown> | null = null;
let recordContext: RecordContext | null = null;

Before(() => {
  projectInput = null;
  orgInput = null;
  orgMemberInput = null;
  billingInput = null;
  userInput = null;
  conversationInput = null;
  messageInput = null;
  approvalInput = null;
  usageInput = null;
  renderAgentInput = null;
  videoInput = null;
  storyboardInput = null;
  generationRunInput = null;
  renderRunInput = null;
  jobInput = null;
  jobEventInput = null;
  assetInput = null;
  recordError = null;
  lastRecord = null;
  recordContext = null;
});

const reset = () => {
  recordError = null;
  lastRecord = null;
};

const normalizeOptional = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") {
    return null;
  }
  return trimmed;
};

Given(
  "a project input with org {string} name {string} template {string}",
  (orgId: string, name: string, templateId: string) => {
    reset();
    projectInput = {
      orgId: normalizeOptional(orgId),
      name,
      templateId: normalizeOptional(templateId),
    };
  },
);

Given("an org input with name {string} plan {string}", (name: string, planTier: string) => {
  reset();
  orgInput = {
    name,
    planTier: normalizeOptional(planTier),
  };
});

Given("a user input with email {string} name {string}", (email: string, displayName: string) => {
  reset();
  userInput = {
    email: normalizeOptional(email),
    displayName: normalizeOptional(displayName),
  };
});

Given("a conversation input with org {string} video {string}", (orgId: string, videoId: string) => {
  reset();
  conversationInput = {
    orgId: normalizeOptional(orgId),
    videoId: normalizeOptional(videoId),
  };
});

Given(
  "a message input with org {string} conversation {string} role {string} content {string}",
  (orgId: string, conversationId: string, role: string, content: string) => {
    reset();
    messageInput = {
      orgId: normalizeOptional(orgId),
      conversationId,
      role: role as CreateMessageInput["role"],
      content,
    };
  },
);

Given(
  "an approval input with org {string} video {string} kind {string} status {string}",
  (orgId: string, videoId: string, kind: string, status: string) => {
    reset();
    approvalInput = {
      orgId: normalizeOptional(orgId),
      videoId,
      kind,
      status: normalizeOptional(status) as CreateApprovalInput["status"],
    };
  },
);

Given(
  "a usage input with org {string} video {string} run {string} provider {string} unit {string} quantity {string}",
  (orgId: string, videoId: string, runId: string, provider: string, unitType: string, quantity: string) => {
    reset();
    usageInput = {
      orgId: normalizeOptional(orgId),
      videoId: normalizeOptional(videoId),
      runId: normalizeOptional(runId),
      provider: normalizeOptional(provider),
      unitType: unitType as CreateUsageEventInput["unitType"],
      quantity: Number(quantity),
    };
  },
);

Given(
  "a render agent input with org {string} label {string} status {string}",
  (orgId: string, label: string, status: string) => {
    reset();
    renderAgentInput = {
      orgId: normalizeOptional(orgId),
      label: normalizeOptional(label),
      status: normalizeOptional(status) as CreateRenderAgentInput["status"],
    };
  },
);

Given(
  "an org member input with org {string} user {string} role {string}",
  (orgId: string, userId: string, role: string) => {
    reset();
    orgMemberInput = {
      orgId: normalizeOptional(orgId),
      userId,
      role: normalizeOptional(role) as CreateOrgMemberInput["role"],
    };
  },
);

Given(
  "a billing input with org {string} mode {string} visibility {string} plan {string}",
  (orgId: string, billingMode: string, visibility: string, planId: string) => {
    reset();
    billingInput = {
      orgId: normalizeOptional(orgId),
      billingMode: billingMode as CreateBillingAccountInput["billingMode"],
      usageVisibilityMode: normalizeOptional(visibility) as CreateBillingAccountInput["usageVisibilityMode"],
      planId: normalizeOptional(planId),
    };
  },
);

Given(
  "a job event input with org {string} job {string} type {string} message {string} progress {string}",
  (orgId: string, jobId: string, type: string, message: string, progress: string) => {
    reset();
    jobEventInput = {
      orgId: normalizeOptional(orgId),
      jobId,
      type: type as CreateJobEventInput["type"],
      message: normalizeOptional(message),
      progress: normalizeOptional(progress) ? Number(progress) : null,
    };
  },
);

Given("record context id {string} now {string}", (idValue: string, nowIso: string) => {
  reset();
  recordContext = {
    id: () => idValue,
    now: () => new Date(nowIso),
  };
});

Given(
  "an asset input with org {string} project {string} kind {string} sha {string} file {string} storage {string}",
  (orgId: string, projectId: string, kind: string, sha256: string, fileName: string, storageKey: string) => {
    reset();
    assetInput = {
      orgId: normalizeOptional(orgId),
      projectId: normalizeOptional(projectId),
      kind: kind as CreateAssetInput["kind"],
      sha256: normalizeOptional(sha256),
      fileName: normalizeOptional(fileName),
      storageKey: normalizeOptional(storageKey),
    };
  },
);

When("I build a project input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildProjectInput(projectInput ?? { name: "" }, activeOrgId);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build an org record", () => {
  reset();
  try {
    lastRecord = buildOrgRecord(orgInput ?? { name: "" }, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a user profile record", () => {
  reset();
  try {
    lastRecord = buildUserProfileRecord(userInput ?? {}, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a conversation record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildConversationRecord(conversationInput ?? {}, activeOrgId, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a message input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildMessageInput(
      messageInput ?? { conversationId: "", role: "user", content: "" },
      activeOrgId,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build an approval record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildApprovalRecord(approvalInput ?? { videoId: "", kind: "" }, activeOrgId, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a usage record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildUsageEventRecord(
      usageInput ?? { unitType: "tokens", quantity: 0 },
      activeOrgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a render agent record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildRenderAgentRecord(
      renderAgentInput ?? {},
      activeOrgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build an org member input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildOrgMemberInput(orgMemberInput ?? { userId: "" }, activeOrgId);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build an org member record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildOrgMemberRecord(
      orgMemberInput ?? { userId: "" },
      activeOrgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a billing input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildBillingAccountInput(
      billingInput ?? { billingMode: "byok" },
      activeOrgId,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a project record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildProjectRecord(projectInput ?? { name: "" }, activeOrgId, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

Then("the project org should be {string}", (expected: string) => {
  assert.equal(lastRecord?.orgId, expected);
});

Then("the project name should be {string}", (expected: string) => {
  assert.equal(lastRecord?.name, expected);
});

Then("the org name should be {string}", (expected: string) => {
  assert.equal(lastRecord?.name, expected);
});

Then("the user email should be {string}", (expected: string) => {
  assert.equal(lastRecord?.email, expected);
});

Then("the user display name should be {string}", (expected: string) => {
  assert.equal(lastRecord?.displayName, expected);
});

Then("the conversation org should be {string}", (expected: string) => {
  assert.equal(lastRecord?.orgId, expected);
});

Then("the conversation video should be {string}", (expected: string) => {
  assert.equal(lastRecord?.videoId, expected);
});

Then("the approval status should be {string}", (expected: string) => {
  assert.equal(lastRecord?.status, expected);
});

Then("the usage unit should be {string}", (expected: string) => {
  assert.equal(lastRecord?.unitType, expected);
});

Then("the usage quantity should be {string}", (expected: string) => {
  assert.equal(lastRecord?.quantity, Number(expected));
});

Then("the render agent status should be {string}", (expected: string) => {
  assert.equal(lastRecord?.status, expected);
});

Then("the org member org should be {string}", (expected: string) => {
  assert.equal(lastRecord?.orgId, expected);
});

Then("the org member role should be {string}", (expected: string) => {
  assert.equal(lastRecord?.role, expected);
});

Then("the billing org should be {string}", (expected: string) => {
  assert.equal(lastRecord?.orgId, expected);
});

Then("the billing visibility should be {string}", (expected: string) => {
  assert.equal(lastRecord?.usageVisibilityMode, expected);
});

Given(
  "a video input with org {string} project {string} title {string} status {string}",
  (orgId: string, projectId: string, title: string, status: string) => {
    reset();
    videoInput = {
      orgId: normalizeOptional(orgId),
      projectId,
      title,
      status: normalizeOptional(status) as CreateVideoInput["status"],
    };
  },
);

When("I build a video input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildVideoInput(videoInput ?? { projectId: "", title: "" }, activeOrgId);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a video record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildVideoRecord(videoInput ?? { projectId: "", title: "" }, activeOrgId, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

Then("the video org should be {string}", (expected: string) => {
  assert.equal(lastRecord?.orgId, expected);
});

Then("the video status should be {string}", (expected: string) => {
  assert.equal(lastRecord?.status, expected);
});

Given(
  "a storyboard input with org {string} video {string} source {string} parent {string}",
  (orgId: string, videoId: string, sourceText: string, parentVersionId: string) => {
    reset();
    storyboardInput = {
      orgId: normalizeOptional(orgId),
      videoId,
      sourceText,
      parentVersionId: normalizeOptional(parentVersionId),
    };
  },
);

When("I build a storyboard input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildStoryboardVersionInput(storyboardInput ?? { videoId: "", sourceText: "" }, activeOrgId);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a storyboard record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildStoryboardVersionRecord(
      storyboardInput ?? { videoId: "", sourceText: "" },
      activeOrgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

Given(
  "a generation run input with org {string} video {string} storyboard {string} status {string}",
  (orgId: string, videoId: string, storyboardVersionId: string, status: string) => {
    reset();
    generationRunInput = {
      orgId: normalizeOptional(orgId),
      videoId,
      storyboardVersionId,
      status: normalizeOptional(status) as CreateGenerationRunInput["status"],
    };
  },
);

When("I build a generation run input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildGenerationRunInput(
      generationRunInput ?? { videoId: "", storyboardVersionId: "" },
      activeOrgId,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a generation run record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildGenerationRunRecord(
      generationRunInput ?? { videoId: "", storyboardVersionId: "" },
      activeOrgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

Then("the run status should be {string}", (expected: string) => {
  assert.equal(lastRecord?.status, expected);
});

Then("the job idempotency key should be {string}", (expected: string) => {
  assert.equal(lastRecord?.idempotencyKey, expected);
});

Given(
  "a render run input with org {string} video {string} generation {string} status {string}",
  (orgId: string, videoId: string, generationRunId: string, status: string) => {
    reset();
    renderRunInput = {
      orgId: normalizeOptional(orgId),
      videoId,
      generationRunId,
      status: normalizeOptional(status) as CreateRenderRunInput["status"],
    };
  },
);

Given("a job input with org {string} kind {string} status {string}", (orgId: string, kind: string, status: string) => {
  reset();
  jobInput = {
    orgId: normalizeOptional(orgId),
    kind: kind as CreateJobInput["kind"],
    status: normalizeOptional(status) as CreateJobInput["status"],
  };
});

Given(
  "a job input with org {string} kind {string} status {string} idempotency {string}",
  (orgId: string, kind: string, status: string, idempotencyKey: string) => {
    reset();
    jobInput = {
      orgId: normalizeOptional(orgId),
      kind: kind as CreateJobInput["kind"],
      status: normalizeOptional(status) as CreateJobInput["status"],
      idempotencyKey: normalizeOptional(idempotencyKey),
    };
  },
);

When("I build a render run input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildRenderRunInput(renderRunInput ?? { videoId: "", generationRunId: "" }, activeOrgId);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a job input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildJobInput(jobInput ?? { kind: "render" }, activeOrgId);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build an asset input with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildAssetInput(
      assetInput ?? { kind: "image", sha256: "abc123", fileName: "asset.png" },
      activeOrgId,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a render run record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildRenderRunRecord(
      renderRunInput ?? { videoId: "", generationRunId: "" },
      activeOrgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a job record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildJobRecord(jobInput ?? { kind: "render" }, activeOrgId, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build a job event record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildJobEventRecord(jobEventInput ?? { jobId: "", type: "status" }, activeOrgId, recordContext ?? undefined);
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

When("I build an asset record with active org {string}", (activeOrgId: string) => {
  reset();
  try {
    lastRecord = buildAssetRecord(
      assetInput ?? { kind: "image", sha256: "abc123", fileName: "asset.png" },
      activeOrgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    recordError = error instanceof Error ? error.message : String(error);
  }
});

Then("the record error should include {string}", (snippet: string) => {
  assert.ok(recordError?.includes(snippet));
});

Then("the record id should be {string}", (expected: string) => {
  assert.equal(lastRecord?.id, expected);
});

Then("the record createdAt should be {string}", (expected: string) => {
  assert.equal(lastRecord?.createdAt, expected);
});

Then("the generation run audio key should be {string}", (expected: string) => {
  if (expected.toLowerCase() === "none") {
    assert.equal(lastRecord?.audioArtifactKey ?? null, null);
    return;
  }
  assert.equal(lastRecord?.audioArtifactKey, expected);
});

Then("the generation run script key should be {string}", (expected: string) => {
  assert.equal(lastRecord?.scriptArtifactKey, expected);
});

Then("the generation run timeline key should be {string}", (expected: string) => {
  assert.equal(lastRecord?.timelineArtifactKey, expected);
});

Then("the generation run logs key should be {string}", (expected: string) => {
  assert.equal(lastRecord?.logsArtifactKey, expected);
});

Then("the render run mp4 key should be {string}", (expected: string) => {
  assert.equal(lastRecord?.mp4ArtifactKey, expected);
});

Then("the render run stills prefix should be {string}", (expected: string) => {
  assert.equal(lastRecord?.stillsArtifactPrefix, expected);
});

Then("the render run logs key should be {string}", (expected: string) => {
  assert.equal(lastRecord?.logsArtifactKey, expected);
});

Then("the job org should be {string}", (expected: string) => {
  assert.equal(lastRecord?.orgId, expected);
});

Then("the job status should be {string}", (expected: string) => {
  assert.equal(lastRecord?.status, expected);
});

Then("the job event job should be {string}", (expected: string) => {
  assert.equal(lastRecord?.jobId, expected);
});

Then("the job event type should be {string}", (expected: string) => {
  assert.equal(lastRecord?.type, expected);
});

Then("the job event message should be {string}", (expected: string) => {
  assert.equal(lastRecord?.message, expected);
});

Then("the job event progress should be {string}", (expected: string) => {
  const value = lastRecord?.progress;
  if (expected === "none") {
    assert.equal(value ?? null, null);
    return;
  }
  assert.equal(value, Number(expected));
});

Then("the job createdAt should be {string}", (expected: string) => {
  assert.equal(lastRecord?.createdAt, expected);
});

Then("the asset storage key should be {string}", (expected: string) => {
  assert.equal(lastRecord?.storageKey, expected);
});
