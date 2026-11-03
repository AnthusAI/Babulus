import { a as schema, defineData } from "@aws-amplify/backend";

// Every model is scoped to one Prospectus Account. `orgId` holds the Account ID, and the
// only rule on any model is `groupDefinedIn("orgId")`: AppSync lets a caller touch a row
// only when the Cognito group claim in their verified ID token names the row's Account.
// The sign-in service sets those groups (one per Account the person may use Babulus in),
// so the browser can neither choose nor forge an Account. There is no authenticated-user,
// guest or API-key rule on any model.
//
// Fields the server owns (a job's status and retry counters, a video's status) are
// readable by the Account's members but not writable by them: see `serverOwned`.
const serverOwned = (field: any) =>
  field.authorization((allow: any) => [allow.groupDefinedIn("orgId").to(["read"])]);

export const studioSchema = schema.schema({
  Project: schema
    .model({
      orgId: schema.string().required(),
      name: schema.string().required(),
      templateId: schema.string(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  Video: schema
    .model({
      orgId: schema.string().required(),
      projectId: schema.string().required(),
      title: schema.string().required(),
      status: serverOwned(schema.string()),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  GenerationRun: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string().required(),
      status: schema.string().required(),
      scriptArtifactKey: schema.string(),
      timelineArtifactKey: schema.string(),
      audioArtifactKey: schema.string(),
      logsArtifactKey: schema.string(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
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
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  Asset: schema
    .model({
      orgId: schema.string().required(),
      projectId: schema.string().required(),
      kind: schema.string().required(),
      sha256: schema.string().required(),
      storageKey: schema.string().required(),
      metadataJson: schema.json(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
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
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  Conversation: schema
    .model({
      orgId: schema.string().required(),
      videoId: schema.string(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  Message: schema
    .model({
      orgId: schema.string().required(),
      conversationId: schema.string().required(),
      role: schema.enum(["system", "assistant", "user"]),
      content: schema.string().required(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
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
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  RenderAgent: schema
    .model({
      orgId: schema.string().required(),
      label: schema.string(),
      status: schema.enum(["online", "offline", "busy"]),
      lastSeenAt: schema.string(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  Job: schema
    .model({
      orgId: schema.string().required(),
      kind: schema.enum(["resolve", "generate", "render", "publish"]),
      // A string, not an enum: Amplify cannot put a field rule on an enum. The values are
      // queued, claimed, running, succeeded, failed, canceled, and only the server sets them.
      status: serverOwned(schema.string().default("queued")),
      claimedByAgentId: serverOwned(schema.string()),
      executionMode: schema.enum(["cloud", "local"]),
      inputJson: schema.json(),
      retryCount: serverOwned(schema.integer().default(0)),
      maxRetries: serverOwned(schema.integer().default(3)),
      failureReason: schema.string(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),

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
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  JobEvent: schema
    .model({
      orgId: schema.string().required(),
      jobId: schema.string().required(),
      type: schema.enum(["status", "progress", "log"]),
      message: schema.string(),
      progress: schema.float(),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
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
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
  BillingAccount: schema
    .model({
      orgId: schema.string().required(),
      planId: schema.string(),
      billingMode: schema.enum(["byok", "markup", "flat", "credits"]),
      usageVisibilityMode: schema.enum(["full", "redacted"]),
    })
    .authorization((allow) => [allow.groupDefinedIn("orgId")]),
});

export const data = defineData({
  schema: studioSchema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

export type StudioSchema = typeof studioSchema;
export type Schema = StudioSchema;
