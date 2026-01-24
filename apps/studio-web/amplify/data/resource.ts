import { a as schema, defineData } from "@aws-amplify/backend";

const studioSchema = schema.schema({
  UserProfile: schema
    .model({
      userId: schema.string().required(),
      email: schema.string().required(),
      displayName: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Org: schema
    .model({
      name: schema.string().required(),
      slug: schema.string(),
      planTier: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  OrgMember: schema
    .model({
      orgId: schema.string().required(),
      userId: schema.string().required(),
      role: schema.enum(["owner", "admin", "editor", "viewer"]).required(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Project: schema
    .model({
      orgId: schema.string().required(),
      name: schema.string().required(),
      templateId: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Video: schema
    .model({
      orgId: schema.string().required(),
      projectId: schema.string().required(),
      title: schema.string().required(),
      status: schema.string(),
      activeStoryboardVersionId: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  StoryboardVersion: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string().required(),
      sourceText: schema.string().required(),
      parentVersionId: schema.string(),
      createdBy: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  GenerationRun: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string().required(),
      storyboardVersionId: schema.string().required(),
      status: schema.string().required(),
      scriptArtifactKey: schema.string(),
      timelineArtifactKey: schema.string(),
      audioArtifactKey: schema.string(),
      logsArtifactKey: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  RenderRun: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string().required(),
      generationRunId: schema.string().required(),
      status: schema.string().required(),
      mp4ArtifactKey: schema.string(),
      stillsArtifactPrefix: schema.string(),
      logsArtifactKey: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Asset: schema
    .model({
      orgId: schema.string().required(),
      projectId: schema.string().required(),
      kind: schema.string().required(),
      sha256: schema.string().required(),
      storageKey: schema.string().required(),
      metadataJson: schema.json(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Conversation: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Message: schema
    .model({
      orgId: schema.string().required(),
      conversationId: schema.string().required(),
      role: schema.enum(["system", "assistant", "user"]).required(),
      content: schema.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Approval: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string().required(),
      kind: schema.string().required(),
      status: schema.enum(["pending", "approved", "rejected"]).required(),
      requestedBy: schema.string(),
      decidedBy: schema.string(),
      decidedAt: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  RenderAgent: schema
    .model({
      orgId: schema.string().required(),
      label: schema.string(),
      status: schema.enum(["online", "offline", "busy"]).required(),
      lastSeenAt: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Job: schema
    .model({
      orgId: schema.string().required(),
      kind: schema.enum(["resolve", "generate", "render", "publish"]).required(),
      status: schema.enum(["queued", "claimed", "running", "succeeded", "failed", "canceled"]).required(),
      claimedByAgentId: schema.string(),
      executionMode: schema.enum(["cloud", "local"]),
      inputJson: schema.json(),
    })
    .authorization((allow) => [allow.authenticated()]),
  JobEvent: schema
    .model({
      orgId: schema.string().required(),
      jobId: schema.string().required(),
      type: schema.enum(["status", "progress", "log"]).required(),
      message: schema.string(),
      progress: schema.float(),
    })
    .authorization((allow) => [allow.authenticated()]),
  UsageEvent: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string(),
      runId: schema.string(),
      provider: schema.string(),
      unitType: schema
        .enum(["chars", "tokens", "seconds", "frames", "bytes", "gb-seconds"])
        .required(),
      quantity: schema.float().required(),
      estimatedCost: schema.float(),
      actualCost: schema.float(),
    })
    .authorization((allow) => [allow.authenticated()]),
  BillingAccount: schema
    .model({
      orgId: schema.string().required(),
      planId: schema.string(),
      billingMode: schema.enum(["byok", "markup", "flat", "credits"]).required(),
      usageVisibilityMode: schema.enum(["full", "redacted"]).required(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export const data = defineData({
  schema: studioSchema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

export type StudioSchema = typeof studioSchema;
