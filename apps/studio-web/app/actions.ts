"use server";

/**
 * Server Actions for control-plane operations
 *
 * These actions bridge the GraphQL client (server-side) with client components.
 * They handle authentication automatically and provide a clean API for the UI.
 *
 * Usage in client components:
 *   import { getOrgsForUser, createProjectAction } from "./actions";
 *
 *   const { userId, orgs } = await getOrgsForUser();
 *   const project = await createProjectAction({ name: "My Project" }, orgId);
 */

import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "../lib/amplify-server.js";
import * as cp from "../lib/control-plane-graphql.js";
import type {
  Org,
  OrgMember,
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
  CreateStoryboardVersionInput,
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
  CreateOrgInput,
  CreateOrgMemberInput,
} from "@babulus/shared";
import type { VideoStatus } from "@babulus/shared";

// Helper to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string> {
  try {
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });
    return user.userId;
  } catch (error) {
    throw new Error("User not authenticated");
  }
}

// Read operations (queries)

export async function getOrgsForUser(): Promise<{
  userId: string;
  orgs: Org[];
  memberships: OrgMember[];
}> {
  const userId = await getAuthenticatedUserId();
  const orgs = await cp.listOrgs(userId);

  // Get memberships for all orgs
  const memberships: OrgMember[] = [];
  for (const org of orgs) {
    const orgMembers = await cp.listOrgMembers(org.id);
    memberships.push(...orgMembers);
  }

  return { userId, orgs, memberships };
}

export async function getProjectsForOrg(orgId: string): Promise<Project[]> {
  return cp.listProjects(orgId);
}

export async function getVideosForOrg(orgId: string, projectId?: string | null): Promise<Video[]> {
  return cp.listVideos(orgId, projectId);
}

export async function getStoryboardVersions(
  orgId: string,
  videoId?: string | null,
): Promise<StoryboardVersion[]> {
  return cp.listStoryboardVersions(orgId, videoId);
}

export async function getGenerationRuns(
  orgId: string,
  videoId?: string | null,
): Promise<GenerationRun[]> {
  return cp.listGenerationRuns(orgId, videoId);
}

export async function getRenderRuns(
  orgId: string,
  generationRunId?: string | null,
): Promise<RenderRun[]> {
  return cp.listRenderRuns(orgId, generationRunId);
}

export async function getAssetsForOrg(orgId: string, projectId?: string | null): Promise<Asset[]> {
  return cp.listAssets(orgId, projectId);
}

export async function getJobsForOrg(orgId: string, status?: JobStatus | null): Promise<Job[]> {
  return cp.listJobs(orgId, status);
}

export async function getJobEventsForJob(orgId: string, jobId: string): Promise<JobEvent[]> {
  return cp.listJobEvents(orgId, jobId);
}

export async function getConversationsForVideo(
  orgId: string,
  videoId?: string | null,
): Promise<Conversation[]> {
  return cp.listConversations(orgId, videoId);
}

export async function getMessagesForConversation(
  orgId: string,
  conversationId?: string | null,
): Promise<Message[]> {
  return cp.listMessages(orgId, conversationId);
}

export async function getApprovalsForVideo(
  orgId: string,
  videoId?: string | null,
): Promise<Approval[]> {
  return cp.listApprovals(orgId, videoId);
}

export async function getUsageEventsForOrg(
  orgId: string,
  videoId?: string | null,
  runId?: string | null,
): Promise<UsageEvent[]> {
  return cp.listUsageEvents(orgId, videoId, runId);
}

export async function getRenderAgentsForOrg(orgId: string): Promise<RenderAgent[]> {
  return cp.listRenderAgents(orgId);
}

export async function getBillingAccountsForOrg(orgId: string): Promise<BillingAccount[]> {
  return cp.listBillingAccounts(orgId);
}

// Write operations (mutations)

export async function createOrgAction(input: CreateOrgInput): Promise<Org> {
  const userId = await getAuthenticatedUserId();
  const org = await cp.createOrg(input);

  // Automatically add creator as owner
  await cp.createOrgMember({ userId, role: "owner" }, org.id);

  return org;
}

export async function createProjectAction(input: CreateProjectInput, orgId: string): Promise<Project> {
  return cp.createProject(input, orgId);
}

export async function createVideoAction(input: CreateVideoInput, orgId: string): Promise<Video> {
  return cp.createVideo(input, orgId);
}

