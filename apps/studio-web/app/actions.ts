"use server";

/**
 * Server Actions for control-plane operations
 *
 * These actions bridge the GraphQL client (server-side) with client components.
 * They handle authentication automatically and provide a clean API for the UI.
 *
 * Usage in client components:
 *   import { createProjectAction } from "./actions";
 *
 *   const project = await createProjectAction({ name: "My Project" }, accountId);
 *
 * Every action takes the Account (as `orgId`) and checks it against the Accounts named by the caller's verified
 * ID token before doing anything; the Account passed in is never trusted by itself.
 */

import * as cp from "../lib/control-plane-graphql.js";
import type {
  Project,
  Video,
  StoryboardVersion,
  GenerationRun,
  RenderRun,
  Asset,
  Job,
  JobEvent,
  JobStatus,
  Conversation,
  Message,
  Approval,
  UsageEvent,
  RenderAgent,
  BillingAccount,
  CreateProjectInput,
  CreateVideoInput,
  CreateGenerationRunInput,
  CreateRenderRunInput,
  CreateAssetInput,
  CreateJobInput,
  CreateJobEventInput,
  CreateConversationInput,
  CreateMessageInput,
  CreateApprovalInput,
  CreateUsageEventInput,
  CreateRenderAgentInput,
  CreateBillingAccountInput,
  CreatePublishedVideoInput,
} from "@babulus/shared";

import { requireAccountForRequest } from "../lib/account-session.js";
import { publishAccountObject } from "../lib/account-media.js";

/** Check the caller belongs to the Account (throws a 403-style error otherwise). */
const authorize = (orgId: string) => requireAccountForRequest(null, orgId);

/** Check a record fetched by ID belongs to one of the caller's Accounts. */
async function authorizeRecord<T extends { orgId?: string | null } | null>(record: T): Promise<T> {
  if (record) {
    await authorize(record.orgId ?? "");
  }
  return record;
}

// Read operations (queries)

export async function getProjectsForOrg(orgId: string): Promise<Project[]> {
  await authorize(orgId);
  return cp.listProjects(orgId);
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  return authorizeRecord(await cp.getProject(projectId));
}

export async function getVideosForOrg(orgId: string, projectId?: string | null): Promise<Video[]> {
  await authorize(orgId);
  return cp.listVideos(orgId, projectId);
}

export async function getStoryboardVersion(
  orgId: string,
  versionId: string,
): Promise<StoryboardVersion | null> {
  await authorize(orgId);
  const versions = await cp.listStoryboardVersions(orgId);
  return versions.find(v => v.id === versionId) || null;
}


export async function getGenerationRuns(
  orgId: string,
  videoId?: string | null,
): Promise<GenerationRun[]> {
  await authorize(orgId);
  return cp.listGenerationRuns(orgId, videoId);
}

export async function getRenderRuns(
  orgId: string,
  generationRunId?: string | null,
  videoId?: string | null,
): Promise<RenderRun[]> {
  await authorize(orgId);
  return cp.listRenderRuns(orgId, generationRunId, videoId);
}

export async function getAssetsForOrg(orgId: string, projectId?: string | null): Promise<Asset[]> {
  await authorize(orgId);
  return cp.listAssets(orgId, projectId);
}

export async function getJobsForOrg(orgId: string, status?: JobStatus | null): Promise<Job[]> {
  await authorize(orgId);
  return cp.listJobs(orgId, status);
}

export async function getJobEventsForJob(orgId: string, jobId: string): Promise<JobEvent[]> {
  await authorize(orgId);
  return cp.listJobEvents(orgId, jobId);
}

export async function getConversationsForVideo(
  orgId: string,
  videoId?: string | null,
): Promise<Conversation[]> {
  await authorize(orgId);
  return cp.listConversations(orgId, videoId);
}

export async function getMessagesForConversation(
  orgId: string,
  conversationId?: string | null,
): Promise<Message[]> {
  await authorize(orgId);
  return cp.listMessages(orgId, conversationId);
}

export async function getApprovalsForVideo(
  orgId: string,
  videoId?: string | null,
): Promise<Approval[]> {
  await authorize(orgId);
  return cp.listApprovals(orgId, videoId);
}

export async function getUsageEventsForOrg(
  orgId: string,
  videoId?: string | null,
  runId?: string | null,
): Promise<UsageEvent[]> {
  await authorize(orgId);
  return cp.listUsageEvents(orgId, videoId, runId);
}

export async function getRenderAgentsForOrg(orgId: string): Promise<RenderAgent[]> {
  await authorize(orgId);
  return cp.listRenderAgents(orgId);
}

export async function getBillingAccountsForOrg(orgId: string): Promise<BillingAccount[]> {
  await authorize(orgId);
  return cp.listBillingAccounts(orgId);
}

