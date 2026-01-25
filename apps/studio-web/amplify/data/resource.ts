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
      customDomain: schema.string(),
      customDomainVerified: schema.boolean(),
    })
    .authorization((allow) => [allow.authenticated()]),
  OrgMember: schema
    .model({
      orgId: schema.string().required(),
      userId: schema.string().required(),
      role: schema.enum(["owner", "admin", "editor", "viewer"]),
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
  ProjectFile: schema
    .model({
      orgId: schema.string().required(),
      projectId: schema.string().required(),
      relativePath: schema.string().required(),
      storageKey: schema.string().required(),
      fileType: schema.enum(["video", "utility", "asset"]),
      contentType: schema.string(),
      sizeBytes: schema.integer(),
      sha256: schema.string(),
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
      role: schema.enum(["system", "assistant", "user"]),
      content: schema.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Approval: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string().required(),
      kind: schema.string().required(),
      status: schema.enum(["pending", "approved", "rejected"]),
      requestedBy: schema.string(),
      decidedBy: schema.string(),
      decidedAt: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  RenderAgent: schema
    .model({
      orgId: schema.string().required(),
      label: schema.string(),
      status: schema.enum(["online", "offline", "busy"]),
      lastSeenAt: schema.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
  Job: schema
    .model({
      orgId: schema.string().required(),
      kind: schema.enum(["resolve", "generate", "render", "publish"]),
      status: schema.enum(["queued", "claimed", "running", "succeeded", "failed", "canceled"]),
      claimedByAgentId: schema.string(),
      executionMode: schema.enum(["cloud", "local"]),
      inputJson: schema.json(),
      retryCount: schema.integer().default(0),
      maxRetries: schema.integer().default(3),
      failureReason: schema.string(),
    })
    .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]), // Allow publish jobs to be read publicly? No, better to have a separate PublishedVideo model.

  PublishedVideo: schema
    .model({
        orgId: schema.string().required(),
        videoId: schema.string().required(),
        renderRunId: schema.string().required(),
        slug: schema.string().required(), // e.g. "my-video-123"
        accessPolicy: schema.enum(["public", "password", "org_only"]),
        passwordHash: schema.string(),
        viewCount: schema.integer(),
        publishedAt: schema.string(),
    })
    .secondaryIndexes((index) => [
        index("slug"),
    ])
    .authorization((allow) => [
        allow.authenticated(), 
        allow.publicApiKey().to(["read"]) // Public access for playback
    ]),
  JobEvent: schema
    .model({
      orgId: schema.string().required(),
      jobId: schema.string().required(),
      type: schema.enum(["status", "progress", "log"]),
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
      unitType: schema.enum(["chars", "tokens", "seconds", "frames", "bytes", "gbSeconds"]),
      quantity: schema.float().required(),
      estimatedCost: schema.float(),
      actualCost: schema.float(),
    })
    .authorization((allow) => [allow.authenticated()]),
  BillingAccount: schema
    .model({
      orgId: schema.string().required(),
      planId: schema.string(),
      billingMode: schema.enum(["byok", "markup", "flat", "credits"]),
      usageVisibilityMode: schema.enum(["full", "redacted"]),
    })
    .authorization((allow) => [allow.authenticated()]),
  WaitlistSignup: schema
    .model({
      email: schema.string().required(),
      name: schema.string(),
      persona: schema.enum(["business", "agency", "marketer", "creator", "developer", "other"]),
      wantsUpdates: schema.boolean().required(),
      source: schema.string(),
      createdAt: schema.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["create"]),
      allow.authenticated(),
    ]),
});

export const data = defineData({
  schema: studioSchema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

export type StudioSchema = typeof studioSchema;
export type Schema = StudioSchema;