export async function createStoryboardVersionAction(
  input: CreateStoryboardVersionInput,
  orgId: string,
): Promise<StoryboardVersion> {
  return cp.createStoryboardVersion(input, orgId);
}

export async function createGenerationRunAction(
  input: CreateGenerationRunInput,
  orgId: string,
): Promise<GenerationRun> {
  return cp.createGenerationRun(input, orgId);
}

export async function createRenderRunAction(
  input: CreateRenderRunInput,
  orgId: string,
): Promise<RenderRun> {
  return cp.createRenderRun(input, orgId);
}

export async function createAssetAction(input: CreateAssetInput, orgId: string): Promise<Asset> {
  return cp.createAsset(input, orgId);
}

export async function createJobAction(input: CreateJobInput, orgId: string): Promise<Job> {
  return cp.createJob(input, orgId);
}

export async function createJobEventAction(
  input: CreateJobEventInput,
  orgId: string,
): Promise<JobEvent> {
  return cp.createJobEvent(input, orgId);
}

export async function createConversationAction(
  input: CreateConversationInput,
  orgId: string,
): Promise<Conversation> {
  return cp.createConversation(input, orgId);
}

export async function createMessageAction(input: CreateMessageInput, orgId: string): Promise<Message> {
  return cp.createMessage(input, orgId);
}

export async function createApprovalAction(
  input: CreateApprovalInput,
  orgId: string,
): Promise<Approval> {
  return cp.createApproval(input, orgId);
}

export async function createUsageEventAction(
  input: CreateUsageEventInput,
  orgId: string,
): Promise<UsageEvent> {
  return cp.createUsageEvent(input, orgId);
}

export async function createRenderAgentAction(
  input: CreateRenderAgentInput,
  orgId: string,
): Promise<RenderAgent> {
  return cp.createRenderAgent(input, orgId);
}

export async function createBillingAccountAction(
  input: CreateBillingAccountInput,
  orgId: string,
): Promise<BillingAccount> {
  return cp.createBillingAccount(input, orgId);
}

// Update operations

export async function setVideoStatusAction(
  videoId: string,
  status: VideoStatus,
  orgId: string,
): Promise<Video> {
  return cp.setVideoStatus(videoId, status, orgId);
}

export async function setActiveStoryboardVersionAction(
  videoId: string,
  storyboardVersionId: string,
  orgId: string,
): Promise<Video> {
  return cp.setActiveStoryboardVersion(videoId, storyboardVersionId, orgId);
}

export async function setJobStatusAction(
  jobId: string,
  status: JobStatus,
  orgId: string,
): Promise<Job> {
  return cp.setJobStatus(jobId, status, orgId);
}

export async function claimJobAction(jobId: string, agentId: string, orgId: string): Promise<Job> {
  return cp.claimJob(jobId, agentId, orgId);
}

export async function setApprovalStatusAction(
  approvalId: string,
  status: Approval["status"],
  orgId: string,
  decidedBy?: string | null,
  decidedAt?: string | null,
): Promise<Approval> {
  return cp.setApprovalStatus(approvalId, status, orgId, decidedBy, decidedAt);
}

export async function setRenderAgentStatusAction(
  agentId: string,
  status: RenderAgent["status"],
  orgId: string,
  lastSeenAt?: string | null,
): Promise<RenderAgent> {
  return cp.setRenderAgentStatus(agentId, status, orgId, lastSeenAt);
}

export async function setOrgMemberRoleAction(
  userId: string,
  role: OrgMember["role"],
  orgId: string,
): Promise<OrgMember> {
  return cp.setOrgMemberRole(userId, role, orgId);
}

export async function setGenerationRunStatusAction(
  runId: string,
  status: GenerationRun["status"],
  orgId: string,
): Promise<GenerationRun> {
  return cp.setGenerationRunStatus(runId, status, orgId);
}

export async function setRenderRunStatusAction(
  runId: string,
  status: RenderRun["status"],
  orgId: string,
): Promise<RenderRun> {
  return cp.setRenderRunStatus(runId, status, orgId);
}

export async function setBillingVisibilityAction(
  accountId: string,
  usageVisibilityMode: BillingAccount["usageVisibilityMode"],
  orgId: string,
): Promise<BillingAccount> {
  return cp.setBillingVisibility(accountId, usageVisibilityMode, orgId);
}
