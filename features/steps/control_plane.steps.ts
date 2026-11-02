import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  createControlPlaneStore,
  createOrg,
  createOrgMember,
  createBillingAccount,
  createUserProfile,
  createConversation,
  createMessage,
  createApproval,
  createUsageEvent,
  createRenderAgent,
  createGenerationRun,
  createJob,
  createJobEvent,
  createProject,
  createRenderRun,
  createStoryboardVersion,
  createVideo,
  createAsset,
  claimJob,
  claimJobWithEvent,
  listOrgs,
  listOrgMembers,
  listUserMemberships,
  listUsers,
  listBillingAccounts,
  listConversations,
  listMessages,
  listApprovals,
  listUsageEvents,
  listRenderAgents,
  listJobs,
  listJobEvents,
  listGenerationRuns,
  listAssets,
  listProjects,
  listRenderRuns,
  listStoryboardVersions,
  listVideos,
  setActiveStoryboardVersion,
  setGenerationRunStatus,
  setJobStatus,
  setJobStatusWithEvent,
  setRenderRunStatus,
  setOrgMemberRole,
  setBillingVisibility,
  setApprovalStatus,
  setRenderAgentStatus,
  setVideoStatus,
  type ControlPlaneStore,
} from "../../packages/shared/src/control-plane.js";
import type {
  CreateGenerationRunInput,
  CreateAssetInput,
  CreateOrgInput,
  CreateOrgMemberInput,
  CreateBillingAccountInput,
  CreateUserProfileInput,
  CreateConversationInput,
  CreateMessageInput,
  CreateApprovalInput,
  CreateUsageEventInput,
  CreateRenderAgentInput,
  CreateJobInput,
  CreateJobEventInput,
  CreateProjectInput,
  CreateRenderRunInput,
  CreateStoryboardVersionInput,
  CreateVideoInput,
  RecordContext,
} from "../../packages/shared/src/records.js";
import type { Approval, BillingAccount, JobStatus, OrgMember, RenderAgent, RunStatus, VideoStatus } from "../../packages/shared/src/index.js";

let store: ControlPlaneStore | null = null;
let recordContext: RecordContext | null = null;
let controlPlaneError: string | null = null;
let projectInput: CreateProjectInput | null = null;
let videoInput: CreateVideoInput | null = null;
let storyboardInput: CreateStoryboardVersionInput | null = null;
let generationRunInput: CreateGenerationRunInput | null = null;
let renderRunInput: CreateRenderRunInput | null = null;
let jobInput: CreateJobInput | null = null;
let jobEventInput: CreateJobEventInput | null = null;
let assetInput: CreateAssetInput | null = null;
let orgInput: CreateOrgInput | null = null;
let orgMemberInput: CreateOrgMemberInput | null = null;
let billingInput: CreateBillingAccountInput | null = null;
let userInput: CreateUserProfileInput | null = null;
let conversationInput: CreateConversationInput | null = null;
let messageInput: CreateMessageInput | null = null;
let approvalInput: CreateApprovalInput | null = null;
let usageInput: CreateUsageEventInput | null = null;
let renderAgentInput: CreateRenderAgentInput | null = null;

const normalizeOptional = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") {
    return null;
  }
  return trimmed;
};

const reset = () => {
  controlPlaneError = null;
};

Given("a control plane store", () => {
  store = createControlPlaneStore();
  recordContext = null;
  projectInput = null;
  videoInput = null;
  storyboardInput = null;
  generationRunInput = null;
  renderRunInput = null;
  jobInput = null;
  jobEventInput = null;
  assetInput = null;
  orgInput = null;
  orgMemberInput = null;
  billingInput = null;
  userInput = null;
  conversationInput = null;
  messageInput = null;
  approvalInput = null;
  usageInput = null;
  jobEventInput = null;
  renderAgentInput = null;
  reset();
});

Given("a control plane project input with name {string}", (name: string) => {
  projectInput = { name };
});

Given("a control plane org input with name {string}", (name: string) => {
  orgInput = { name };
});

Given(
  "a control plane org member input with org {string} user {string} role {string}",
  (orgId: string, userId: string, role: string) => {
    orgMemberInput = {
      orgId: normalizeOptional(orgId),
      userId,
      role: normalizeOptional(role) as CreateOrgMemberInput["role"],
    };
  },
);

