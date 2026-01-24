/**
 * Integration tests for GraphQL control-plane operations
 *
 * Prerequisites:
 * 1. Amplify backend must be deployed (amplify_outputs.json exists)
 * 2. User must be authenticated (valid Cognito session)
 *
 * Test scenarios:
 * 1. Org lifecycle: create org → create member → verify ownership
 * 2. Project CRUD: create project → list projects → verify org scope
 * 3. Video workflow: create video → create storyboard version → set active version
 * 4. Job workflow: create job → claim job → emit job events → verify persistence
 * 5. Asset management: create asset → list assets → verify org scope
 * 6. Generation/Render runs: create runs → update status → verify transitions
 * 7. Conversation: create conversation → add messages → list by video
 * 8. Approval: create approval → update status → verify decided fields
 * 9. Usage events: create events → list by org/video/run
 * 10. Render agents: create agent → update status → verify last seen
 * 11. Billing: create billing account → update visibility mode
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import { Amplify } from "aws-amplify";
import { signIn, signUp, confirmSignUp, getCurrentUser } from "aws-amplify/auth";
import outputs from "../amplify_outputs.json";
import * as cp from "../lib/control-plane-graphql.js";

// Configure Amplify for tests
Amplify.configure(outputs, { ssr: false });

// Test user credentials (ephemeral test account)
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPassword123!";

describe("Control-Plane GraphQL Integration", () => {
  let userId: string;
  let orgId: string;
  let projectId: string;
  let videoId: string;
  let storyboardVersionId: string;
  let conversationId: string;
  let jobId: string;
  let assetId: string;

  beforeAll(async () => {
    // Create test user
    try {
      await signUp({
        username: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: {
          userAttributes: { email: TEST_EMAIL },
        },
      });
      // In production, user would confirm via email
      // For testing, we need auto-confirm enabled in Cognito
      // Or use confirmSignUp with code from email
      await confirmSignUp({
        username: TEST_EMAIL,
        confirmationCode: "123456", // This will fail unless auto-confirm is enabled
      });
    } catch (error) {
      // User might already exist from previous test run
      console.log("Sign up failed (user may exist):", error);
    }

    // Sign in
    await signIn({ username: TEST_EMAIL, password: TEST_PASSWORD });

    // Get user ID
    const user = await getCurrentUser();
    userId = user.userId;
  });

  describe("Org Management", () => {
    it("should create org and add owner member", async () => {
      // Create org
      const org = await cp.createOrg({
        name: "Test Org",
        slug: "test-org",
        planTier: "free",
      });
      expect(org).toBeDefined();
      expect(org.id).toBeDefined();
      expect(org.name).toBe("Test Org");
      orgId = org.id;

      // Add owner member
      const member = await cp.createOrgMember(
        {
          userId,
          role: "owner",
        },
        orgId,
      );
      expect(member).toBeDefined();
      expect(member.orgId).toBe(orgId);
      expect(member.userId).toBe(userId);
      expect(member.role).toBe("owner");
    });

    it("should list orgs for user", async () => {
      const orgs = await cp.listOrgs(userId);
      expect(orgs).toBeDefined();
      expect(orgs.length).toBeGreaterThan(0);
      expect(orgs.find((o) => o.id === orgId)).toBeDefined();
    });

    it("should list org members", async () => {
      const members = await cp.listOrgMembers(orgId);
      expect(members).toBeDefined();
      expect(members.length).toBeGreaterThan(0);
      expect(members.find((m) => m.userId === userId)).toBeDefined();
    });

    it("should create billing account for org", async () => {
      const account = await cp.createBillingAccount(
        {
          planId: "free",
          billingMode: "flat",
          usageVisibilityMode: "full",
        },
        orgId,
      );
      expect(account).toBeDefined();
      expect(account.orgId).toBe(orgId);
      expect(account.billingMode).toBe("flat");
    });
  });

  describe("Project Management", () => {
    it("should create project", async () => {
      const project = await cp.createProject(
        {
          name: "Test Project",
          templateId: "default",
        },
        orgId,
      );
      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.orgId).toBe(orgId);
      expect(project.name).toBe("Test Project");
      projectId = project.id;
    });

    it("should list projects for org", async () => {
      const projects = await cp.listProjects(orgId);
      expect(projects).toBeDefined();
      expect(projects.length).toBeGreaterThan(0);
      expect(projects.find((p) => p.id === projectId)).toBeDefined();
    });
  });

  describe("Video Workflow", () => {
    it("should create video", async () => {
      const video = await cp.createVideo(
        {
          projectId,
          title: "Test Video",
          status: "draft",
        },
        orgId,
      );
      expect(video).toBeDefined();
      expect(video.id).toBeDefined();
      expect(video.orgId).toBe(orgId);
      expect(video.projectId).toBe(projectId);
      expect(video.title).toBe("Test Video");
      videoId = video.id;
    });

    it("should create storyboard version", async () => {
      const version = await cp.createStoryboardVersion(
        {
          videoId,
          sourceText: "# Test Storyboard\nScene 1: Opening",
          createdBy: userId,
        },
        orgId,
      );
      expect(version).toBeDefined();
      expect(version.id).toBeDefined();
      expect(version.videoId).toBe(videoId);
      storyboardVersionId = version.id;
    });

    it("should set active storyboard version", async () => {
      const updated = await cp.setActiveStoryboardVersion(videoId, storyboardVersionId, orgId);
      expect(updated).toBeDefined();
      expect(updated.activeStoryboardVersionId).toBe(storyboardVersionId);
    });

    it("should update video status", async () => {
      const updated = await cp.setVideoStatus(videoId, "generating", orgId);
      expect(updated).toBeDefined();
      expect(updated.status).toBe("generating");
    });

    it("should list videos for org", async () => {
      const videos = await cp.listVideos(orgId);
      expect(videos).toBeDefined();
      expect(videos.length).toBeGreaterThan(0);
      expect(videos.find((v) => v.id === videoId)).toBeDefined();
    });

    it("should list videos for project", async () => {
      const videos = await cp.listVideos(orgId, projectId);
      expect(videos).toBeDefined();
      expect(videos.find((v) => v.id === videoId)).toBeDefined();
    });
  });

  describe("Generation and Render Runs", () => {
    it("should create generation run", async () => {
      const run = await cp.createGenerationRun(
        {
          videoId,
          storyboardVersionId,
          status: "pending",
        },
        orgId,
      );
      expect(run).toBeDefined();
      expect(run.id).toBeDefined();
      expect(run.videoId).toBe(videoId);
      expect(run.status).toBe("pending");
    });

    it("should create render run", async () => {
      const genRun = await cp.createGenerationRun(
        {
          videoId,
          storyboardVersionId,
          status: "succeeded",
          scriptArtifactKey: "org/test/script.json",
          timelineArtifactKey: "org/test/timeline.json",
        },
        orgId,
      );

      const renderRun = await cp.createRenderRun(
        {
          videoId,
          generationRunId: genRun.id,
          status: "pending",
        },
        orgId,
      );
      expect(renderRun).toBeDefined();
      expect(renderRun.id).toBeDefined();
      expect(renderRun.generationRunId).toBe(genRun.id);
    });

    it("should update generation run status", async () => {
      const run = await cp.createGenerationRun(
        {
          videoId,
          storyboardVersionId,
          status: "pending",
        },
        orgId,
      );

      const updated = await cp.setGenerationRunStatus(run.id, "running", orgId);
      expect(updated).toBeDefined();
      expect(updated.status).toBe("running");
    });
  });

  describe("Job Workflow", () => {
    it("should create job", async () => {
      const job = await cp.createJob(
        {
          kind: "generate",
          executionMode: "cloud",
          videoId,
          storyboardVersionId,
        },
        orgId,
      );
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.kind).toBe("generate");
      expect(job.status).toBe("queued");
      jobId = job.id;
    });

    it("should respect job idempotency", async () => {
      const job1 = await cp.createJob(
        {
          kind: "generate",
          executionMode: "cloud",
          videoId,
          storyboardVersionId,
          idempotencyKey: "test-idempotency-key",
        },
        orgId,
      );

      const job2 = await cp.createJob(
        {
          kind: "generate",
          executionMode: "cloud",
          videoId,
          storyboardVersionId,
          idempotencyKey: "test-idempotency-key",
        },
        orgId,
      );

      expect(job1.id).toBe(job2.id);
    });

    it("should claim job", async () => {
      const job = await cp.createJob(
        {
          kind: "render",
          executionMode: "local",
          videoId,
          generationRunId: "gen-123",
        },
        orgId,
      );

      const claimed = await cp.claimJob(job.id, "agent-123", orgId);
      expect(claimed).toBeDefined();
      expect(claimed.status).toBe("claimed");
      expect(claimed.claimedByAgentId).toBe("agent-123");
    });

    it("should create job events", async () => {
      const event1 = await cp.createJobEvent(
        {
          jobId,
          type: "status",
          message: "Job started",
        },
        orgId,
      );
      expect(event1).toBeDefined();
      expect(event1.jobId).toBe(jobId);

      const event2 = await cp.createJobEvent(
        {
          jobId,
          type: "progress",
          message: "Processing",
          progress: 0.5,
        },
        orgId,
      );
      expect(event2).toBeDefined();
      expect(event2.progress).toBe(0.5);
    });

    it("should list jobs for org", async () => {
      const jobs = await cp.listJobs(orgId);
      expect(jobs).toBeDefined();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs.find((j) => j.id === jobId)).toBeDefined();
    });

    it("should list jobs by status", async () => {
      const queuedJobs = await cp.listJobs(orgId, "queued");
      expect(queuedJobs).toBeDefined();
      expect(queuedJobs.every((j) => j.status === "queued")).toBe(true);
    });

    it("should list job events", async () => {
      const events = await cp.listJobEvents(orgId, jobId);
      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.jobId === jobId)).toBe(true);
    });
  });

  describe("Asset Management", () => {
    it("should create asset", async () => {
      const asset = await cp.createAsset(
        {
          projectId,
          kind: "image",
          sha256: "abc123",
          storageKey: `org/${orgId}/assets/test.png`,
          metadata: { width: 1920, height: 1080 },
        },
        orgId,
      );
      expect(asset).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.projectId).toBe(projectId);
      assetId = asset.id;
    });

    it("should list assets for org", async () => {
      const assets = await cp.listAssets(orgId);
      expect(assets).toBeDefined();
      expect(assets.find((a) => a.id === assetId)).toBeDefined();
    });

    it("should list assets for project", async () => {
      const assets = await cp.listAssets(orgId, projectId);
      expect(assets).toBeDefined();
      expect(assets.find((a) => a.id === assetId)).toBeDefined();
    });
  });

  describe("Conversation and Messages", () => {
    it("should create conversation", async () => {
      const conversation = await cp.createConversation(
        {
          videoId,
        },
        orgId,
      );
      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.videoId).toBe(videoId);
      conversationId = conversation.id;
    });

    it("should create messages", async () => {
      const msg1 = await cp.createMessage(
        {
          conversationId,
          role: "user",
          content: "What is this video about?",
        },
        orgId,
      );
      expect(msg1).toBeDefined();
      expect(msg1.conversationId).toBe(conversationId);

      const msg2 = await cp.createMessage(
        {
          conversationId,
          role: "assistant",
          content: "This video is about testing.",
        },
        orgId,
      );
      expect(msg2).toBeDefined();
    });

    it("should list conversations for video", async () => {
      const conversations = await cp.listConversations(orgId, videoId);
      expect(conversations).toBeDefined();
      expect(conversations.find((c) => c.id === conversationId)).toBeDefined();
    });

    it("should list messages for conversation", async () => {
      const messages = await cp.listMessages(orgId, conversationId);
      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.every((m) => m.conversationId === conversationId)).toBe(true);
    });
  });

  describe("Approval Workflow", () => {
    it("should create approval", async () => {
      const approval = await cp.createApproval(
        {
          videoId,
          kind: "script",
          status: "pending",
          requestedBy: userId,
        },
        orgId,
      );
      expect(approval).toBeDefined();
      expect(approval.id).toBeDefined();
      expect(approval.status).toBe("pending");
    });

    it("should update approval status", async () => {
      const approval = await cp.createApproval(
        {
          videoId,
          kind: "timeline",
          status: "pending",
          requestedBy: userId,
        },
        orgId,
      );

      const decidedAt = new Date().toISOString();
      const updated = await cp.setApprovalStatus(
        approval.id,
        "approved",
        orgId,
        userId,
        decidedAt,
      );
      expect(updated).toBeDefined();
      expect(updated.status).toBe("approved");
      expect(updated.decidedBy).toBe(userId);
      expect(updated.decidedAt).toBe(decidedAt);
    });

    it("should list approvals for video", async () => {
      const approvals = await cp.listApprovals(orgId, videoId);
      expect(approvals).toBeDefined();
      expect(approvals.length).toBeGreaterThan(0);
      expect(approvals.every((a) => a.videoId === videoId)).toBe(true);
    });
  });

  describe("Usage Events", () => {
    it("should create usage events", async () => {
      const event1 = await cp.createUsageEvent(
        {
          videoId,
          provider: "openai",
          unitType: "tokens",
          quantity: 1000,
          estimatedCost: 0.02,
        },
        orgId,
      );
      expect(event1).toBeDefined();
      expect(event1.quantity).toBe(1000);

      const event2 = await cp.createUsageEvent(
        {
          videoId,
          provider: "aws",
          unitType: "seconds",
          quantity: 60,
          estimatedCost: 0.01,
        },
        orgId,
      );
      expect(event2).toBeDefined();
    });

    it("should list usage events for org", async () => {
      const events = await cp.listUsageEvents(orgId);
      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
    });

    it("should list usage events for video", async () => {
      const events = await cp.listUsageEvents(orgId, videoId);
      expect(events).toBeDefined();
      expect(events.every((e) => e.videoId === videoId)).toBe(true);
    });
  });

  describe("Render Agents", () => {
    it("should create render agent", async () => {
      const agent = await cp.createRenderAgent(
        {
          label: "test-agent",
          status: "online",
        },
        orgId,
      );
      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.status).toBe("online");
    });

    it("should update render agent status", async () => {
      const agent = await cp.createRenderAgent(
        {
          label: "test-agent-2",
          status: "online",
        },
        orgId,
      );

      const lastSeen = new Date().toISOString();
      const updated = await cp.setRenderAgentStatus(agent.id, "busy", orgId, lastSeen);
      expect(updated).toBeDefined();
      expect(updated.status).toBe("busy");
      expect(updated.lastSeenAt).toBe(lastSeen);
    });

    it("should list render agents for org", async () => {
      const agents = await cp.listRenderAgents(orgId);
      expect(agents).toBeDefined();
      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe("Billing Management", () => {
    it("should update billing visibility", async () => {
      const account = await cp.createBillingAccount(
        {
          planId: "pro",
          billingMode: "byok",
          usageVisibilityMode: "full",
        },
        orgId,
      );

      const updated = await cp.setBillingVisibility(account.id, "redacted", orgId);
      expect(updated).toBeDefined();
      expect(updated.usageVisibilityMode).toBe("redacted");
    });

    it("should list billing accounts for org", async () => {
      const accounts = await cp.listBillingAccounts(orgId);
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every((a) => a.orgId === orgId)).toBe(true);
    });
  });
});
