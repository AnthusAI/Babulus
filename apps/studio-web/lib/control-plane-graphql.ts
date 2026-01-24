import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/data";
import { cookies } from "next/headers";
// @ts-ignore - Schema type is generated after backend deployment
import type { Schema } from "../amplify/data/resource.js";
import outputs from "../amplify_outputs.json";
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
  UserProfile,
  CreateOrgInput,
  CreateOrgMemberInput,
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
  CreateUserProfileInput,
  CreatePublishedVideoInput, // Add this
} from "@babulus/shared";
import {
  buildOrgRecord,
  buildOrgMemberRecord,
  buildProjectRecord,
  buildVideoRecord,
  buildStoryboardVersionRecord,
  buildGenerationRunRecord,
  buildRenderRunRecord,
  buildAssetRecord,
  buildJobRecord,
  buildJobInput,
  buildJobEventRecord,
  buildConversationRecord,
  buildMessageRecord,
  buildApprovalRecord,
  buildUsageEventRecord,
  buildRenderAgentRecord,
  buildBillingAccountRecord,
  buildUserProfileRecord,
  buildPublishedVideoRecord, // Add this
} from "@babulus/shared";
import { updateVideoStatus, type VideoStatus } from "@babulus/shared";

// Create typed GraphQL client lazily to ensure request context
const getClient = () => {
  if (!outputs) {
    throw new Error("Amplify outputs not found. Ensure amplify_outputs.json exists.");
  }
  return generateServerClientUsingCookies<Schema>({
    config: outputs,
    cookies,
  });
};

// Type adapters to convert from GraphQL schema types to control-plane types
// Using any for now - the Amplify client types are complex and need refinement
type GraphQLModel<T extends keyof Schema> = any;