Given(
  "a control plane billing input with org {string} mode {string} visibility {string} plan {string}",
  (orgId: string, billingMode: string, visibility: string, planId: string) => {
    billingInput = {
      orgId: normalizeOptional(orgId),
      billingMode: billingMode as CreateBillingAccountInput["billingMode"],
      usageVisibilityMode: normalizeOptional(visibility) as CreateBillingAccountInput["usageVisibilityMode"],
      planId: normalizeOptional(planId),
    };
  },
);

Given("a control plane user input with email {string} name {string}", (email: string, displayName: string) => {
  userInput = {
    email: normalizeOptional(email),
    displayName: normalizeOptional(displayName),
  };
});

Given("a control plane conversation input with video {string}", (videoId: string) => {
  conversationInput = {
    videoId: normalizeOptional(videoId),
  };
});

Given(
  "a control plane message input with conversation {string} role {string} content {string}",
  (conversationId: string, role: string, content: string) => {
    messageInput = {
      conversationId,
      role: role as CreateMessageInput["role"],
      content,
    };
  },
);

Given(
  "a control plane approval input with video {string} kind {string} status {string}",
  (videoId: string, kind: string, status: string) => {
    approvalInput = {
      videoId,
      kind,
      status: normalizeOptional(status) as CreateApprovalInput["status"],
    };
  },
);

Given(
  "a control plane usage input with video {string} run {string} provider {string} unit {string} quantity {string}",
  (videoId: string, runId: string, provider: string, unitType: string, quantity: string) => {
    usageInput = {
      videoId,
      runId: normalizeOptional(runId),
      provider: normalizeOptional(provider),
      unitType: unitType as CreateUsageEventInput["unitType"],
      quantity: Number(quantity),
    };
  },
);

Given(
  "a control plane render agent input with label {string} status {string}",
  (label: string, status: string) => {
    renderAgentInput = {
      label: normalizeOptional(label),
      status: normalizeOptional(status) as CreateRenderAgentInput["status"],
    };
  },
);

Given(
  "a control plane asset input with project {string} kind {string} sha {string} file {string} storage {string}",
  (projectId: string, kind: string, sha256: string, fileName: string, storageKey: string) => {
    assetInput = {
      projectId: normalizeOptional(projectId),
      kind: kind as CreateAssetInput["kind"],
      sha256: normalizeOptional(sha256),
      fileName: normalizeOptional(fileName),
      storageKey: normalizeOptional(storageKey),
    };
  },
);

Given("a control plane video input with project {string} title {string}", (projectId: string, title: string) => {
  videoInput = { projectId, title };
});

Given("a control plane storyboard input with video {string} source {string}", (videoId: string, sourceText: string) => {
  storyboardInput = { videoId, sourceText };
});

Given(
  "a control plane generation run input with video {string} storyboard {string}",
  (videoId: string, storyboardVersionId: string) => {
    generationRunInput = { videoId, storyboardVersionId };
  },
);

Given(
  "a control plane render run input with generation {string} video {string}",
  (generationRunId: string, videoId: string) => {
    renderRunInput = { generationRunId, videoId };
  },
);

Given("a control plane job input with kind {string} status {string}", (kind: string, status: string) => {
  jobInput = {
    kind: kind as CreateJobInput["kind"],
    status: status === "none" ? undefined : (status as JobStatus),
  };
});

Given(
  "a control plane job input with kind {string} status {string} idempotency {string}",
  (kind: string, status: string, idempotencyKey: string) => {
    jobInput = {
      kind: kind as CreateJobInput["kind"],
      status: status === "none" ? undefined : (status as JobStatus),
      idempotencyKey: normalizeOptional(idempotencyKey),
    };
  },
);

Given(
  "a control plane job event input with job {string} type {string} message {string} progress {string}",
  (jobId: string, type: string, message: string, progress: string) => {
    jobEventInput = {
      jobId,
      type: type as CreateJobEventInput["type"],
      message: normalizeOptional(message),
      progress: normalizeOptional(progress) ? Number(progress) : null,
    };
  },
);

Given("control plane record context id {string} now {string}", (idValue: string, nowIso: string) => {
  recordContext = {
    id: () => idValue,
    now: () => new Date(nowIso),
  };
});

