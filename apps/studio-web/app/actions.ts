"use server";

/**
 * Server Actions (STUB VERSION - Backend not yet deployed)
 *
 * This is a stub implementation that will be replaced with the real GraphQL
 * client once amplify_outputs.json is available.
 *
 * All functions return empty data or throw "not implemented" errors.
 */

import type {
  Org,
  OrgMember,
  Project,
  Video,
  BillingAccount,
} from "@babulus/shared";

// Mock user ID until authentication is implemented
const MOCK_USER_ID = "mock-user-id";

export async function getOrgsForUser(): Promise<{
  userId: string;
  orgs: Org[];
  memberships: OrgMember[];
}> {
  return {
    userId: MOCK_USER_ID,
    orgs: [],
    memberships: [],
  };
}

export async function getProjectsForOrg(_orgId: string): Promise<Project[]> {
  return [];
}

export async function getVideosForOrg(_orgId: string, _projectId?: string | null): Promise<Video[]> {
  return [];
}

export async function getBillingAccountsForOrg(_orgId: string): Promise<BillingAccount[]> {
  return [];
}

// All other functions throw "not implemented"
export async function getStoryboardVersions(
  _orgId: string,
  _videoId?: string | null,
): Promise<import("@babulus/shared").StoryboardVersion[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getGenerationRuns(
  _orgId: string,
  _videoId?: string | null,
): Promise<import("@babulus/shared").GenerationRun[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getRenderRuns(
  _orgId: string,
  _generationRunId?: string | null,
): Promise<import("@babulus/shared").RenderRun[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getAssetsForOrg(_orgId: string, _projectId?: string | null): Promise<import("@babulus/shared").Asset[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getJobsForOrg(_orgId: string, _status?: import("@babulus/shared").JobStatus | null): Promise<import("@babulus/shared").Job[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getJobEventsForJob(_orgId: string, _jobId: string): Promise<import("@babulus/shared").JobEvent[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getConversationsForVideo(
  _orgId: string,
  _videoId?: string | null,
): Promise<import("@babulus/shared").Conversation[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getMessagesForConversation(
  _orgId: string,
  _conversationId?: string | null,
): Promise<import("@babulus/shared").Message[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getApprovalsForVideo(
  _orgId: string,
  _videoId?: string | null,
): Promise<import("@babulus/shared").Approval[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getUsageEventsForOrg(
  _orgId: string,
  _videoId?: string | null,
  _runId?: string | null,
): Promise<import("@babulus/shared").UsageEvent[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function getRenderAgentsForOrg(_orgId: string): Promise<import("@babulus/shared").RenderAgent[]> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createOrgAction(_input: import("@babulus/shared").CreateOrgInput): Promise<Org> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createProjectAction(_input: import("@babulus/shared").CreateProjectInput, _orgId: string): Promise<Project> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createVideoAction(_input: import("@babulus/shared").CreateVideoInput, _orgId: string): Promise<Video> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createStoryboardVersionAction(
  _input: import("@babulus/shared").CreateStoryboardVersionInput,
  _orgId: string,
): Promise<import("@babulus/shared").StoryboardVersion> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createGenerationRunAction(
  _input: import("@babulus/shared").CreateGenerationRunInput,
  _orgId: string,
): Promise<import("@babulus/shared").GenerationRun> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createRenderRunAction(
  _input: import("@babulus/shared").CreateRenderRunInput,
  _orgId: string,
): Promise<import("@babulus/shared").RenderRun> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createAssetAction(_input: import("@babulus/shared").CreateAssetInput, _orgId: string): Promise<import("@babulus/shared").Asset> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createJobAction(_input: import("@babulus/shared").CreateJobInput, _orgId: string): Promise<import("@babulus/shared").Job> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createJobEventAction(
  _input: import("@babulus/shared").CreateJobEventInput,
  _orgId: string,
): Promise<import("@babulus/shared").JobEvent> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createConversationAction(
  _input: import("@babulus/shared").CreateConversationInput,
  _orgId: string,
): Promise<import("@babulus/shared").Conversation> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createMessageAction(_input: import("@babulus/shared").CreateMessageInput, _orgId: string): Promise<import("@babulus/shared").Message> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createApprovalAction(
  _input: import("@babulus/shared").CreateApprovalInput,
  _orgId: string,
): Promise<import("@babulus/shared").Approval> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createUsageEventAction(
  _input: import("@babulus/shared").CreateUsageEventInput,
  _orgId: string,
): Promise<import("@babulus/shared").UsageEvent> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createRenderAgentAction(
  _input: import("@babulus/shared").CreateRenderAgentInput,
  _orgId: string,
): Promise<import("@babulus/shared").RenderAgent> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function createBillingAccountAction(
  _input: import("@babulus/shared").CreateBillingAccountInput,
  _orgId: string,
): Promise<BillingAccount> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setVideoStatusAction(
  _videoId: string,
  _status: import("@babulus/shared").VideoStatus,
  _orgId: string,
): Promise<Video> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setActiveStoryboardVersionAction(
  _videoId: string,
  _storyboardVersionId: string,
  _orgId: string,
): Promise<Video> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setJobStatusAction(
  _jobId: string,
  _status: import("@babulus/shared").JobStatus,
  _orgId: string,
): Promise<import("@babulus/shared").Job> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function claimJobAction(_jobId: string, _agentId: string, _orgId: string): Promise<import("@babulus/shared").Job> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setApprovalStatusAction(
  _approvalId: string,
  _status: import("@babulus/shared").Approval["status"],
  _orgId: string,
  _decidedBy?: string | null,
  _decidedAt?: string | null,
): Promise<import("@babulus/shared").Approval> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setRenderAgentStatusAction(
  _agentId: string,
  _status: import("@babulus/shared").RenderAgent["status"],
  _orgId: string,
  _lastSeenAt?: string | null,
): Promise<import("@babulus/shared").RenderAgent> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setOrgMemberRoleAction(
  _userId: string,
  _role: import("@babulus/shared").OrgMember["role"],
  _orgId: string,
): Promise<OrgMember> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setGenerationRunStatusAction(
  _runId: string,
  _status: import("@babulus/shared").GenerationRun["status"],
  _orgId: string,
): Promise<import("@babulus/shared").GenerationRun> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setRenderRunStatusAction(
  _runId: string,
  _status: import("@babulus/shared").RenderRun["status"],
  _orgId: string,
): Promise<import("@babulus/shared").RenderRun> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}

export async function setBillingVisibilityAction(
  _accountId: string,
  _usageVisibilityMode: import("@babulus/shared").BillingAccount["usageVisibilityMode"],
  _orgId: string,
): Promise<BillingAccount> {
  throw new Error("Backend not deployed - amplify_outputs.json required");
}