// Control-plane operations using GraphQL client
export const createPublishedVideo = async (
  input: CreatePublishedVideoInput,
  activeOrgId: string,
): Promise<import("@babulus/shared").PublishedVideo> => {
  const record = buildPublishedVideoRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.PublishedVideo.create({
    orgId: record.orgId,
    videoId: record.videoId,
    renderRunId: record.renderRunId,
    slug: record.slug,
    accessPolicy: record.accessPolicy,
    passwordHash: record.passwordHash,
    viewCount: record.viewCount,
    publishedAt: record.publishedAt,
  });
  if (errors || !data) {
    throw new Error(`Failed to create published video: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createOrg = async (input: CreateOrgInput): Promise<Org> => {
  const record = buildOrgRecord(input);
  const { data, errors } = await getClient().models.Org.create({
    name: record.name,
    planTier: record.planTier,
  });
  if (errors || !data) {
    throw new Error(`Failed to create org: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createOrgMember = async (
  input: CreateOrgMemberInput,
  activeOrgId: string,
): Promise<OrgMember> => {
  const record = buildOrgMemberRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.OrgMember.create({
    orgId: record.orgId,
    userId: record.userId,
    role: record.role,
  });
  if (errors || !data) {
    throw new Error(`Failed to create org member: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createProject = async (
  input: CreateProjectInput,
  activeOrgId: string,
): Promise<Project> => {
  const record = buildProjectRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.Project.create({
    orgId: record.orgId,
    name: record.name,
    templateId: record.templateId,
  });
  if (errors || !data) {
    throw new Error(`Failed to create project: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createVideo = async (input: CreateVideoInput, activeOrgId: string): Promise<Video> => {
  const record = buildVideoRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.Video.create({
    orgId: record.orgId,
    projectId: record.projectId,
    title: record.title,
    status: record.status,
    activeStoryboardVersionId: record.activeStoryboardVersionId,
  });
  if (errors || !data) {
    throw new Error(`Failed to create video: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createStoryboardVersion = async (
  input: CreateStoryboardVersionInput,
  activeOrgId: string,
): Promise<StoryboardVersion> => {
  const record = buildStoryboardVersionRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.StoryboardVersion.create({
    orgId: record.orgId,
    videoId: record.videoId,
    sourceText: record.sourceText,
    parentVersionId: record.parentVersionId,
    createdBy: record.createdBy,
  });
  if (errors || !data) {
    throw new Error(`Failed to create storyboard version: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createGenerationRun = async (
  input: CreateGenerationRunInput,
  activeOrgId: string,
): Promise<GenerationRun> => {
  const record = buildGenerationRunRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.GenerationRun.create({
    orgId: record.orgId,
    videoId: record.videoId,
    storyboardVersionId: record.storyboardVersionId,
    status: record.status,
    scriptArtifactKey: record.scriptArtifactKey,
    timelineArtifactKey: record.timelineArtifactKey,
    audioArtifactKey: record.audioArtifactKey,
    logsArtifactKey: record.logsArtifactKey,
  });
  if (errors || !data) {
    throw new Error(`Failed to create generation run: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createRenderRun = async (
  input: CreateRenderRunInput,
  activeOrgId: string,
): Promise<RenderRun> => {
  const record = buildRenderRunRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.RenderRun.create({
    orgId: record.orgId,
    videoId: record.videoId,
    generationRunId: record.generationRunId,
    status: record.status,
    mp4ArtifactKey: record.mp4ArtifactKey,
    stillsArtifactPrefix: record.stillsArtifactPrefix,
    logsArtifactKey: record.logsArtifactKey,
  });
  if (errors || !data) {
    throw new Error(`Failed to create render run: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createAsset = async (input: CreateAssetInput, activeOrgId: string): Promise<Asset> => {
  const record = buildAssetRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.Asset.create({
    orgId: record.orgId,
    projectId: record.projectId,
    kind: record.kind,
    sha256: record.sha256,
    storageKey: record.storageKey,
    metadataJson: record.metadataJson,
  });
  if (errors || !data) {
    throw new Error(`Failed to create asset: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createJob = async (input: CreateJobInput, activeOrgId: string): Promise<Job> => {
  const resolved = buildJobInput(input, activeOrgId);

  // Check for existing job with same idempotency key
  if (resolved.idempotencyKey) {
    const { data: existing } = await getClient().models.Job.list({
      filter: {
        orgId: { eq: resolved.orgId },
      },
    });
    const match = existing?.find(
      (job) => {
        try {
          const input = job.inputJson ? JSON.parse(job.inputJson as string) : {};
          return input?.idempotencyKey === resolved.idempotencyKey;
        } catch {
          return false;
        }
      },
    );
    if (match) {
      if (match.kind !== resolved.kind) {
        throw new Error(`Job idempotency key conflict: ${resolved.idempotencyKey}`);
      }
      return match as any;
    }
  }

  const record = buildJobRecord(resolved, activeOrgId);
  const { data, errors } = await getClient().models.Job.create({
    orgId: record.orgId,
    kind: record.kind,
    status: record.status,
    claimedByAgentId: record.claimedByAgentId,
    executionMode: record.executionMode,
    inputJson: record.inputJson,
  });
  if (errors || !data) {
    throw new Error(`Failed to create job: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createJobEvent = async (
  input: CreateJobEventInput,
  activeOrgId: string,
): Promise<JobEvent> => {
  const record = buildJobEventRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.JobEvent.create({
    orgId: record.orgId,
    jobId: record.jobId,
    type: record.type,
    message: record.message,
    progress: record.progress,
  });
  if (errors || !data) {
    throw new Error(`Failed to create job event: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createConversation = async (
  input: CreateConversationInput,
  activeOrgId: string,
): Promise<Conversation> => {
  const record = buildConversationRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.Conversation.create({
    orgId: record.orgId,
    videoId: record.videoId,
  });
  if (errors || !data) {
    throw new Error(`Failed to create conversation: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createMessage = async (
  input: CreateMessageInput,
  activeOrgId: string,
): Promise<Message> => {
  const record = buildMessageRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.Message.create({
    orgId: record.orgId,
    conversationId: record.conversationId,
    role: record.role,
    content: record.content,
  });
  if (errors || !data) {
    throw new Error(`Failed to create message: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createApproval = async (
  input: CreateApprovalInput,
  activeOrgId: string,
): Promise<Approval> => {
  const record = buildApprovalRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.Approval.create({
    orgId: record.orgId,
    videoId: record.videoId,
    kind: record.kind,
    status: record.status,
    requestedBy: record.requestedBy,
    decidedBy: record.decidedBy,
    decidedAt: record.decidedAt,
  });
  if (errors || !data) {
    throw new Error(`Failed to create approval: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createUsageEvent = async (
  input: CreateUsageEventInput,
  activeOrgId: string,
): Promise<UsageEvent> => {
  const record = buildUsageEventRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.UsageEvent.create({
    orgId: record.orgId,
    videoId: record.videoId,
    runId: record.runId,
    provider: record.provider,
    unitType: record.unitType,
    quantity: record.quantity,
    estimatedCost: record.estimatedCost,
    actualCost: record.actualCost,
  });
  if (errors || !data) {
    throw new Error(`Failed to create usage event: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createRenderAgent = async (
  input: CreateRenderAgentInput,
  activeOrgId: string,
): Promise<RenderAgent> => {
  const record = buildRenderAgentRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.RenderAgent.create({
    orgId: record.orgId,
    label: record.label,
    status: record.status,
    lastSeenAt: record.lastSeenAt,
  });
  if (errors || !data) {
    throw new Error(`Failed to create render agent: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createBillingAccount = async (
  input: CreateBillingAccountInput,
  activeOrgId: string,
): Promise<BillingAccount> => {
  const record = buildBillingAccountRecord(input, activeOrgId);
  const { data, errors } = await getClient().models.BillingAccount.create({
    orgId: record.orgId,
    planId: record.planId,
    billingMode: record.billingMode,
    usageVisibilityMode: record.usageVisibilityMode,
  });
  if (errors || !data) {
    throw new Error(`Failed to create billing account: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const createUserProfile = async (input: CreateUserProfileInput): Promise<UserProfile> => {
  const record = buildUserProfileRecord(input);
  const { data, errors } = await getClient().models.UserProfile.create({
    userId: record.id,
    email: record.email,
    displayName: record.displayName,
  });
  if (errors || !data) {
    throw new Error(`Failed to create user profile: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

// List operations
export const listOrgs = async (userId: string): Promise<Org[]> => {
  // First get all org memberships for this user
  const { data: memberships } = await getClient().models.OrgMember.list({
    filter: { userId: { eq: userId } },
  });
  if (!memberships?.length) {
    return [];
  }

  const orgIds = new Set(memberships.map((m) => m.orgId));
  const { data: orgs } = await getClient().models.Org.list({});

  return ((orgs ?? [])
    .filter((org) => orgIds.has(org.id))) as any;
};

export const listProjects = async (activeOrgId: string): Promise<Project[]> => {
  const { data } = await getClient().models.Project.list({
    filter: { orgId: { eq: activeOrgId } },
  });
  return (data ?? [])as any;
};

export const listVideos = async (activeOrgId: string, projectId?: string | null): Promise<Video[]> => {
  const filter: { orgId: { eq: string }; projectId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (projectId) {
    filter.projectId = { eq: projectId };
  }
  const { data } = await getClient().models.Video.list({ filter });
  return (data ?? [])as any;
};

export const listStoryboardVersions = async (
  activeOrgId: string,
  videoId?: string | null,
): Promise<StoryboardVersion[]> => {
  const filter: { orgId: { eq: string }; videoId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (videoId) {
    filter.videoId = { eq: videoId };
  }
  const { data } = await getClient().models.StoryboardVersion.list({ filter });
  return (data ?? [])as any;
};

export const listGenerationRuns = async (
  activeOrgId: string,
  videoId?: string | null,
): Promise<GenerationRun[]> => {
  const filter: { orgId: { eq: string }; videoId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (videoId) {
    filter.videoId = { eq: videoId };
  }
  const { data } = await getClient().models.GenerationRun.list({ filter });
  return (data ?? [])as any;
};

export const getRenderRun = async (runId: string): Promise<RenderRun | null> => {
  const { data } = await getClient().models.RenderRun.get({ id: runId });
  return data as any;
};

export const listRenderRuns = async (
  activeOrgId: string,
  generationRunId?: string | null,
  videoId?: string | null,
): Promise<RenderRun[]> => {
  const filter: { orgId: { eq: string }; generationRunId?: { eq: string }; videoId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (generationRunId) {
    filter.generationRunId = { eq: generationRunId };
  }
  if (videoId) {
    filter.videoId = { eq: videoId };
  }
  const { data } = await getClient().models.RenderRun.list({ filter });
  return (data ?? [])as any;
};

export const listAssets = async (activeOrgId: string, projectId?: string | null): Promise<Asset[]> => {
  const { data } = await getClient().models.Asset.list({
    filter: { orgId: { eq: activeOrgId } },
  });
  if (!projectId) {
    return (data ?? [])as any;
  }
  return ((data ?? [])
    .filter((asset) => asset.projectId === projectId || !asset.projectId)) as any;
};

export const listJobs = async (activeOrgId: string, status?: JobStatus | null): Promise<Job[]> => {
  const filter: { orgId: { eq: string }; status?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (status) {
    filter.status = { eq: status };
  }
  const { data } = await getClient().models.Job.list({ filter });
  return (data ?? [])as any;
};

export const listJobEvents = async (activeOrgId: string, jobId?: string | null): Promise<JobEvent[]> => {
  const filter: { orgId: { eq: string }; jobId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (jobId) {
    filter.jobId = { eq: jobId };
  }
  const { data } = await getClient().models.JobEvent.list({ filter });
  return (data ?? [])as any;
};

export const listOrgMembers = async (activeOrgId: string): Promise<OrgMember[]> => {
  const { data } = await getClient().models.OrgMember.list({
    filter: { orgId: { eq: activeOrgId } },
  });
  return (data ?? [])as any;
};

export const listConversations = async (
  activeOrgId: string,
  videoId?: string | null,
): Promise<Conversation[]> => {
  const filter: { orgId: { eq: string }; videoId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (videoId) {
    filter.videoId = { eq: videoId };
  }
  const { data } = await getClient().models.Conversation.list({ filter });
  return (data ?? [])as any;
};

export const listMessages = async (
  activeOrgId: string,
  conversationId?: string | null,
): Promise<Message[]> => {
  const filter: { orgId: { eq: string }; conversationId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (conversationId) {
    filter.conversationId = { eq: conversationId };
  }
  const { data } = await getClient().models.Message.list({ filter });
  return (data ?? [])as any;
};

export const listApprovals = async (
  activeOrgId: string,
  videoId?: string | null,
): Promise<Approval[]> => {
  const filter: { orgId: { eq: string }; videoId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (videoId) {
    filter.videoId = { eq: videoId };
  }
  const { data } = await getClient().models.Approval.list({ filter });
  return (data ?? [])as any;
};

export const listUsageEvents = async (
  activeOrgId: string,
  videoId?: string | null,
  runId?: string | null,
): Promise<UsageEvent[]> => {
  const filter: { orgId: { eq: string }; videoId?: { eq: string }; runId?: { eq: string } } = {
    orgId: { eq: activeOrgId },
  };
  if (videoId) {
    filter.videoId = { eq: videoId };
  }
  if (runId) {
    filter.runId = { eq: runId };
  }
  const { data } = await getClient().models.UsageEvent.list({ filter });
  return (data ?? [])as any;
};

export const listRenderAgents = async (activeOrgId: string): Promise<RenderAgent[]> => {
  const { data } = await getClient().models.RenderAgent.list({
    filter: { orgId: { eq: activeOrgId } },
  });
  return (data ?? [])as any;
};

export const listBillingAccounts = async (activeOrgId: string): Promise<BillingAccount[]> => {
  const { data } = await getClient().models.BillingAccount.list({
    filter: { orgId: { eq: activeOrgId } },
  });
  return (data ?? [])as any;
};

export const updateOrgDomain = async (
  orgId: string,
  customDomain: string | null,
): Promise<Org> => {
  const { data: org } = await getClient().models.Org.get({ id: orgId });
  if (!org) {
    throw new Error(`Org not found: ${orgId}`);
  }

  const { data, errors } = await getClient().models.Org.update({
    id: orgId,
    customDomain,
    customDomainVerified: false, // Reset verification when domain changes
  });
  if (errors || !data) {
    throw new Error(`Failed to update org domain: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

// Update operations
export const setVideoStatus = async (
  videoId: string,
  status: VideoStatus,
  activeOrgId: string,
): Promise<Video> => {
  const { data: current } = await getClient().models.Video.get({ id: videoId });
  if (!current) {
    throw new Error(`Video not found: ${videoId}`);
  }
  if ((current as any).orgId !== activeOrgId) {
    throw new Error(`Video ${videoId} does not belong to org ${activeOrgId}`);
  }

  const updated = updateVideoStatus(current as any, status);
  const { data, errors } = await getClient().models.Video.update({
    id: videoId,
    status: (updated as any).status,
  });
  if (errors || !data) {
    throw new Error(`Failed to update video status: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setActiveStoryboardVersion = async (
  videoId: string,
  storyboardVersionId: string,
  activeOrgId: string,
): Promise<Video> => {
  const { data: video } = await getClient().models.Video.get({ id: videoId });
  if (!video) {
    throw new Error(`Video not found: ${videoId}`);
  }
  if ((video as any).orgId !== activeOrgId) {
    throw new Error(`Video ${videoId} does not belong to org ${activeOrgId}`);
  }

  const { data: version } = await getClient().models.StoryboardVersion.get({ id: storyboardVersionId });
  if (!version) {
    throw new Error(`Storyboard version not found: ${storyboardVersionId}`);
  }
  if ((version as any).videoId !== videoId) {
    throw new Error(`Storyboard version ${storyboardVersionId} does not belong to video ${videoId}`);
  }

  const { data, errors } = await getClient().models.Video.update({
    id: videoId,
    activeStoryboardVersionId: storyboardVersionId,
  });
  if (errors || !data) {
    throw new Error(`Failed to set active storyboard version: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setJobStatus = async (
  jobId: string,
  status: JobStatus,
  activeOrgId: string,
): Promise<Job> => {
  const { data: job } = await getClient().models.Job.get({ id: jobId });
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if ((job as any).orgId !== activeOrgId) {
    throw new Error(`Job ${jobId} does not belong to org ${activeOrgId}`);
  }

  const { data, errors } = await getClient().models.Job.update({
    id: jobId,
    status,
  });
  if (errors || !data) {
    throw new Error(`Failed to update job status: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const claimJob = async (
  jobId: string,
  agentId: string,
  activeOrgId: string,
): Promise<Job> => {
  const { data: job } = await getClient().models.Job.get({ id: jobId });
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if ((job as any).orgId !== activeOrgId) {
    throw new Error(`Job ${jobId} does not belong to org ${activeOrgId}`);
  }
  if ((job as any).status !== "queued") {
    throw new Error(`Job not available: ${jobId}`);
  }

  const { data, errors } = await getClient().models.Job.update({
    id: jobId,
    status: "claimed",
    claimedByAgentId: agentId,
  });
  if (errors || !data) {
    throw new Error(`Failed to claim job: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setApprovalStatus = async (
  approvalId: string,
  status: Approval["status"],
  activeOrgId: string,
  decidedBy?: string | null,
  decidedAt?: string | null,
): Promise<Approval> => {
  const { data: approval } = await getClient().models.Approval.get({ id: approvalId });
  if (!approval) {
    throw new Error(`Approval not found: ${approvalId}`);
  }
  if ((approval as any).orgId !== activeOrgId) {
    throw new Error(`Approval ${approvalId} does not belong to org ${activeOrgId}`);
  }

  const { data, errors } = await getClient().models.Approval.update({
    id: approvalId,
    status,
    decidedBy: decidedBy ?? (approval as any).decidedBy ?? undefined,
    decidedAt: decidedAt ?? (approval as any).decidedAt ?? undefined,
  });
  if (errors || !data) {
    throw new Error(`Failed to update approval status: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setRenderAgentStatus = async (
  agentId: string,
  status: RenderAgent["status"],
  activeOrgId: string,
  lastSeenAt?: string | null,
  ): Promise<RenderAgent> => {
  const { data: agent } = await getClient().models.RenderAgent.get({ id: agentId });
  if (!agent) {
    throw new Error(`Render agent not found: ${agentId}`);
  }
  if ((agent as any).orgId !== activeOrgId) {
    throw new Error(`Render agent ${agentId} does not belong to org ${activeOrgId}`);
  }

  const { data, errors } = await getClient().models.RenderAgent.update({
    id: agentId,
    status,
    lastSeenAt: lastSeenAt ?? (agent as any).lastSeenAt ?? undefined,
  });
  if (errors || !data) {
    throw new Error(`Failed to update render agent status: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setOrgMemberRole = async (
  userId: string,
  role: OrgMember["role"],
  activeOrgId: string,
): Promise<OrgMember> => {
  const { data: members } = await getClient().models.OrgMember.list({
    filter: {
      orgId: { eq: activeOrgId },
      userId: { eq: userId },
    },
  });
  const member = members?.[0];
  if (!member) {
    throw new Error(`Org member not found: ${userId}`);
  }

  const { data, errors } = await getClient().models.OrgMember.update({
    id: member.id,
    role,
  });
  if (errors || !data) {
    throw new Error(`Failed to update org member role: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setGenerationRunStatus = async (
  runId: string,
  status: GenerationRun["status"],
  activeOrgId: string,
): Promise<GenerationRun> => {
  const { data: run } = await getClient().models.GenerationRun.get({ id: runId });
  if (!run) {
    throw new Error(`Generation run not found: ${runId}`);
  }
  if ((run as any).orgId !== activeOrgId) {
    throw new Error(`Generation run ${runId} does not belong to org ${activeOrgId}`);
  }

  const { data, errors } = await getClient().models.GenerationRun.update({
    id: runId,
    status,
  });
  if (errors || !data) {
    throw new Error(`Failed to update generation run status: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setRenderRunStatus = async (
  runId: string,
  status: RenderRun["status"],
  activeOrgId: string,
): Promise<RenderRun> => {
  const { data: run } = await getClient().models.RenderRun.get({ id: runId });
  if (!run) {
    throw new Error(`Render run not found: ${runId}`);
  }
  if ((run as any).orgId !== activeOrgId) {
    throw new Error(`Render run ${runId} does not belong to org ${activeOrgId}`);
  }

  const { data, errors } = await getClient().models.RenderRun.update({
    id: runId,
    status,
  });
  if (errors || !data) {
    throw new Error(`Failed to update render run status: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};

export const setBillingVisibility = async (
  accountId: string,
  usageVisibilityMode: BillingAccount["usageVisibilityMode"],
  activeOrgId: string,
): Promise<BillingAccount> => {
  const { data: account } = await getClient().models.BillingAccount.get({ id: accountId });
  if (!account) {
    throw new Error(`Billing account not found: ${accountId}`);
  }
  if ((account as any).orgId !== activeOrgId) {
    throw new Error(`Billing account ${accountId} does not belong to org ${activeOrgId}`);
  }

  const { data, errors } = await getClient().models.BillingAccount.update({
    id: accountId,
    usageVisibilityMode,
  });
  if (errors || !data) {
    throw new Error(`Failed to update billing visibility: ${errors?.map((e) => e.message).join(", ")}`);
  }
  return data as any;
};