When("I create an org", () => {
  reset();
  try {
    createOrg(store ?? createControlPlaneStore(), orgInput ?? { name: "" }, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create an org member in org {string}", (orgId: string) => {
  reset();
  try {
    createOrgMember(
      store ?? createControlPlaneStore(),
      orgMemberInput ?? { userId: "" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a billing account in org {string}", (orgId: string) => {
  reset();
  try {
    createBillingAccount(
      store ?? createControlPlaneStore(),
      billingInput ?? { billingMode: "byok" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a user profile", () => {
  reset();
  try {
    createUserProfile(store ?? createControlPlaneStore(), userInput ?? {}, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a conversation in org {string}", (orgId: string) => {
  reset();
  try {
    createConversation(store ?? createControlPlaneStore(), conversationInput ?? {}, orgId, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a message in org {string}", (orgId: string) => {
  reset();
  try {
    createMessage(
      store ?? createControlPlaneStore(),
      messageInput ?? { conversationId: "", role: "user", content: "" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create an approval in org {string}", (orgId: string) => {
  reset();
  try {
    createApproval(
      store ?? createControlPlaneStore(),
      approvalInput ?? { videoId: "", kind: "" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a usage event in org {string}", (orgId: string) => {
  reset();
  try {
    createUsageEvent(
      store ?? createControlPlaneStore(),
      usageInput ?? { unitType: "tokens", quantity: 0 },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a render agent in org {string}", (orgId: string) => {
  reset();
  try {
    createRenderAgent(store ?? createControlPlaneStore(), renderAgentInput ?? {}, orgId, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a project in org {string}", (orgId: string) => {
  reset();
  try {
    createProject(store ?? createControlPlaneStore(), projectInput ?? { name: "" }, orgId, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create an asset in org {string}", (orgId: string) => {
  reset();
  try {
    createAsset(
      store ?? createControlPlaneStore(),
      assetInput ?? { kind: "image", sha256: "abc", fileName: "asset.png" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a video in org {string}", (orgId: string) => {
  reset();
  try {
    createVideo(
      store ?? createControlPlaneStore(),
      videoInput ?? { projectId: "", title: "" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a storyboard version in org {string}", (orgId: string) => {
  reset();
  try {
    createStoryboardVersion(
      store ?? createControlPlaneStore(),
      storyboardInput ?? { videoId: "", sourceText: "" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a generation run in org {string}", (orgId: string) => {
  reset();
  try {
    createGenerationRun(
      store ?? createControlPlaneStore(),
      generationRunInput ?? { videoId: "", storyboardVersionId: "" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a render run in org {string}", (orgId: string) => {
  reset();
  try {
    createRenderRun(
      store ?? createControlPlaneStore(),
      renderRunInput ?? { videoId: "", generationRunId: "" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a job in org {string}", (orgId: string) => {
  reset();
  try {
    createJob(store ?? createControlPlaneStore(), jobInput ?? { kind: "render" }, orgId, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When("I create a job event in org {string}", (orgId: string) => {
  reset();
  try {
    createJobEvent(
      store ?? createControlPlaneStore(),
      jobEventInput ?? { jobId: "", type: "status" },
      orgId,
      recordContext ?? undefined,
    );
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

Then("the control plane project ids should be {string}", (expected: string) => {
  const ids = store?.projects.map((project) => project.id).join(",") ?? "";
  assert.equal(ids, expected);
});

Then("the listed org ids for user {string} should be {string}", (userId: string, expected: string) => {
  const ids = listOrgs(store ?? createControlPlaneStore(), userId)
    .map((org) => org.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed org member ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listOrgMembers(store ?? createControlPlaneStore(), orgId)
    .map((membership) => membership.userId)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed billing ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listBillingAccounts(store ?? createControlPlaneStore(), orgId)
    .map((account) => account.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed user ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listUsers(store ?? createControlPlaneStore(), orgId)
    .map((user) => user.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed conversation ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listConversations(store ?? createControlPlaneStore(), orgId)
    .map((conversation) => conversation.id)
    .join(",");
  assert.equal(ids, expected);
});

Then(
  "the listed message ids for org {string} conversation {string} should be {string}",
  (orgId: string, conversationId: string, expected: string) => {
    const ids = listMessages(store ?? createControlPlaneStore(), orgId, conversationId)
      .map((message) => message.id)
      .join(",");
    assert.equal(ids, expected);
  },
);

Then("the listed approval ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listApprovals(store ?? createControlPlaneStore(), orgId)
    .map((approval) => approval.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed usage ids for org {string} video {string} should be {string}", (orgId: string, videoId: string, expected: string) => {
  const ids = listUsageEvents(store ?? createControlPlaneStore(), orgId, videoId)
    .map((event) => event.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed render agent ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listRenderAgents(store ?? createControlPlaneStore(), orgId)
    .map((agent) => agent.id)
    .join(",");
  assert.equal(ids, expected);
});

When(
  "I set billing {string} visibility to {string} in org {string}",
  (billingId: string, visibility: string, orgId: string) => {
    reset();
    try {
      setBillingVisibility(
        store ?? createControlPlaneStore(),
        billingId,
        visibility as BillingAccount["usageVisibilityMode"],
        orgId,
      );
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

Then(
  "the billing visibility for {string} in org {string} should be {string}",
  (billingId: string, orgId: string, expected: string) => {
    const account = (store ?? createControlPlaneStore()).billingAccounts.find((entry) => entry.id === billingId);
    assert.equal(account?.orgId, orgId);
    assert.equal(account?.usageVisibilityMode, expected);
  },
);

Then("the listed project ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listProjects(store ?? createControlPlaneStore(), orgId)
    .map((project) => project.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed asset ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listAssets(store ?? createControlPlaneStore(), orgId)
    .map((asset) => asset.id)
    .join(",");
  assert.equal(ids, expected);
});

Then(
  "the listed asset ids for org {string} project {string} should be {string}",
  (orgId: string, projectId: string, expected: string) => {
    const ids = listAssets(store ?? createControlPlaneStore(), orgId, projectId)
      .map((asset) => asset.id)
      .join(",");
    assert.equal(ids, expected);
  },
);

Then("the listed video ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listVideos(store ?? createControlPlaneStore(), orgId)
    .map((video) => video.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed storyboard ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listStoryboardVersions(store ?? createControlPlaneStore(), orgId)
    .map((version) => version.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed generation run ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listGenerationRuns(store ?? createControlPlaneStore(), orgId)
    .map((run) => run.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed render run ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listRenderRuns(store ?? createControlPlaneStore(), orgId)
    .map((run) => run.id)
    .join(",");
  assert.equal(ids, expected);
});

Then("the listed job ids for org {string} should be {string}", (orgId: string, expected: string) => {
  const ids = listJobs(store ?? createControlPlaneStore(), orgId)
    .map((job) => job.id)
    .join(",");
  assert.equal(ids, expected);
});

Then(
  "the listed job event ids for org {string} job {string} should be {string}",
  (orgId: string, jobId: string, expected: string) => {
    const ids = listJobEvents(store ?? createControlPlaneStore(), orgId, jobId)
      .map((event) => event.id)
      .join(",");
    assert.equal(ids, expected);
  },
);

When("I set video {string} status to {string} in org {string}", (videoId: string, status: string, orgId: string) => {
  reset();
  try {
    setVideoStatus(store ?? createControlPlaneStore(), videoId, status as VideoStatus, orgId);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When(
  "I set generation run {string} status to {string} in org {string}",
  (runId: string, status: string, orgId: string) => {
    reset();
    try {
      setGenerationRunStatus(store ?? createControlPlaneStore(), runId, status as RunStatus, orgId);
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I set render run {string} status to {string} in org {string}",
  (runId: string, status: string, orgId: string) => {
    reset();
    try {
      setRenderRunStatus(store ?? createControlPlaneStore(), runId, status as RunStatus, orgId);
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

When("I claim job {string} for agent {string} in org {string}", (jobId: string, agentId: string, orgId: string) => {
  reset();
  try {
    claimJob(store ?? createControlPlaneStore(), jobId, agentId, orgId, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When(
  "I claim job {string} for agent {string} with event in org {string}",
  (jobId: string, agentId: string, orgId: string) => {
    reset();
    try {
      claimJobWithEvent(store ?? createControlPlaneStore(), jobId, agentId, orgId, undefined, recordContext ?? undefined);
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

When("I set job {string} status to {string} in org {string}", (jobId: string, status: string, orgId: string) => {
  reset();
  try {
    setJobStatus(store ?? createControlPlaneStore(), jobId, status as JobStatus, orgId, recordContext ?? undefined);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

When(
  "I set job {string} status to {string} with event in org {string}",
  (jobId: string, status: string, orgId: string) => {
    reset();
    try {
      setJobStatusWithEvent(
        store ?? createControlPlaneStore(),
        jobId,
        status as JobStatus,
        orgId,
        undefined,
        recordContext ?? undefined,
      );
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I set approval {string} status to {string} in org {string}",
  (approvalId: string, status: string, orgId: string) => {
    reset();
    try {
      setApprovalStatus(store ?? createControlPlaneStore(), approvalId, status as Approval["status"], orgId);
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I set render agent {string} status to {string} in org {string}",
  (agentId: string, status: string, orgId: string) => {
    reset();
    try {
      setRenderAgentStatus(store ?? createControlPlaneStore(), agentId, status as RenderAgent["status"], orgId);
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I set video {string} active storyboard to {string} in org {string}",
  (videoId: string, storyboardVersionId: string, orgId: string) => {
    reset();
    try {
      setActiveStoryboardVersion(
        store ?? createControlPlaneStore(),
        videoId,
        storyboardVersionId,
        orgId,
      );
    } catch (error) {
      controlPlaneError = error instanceof Error ? error.message : String(error);
    }
  },
);

Then("the video status for {string} should be {string}", (videoId: string, expected: string) => {
  const video = (store ?? createControlPlaneStore()).videos.find((entry) => entry.id === videoId);
  assert.equal(video?.status, expected);
});

Then("the generation run status for {string} should be {string}", (runId: string, expected: string) => {
  const run = (store ?? createControlPlaneStore()).generationRuns.find((entry) => entry.id === runId);
  assert.equal(run?.status, expected);
});

Then("the render run status for {string} should be {string}", (runId: string, expected: string) => {
  const run = (store ?? createControlPlaneStore()).renderRuns.find((entry) => entry.id === runId);
  assert.equal(run?.status, expected);
});

Then("the job status for {string} should be {string}", (jobId: string, expected: string) => {
  const job = (store ?? createControlPlaneStore()).jobs.find((entry) => entry.id === jobId);
  assert.equal(job?.status, expected);
});

Then("the approval status for {string} should be {string}", (approvalId: string, expected: string) => {
  const approval = (store ?? createControlPlaneStore()).approvals.find((entry) => entry.id === approvalId);
  assert.equal(approval?.status, expected);
});

Then("the render agent status for {string} should be {string}", (agentId: string, expected: string) => {
  const agent = (store ?? createControlPlaneStore()).renderAgents.find((entry) => entry.id === agentId);
  assert.equal(agent?.status, expected);
});

Then("the job claimedBy for {string} should be {string}", (jobId: string, expected: string) => {
  const job = (store ?? createControlPlaneStore()).jobs.find((entry) => entry.id === jobId);
  assert.equal(job?.claimedByAgentId ?? null, expected === "none" ? null : expected);
});

When("I set org member {string} role to {string} in org {string}", (userId: string, role: string, orgId: string) => {
  reset();
  try {
    setOrgMemberRole(store ?? createControlPlaneStore(), userId, role as OrgMember["role"], orgId);
  } catch (error) {
    controlPlaneError = error instanceof Error ? error.message : String(error);
  }
});

Then(
  "the org member role for {string} in org {string} should be {string}",
  (userId: string, orgId: string, expected: string) => {
    const membership = (store ?? createControlPlaneStore()).orgMembers.find(
      (entry) => entry.orgId === orgId && entry.userId === userId,
    );
    assert.equal(membership?.role, expected);
  },
);

Then("the video active storyboard for {string} should be {string}", (videoId: string, expected: string) => {
  const video = (store ?? createControlPlaneStore()).videos.find((entry) => entry.id === videoId);
  assert.equal(video?.activeStoryboardVersionId, expected);
});

Then("the control plane error should include {string}", (snippet: string) => {
  assert.ok(controlPlaneError?.includes(snippet));
});