// Write operations (mutations)

export async function createProjectAction(input: CreateProjectInput, orgId: string): Promise<Project> {
  await authorize(orgId);
  return cp.createProject(input, orgId);
}

export async function createVideoAction(input: CreateVideoInput, orgId: string): Promise<Video> {
  await authorize(orgId);
  return cp.createVideo(input, orgId);
}


export async function createGenerationRunAction(
  input: CreateGenerationRunInput,
  orgId: string,
): Promise<GenerationRun> {
  await authorize(orgId);
  return cp.createGenerationRun(input, orgId);
}

export async function createRenderRunAction(
  input: CreateRenderRunInput,
  orgId: string,
): Promise<RenderRun> {
  await authorize(orgId);
  return cp.createRenderRun(input, orgId);
}

export async function createAssetAction(input: CreateAssetInput, orgId: string): Promise<Asset> {
  await authorize(orgId);
  return cp.createAsset(input, orgId);
}

export async function createJobAction(input: CreateJobInput, orgId: string): Promise<Job> {
  await authorize(orgId);
  return cp.createJob(input, orgId);
}

export async function createJobEventAction(
  input: CreateJobEventInput,
  orgId: string,
): Promise<JobEvent> {
  await authorize(orgId);
  return cp.createJobEvent(input, orgId);
}

export async function createConversationAction(
  input: CreateConversationInput,
  orgId: string,
): Promise<Conversation> {
  await authorize(orgId);
  return cp.createConversation(input, orgId);
}

export async function createMessageAction(input: CreateMessageInput, orgId: string): Promise<Message> {
  await authorize(orgId);
  return cp.createMessage(input, orgId);
}

export async function createApprovalAction(
  input: CreateApprovalInput,
  orgId: string,
): Promise<Approval> {
  await authorize(orgId);
  return cp.createApproval(input, orgId);
}

export async function createUsageEventAction(
  input: CreateUsageEventInput,
  orgId: string,
): Promise<UsageEvent> {
  await authorize(orgId);
  return cp.createUsageEvent(input, orgId);
}

export async function createRenderAgentAction(
  input: CreateRenderAgentInput,
  orgId: string,
): Promise<RenderAgent> {
  await authorize(orgId);
  return cp.createRenderAgent(input, orgId);
}

export async function createBillingAccountAction(
  input: CreateBillingAccountInput,
  orgId: string,
): Promise<BillingAccount> {
  await authorize(orgId);
  return cp.createBillingAccount(input, orgId);
}

export async function createPublishedVideoAction(
  input: CreatePublishedVideoInput,
  orgId: string,
): Promise<import("@babulus/shared").PublishedVideo> {
  await authorize(orgId);
  const renderRun = await cp.getRenderRun(input.renderRunId);
  // The render run must belong to the same Account, and its file is copied by the server with its own role.
  if (!renderRun || renderRun.orgId !== orgId || !renderRun.mp4ArtifactKey) {
    throw new Error("Invalid render run for publishing");
  }

  try {
    await publishAccountObject(orgId, renderRun.mp4ArtifactKey, input.slug);
  } catch (e) {
    console.error("Failed to copy published artifact", e);
    throw new Error("Failed to publish video");
  }

  return cp.createPublishedVideo(input, orgId);
}

// Update operations

export async function setApprovalStatusAction(
  approvalId: string,
  status: Approval["status"],
  orgId: string,
  decidedBy?: string | null,
  decidedAt?: string | null,
): Promise<Approval> {
  await authorize(orgId);
  return cp.setApprovalStatus(approvalId, status, orgId, decidedBy, decidedAt);
}

export async function setRenderAgentStatusAction(
  agentId: string,
  status: RenderAgent["status"],
  orgId: string,
  lastSeenAt?: string | null,
): Promise<RenderAgent> {
  await authorize(orgId);
  return cp.setRenderAgentStatus(agentId, status, orgId, lastSeenAt);
}

export async function setGenerationRunStatusAction(
  runId: string,
  status: GenerationRun["status"],
  orgId: string,
): Promise<GenerationRun> {
  await authorize(orgId);
  return cp.setGenerationRunStatus(runId, status, orgId);
}

export async function setRenderRunStatusAction(
  runId: string,
  status: RenderRun["status"],
  orgId: string,
): Promise<RenderRun> {
  await authorize(orgId);
  return cp.setRenderRunStatus(runId, status, orgId);
}

export async function setBillingVisibilityAction(
  accountId: string,
  usageVisibilityMode: BillingAccount["usageVisibilityMode"],
  orgId: string,
): Promise<BillingAccount> {
  await authorize(orgId);
  return cp.setBillingVisibility(accountId, usageVisibilityMode, orgId);
}

