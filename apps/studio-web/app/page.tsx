"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { Player, StoryboardRenderer } from "@babulus/renderer";
import {
  buildTimelineLayout,
  buildActiveSession,
  buildAssetKey,
  createControlPlaneStore,
  createAsset,
  createOrg,
  createOrgMember,
  createUserProfile,
  createConversation,
  createMessage,
  createApproval,
  createRenderAgent,
  createGenerationRun,
  createJob,
  createJobEvent,
  createProject,
  createRenderRun,
  createStoryboardVersion,
  createVideo,
  deriveVideoConfig,
  getActiveClips,
  getActiveCue,
  getActiveScene,
  listOrgs,
  listOrgMembers,
  listUserMemberships,
  listUsers,
  listBillingAccounts,
  listAssets,
  listJobs,
  claimNextJob,
  listGenerationRuns,
  listConversations,
  listMessages,
  listApprovals,
  listUsageEvents,
  listRenderAgents,
  listProjects,
  listJobEvents,
  listRenderRuns,
  listStoryboardVersions,
  listVideos,
  resolveUsageVisibility,
  summarizeJobEvents,
  summarizeUsageEvents,
  sessionCan,
  claimJobWithEvent,
  executeJob,
  setOrgMemberRole,
  setJobStatusWithEvent,
  setBillingVisibility,
  setApprovalStatus,
  setRenderAgentStatus,
  setActiveStoryboardVersion,
  setGenerationRunStatus,
  setRenderRunStatus,
  setVideoStatus,
  summarizeTimeline,
  type ControlPlaneStore,
  type BillingAccount,
  type Asset,
  type GenerationRun,
  type Job,
  type JobEvent,
  type JobStatus,
  type Org,
  type OrgMember,
  type OrgMembership,
  type Project,
  type RenderRun,
  type ScriptData,
  type ScriptScene,
  type StoryboardVersion,
  type Approval,
  type Message,
  type RenderAgent,
  type TimelineData,
  type UsageEvent,
  type Video,
} from "@babulus/shared";

type PreviewEntry = {
  id: string;
  title?: string | null;
  script: string;
  timeline: string;
  audio?: string | null;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return date.toLocaleString();
};

const formatCount = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}m`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return `${Math.round(value)}`;
};

const formatMarkupValue = (value: unknown): string => {
  if (value == null) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatMarkupValue).slice(0, 3).join(", ");
  }
  return "object";
};

const renderMarkupTags = (markup?: Record<string, unknown>) => {
  const entries = Object.entries(markup ?? {});
  if (!entries.length) {
    return null;
  }
  const labels = entries.slice(0, 3).map(([key, value]) => `${key}:${formatMarkupValue(value)}`);
  const extra = entries.length - labels.length;
  return (
    <span className="markup-tags">
      {labels.map((label, index) => (
        <span key={`${label}-${index}`} className="markup-tag">
          {label}
        </span>
      ))}
      {extra > 0 ? <span className="markup-tag">+{extra}</span> : null}
    </span>
  );
};

const resolveAssetFileName = (asset: Asset) => {
  const parts = asset.storageKey.split("/");
  return parts[parts.length - 1] ?? asset.storageKey;
};

const resolveMemberLabel = (member: OrgMember, users: { id: string; displayName?: string | null }[]) => {
  const match = users.find((user) => user.id === member.userId);
  return match?.displayName ?? member.userId;
};

const normalizeAssetKind = (value: string): Asset["kind"] => {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "image":
    case "audio":
    case "video":
    case "font":
    case "data":
      return normalized;
    default:
      return "data";
  }
};

const seedControlPlane = (): {
  orgs: Org[];
  userId: string;
  store: ControlPlaneStore;
} => {
  const userId = "user-ryan";
  const orgs: Org[] = [
    {
      id: "org-tactus",
      name: "Tactus Studio",
      planTier: "internal",
      createdAt: "2026-01-22T10:00:00.000Z",
    },
    {
      id: "org-babulus",
      name: "Babulus Labs",
      planTier: "prototype",
      createdAt: "2026-01-22T10:05:00.000Z",
    },
  ];
  const users = [
    {
      id: userId,
      email: "ryan@tactus.ai",
      displayName: "Ryan",
      createdAt: "2026-01-22T09:55:00.000Z",
    },
    {
      id: "user-ava",
      email: "ava@tactus.ai",
      displayName: "Ava",
      createdAt: "2026-01-22T09:56:00.000Z",
    },
    {
      id: "user-lee",
      email: "lee@babul.us",
      displayName: "Lee",
      createdAt: "2026-01-22T09:57:00.000Z",
    },
  ];
  const orgMembers: OrgMember[] = [
    { orgId: "org-tactus", userId, role: "owner", createdAt: "2026-01-22T10:00:00.000Z" },
    { orgId: "org-tactus", userId: "user-ava", role: "editor", createdAt: "2026-01-22T10:00:00.000Z" },
    { orgId: "org-babulus", userId, role: "admin", createdAt: "2026-01-22T10:00:00.000Z" },
    { orgId: "org-babulus", userId: "user-lee", role: "viewer", createdAt: "2026-01-22T10:00:00.000Z" },
  ];
  const billingAccounts: BillingAccount[] = [
    {
      id: "bill-tactus",
      orgId: "org-tactus",
      planId: "internal",
      billingMode: "byok",
      usageVisibilityMode: "full",
      createdAt: "2026-01-22T10:00:00.000Z",
    },
    {
      id: "bill-babulus",
      orgId: "org-babulus",
      planId: "starter",
      billingMode: "markup",
      usageVisibilityMode: "redacted",
      createdAt: "2026-01-22T10:00:00.000Z",
    },
  ];

  const projects: Project[] = [
    {
      id: "proj-tactus",
      orgId: "org-tactus",
      name: "Tactus Website",
      templateId: "tactus-default",
      createdAt: "2026-01-22T10:10:00.000Z",
    },
    {
      id: "proj-babulus",
      orgId: "org-babulus",
      name: "Babulus Launch",
      templateId: "babulus-default",
      createdAt: "2026-01-22T10:12:00.000Z",
    },
  ];

  const assets: Asset[] = [
    {
      id: "asset-hero",
      orgId: "org-tactus",
      projectId: "proj-tactus",
      kind: "image",
      sha256: "sha-hero-001",
      storageKey: buildAssetKey({
        orgId: "org-tactus",
        projectId: "proj-tactus",
        kind: "image",
        sha256: "sha-hero-001",
        fileName: "hero.png",
      }),
      metadataJson: { width: 1920, height: 1080 },
      createdAt: "2026-01-22T10:18:00.000Z",
    },
    {
      id: "asset-voice",
      orgId: "org-tactus",
      projectId: "proj-tactus",
      kind: "audio",
      sha256: "sha-voice-002",
      storageKey: buildAssetKey({
        orgId: "org-tactus",
        projectId: "proj-tactus",
        kind: "audio",
        sha256: "sha-voice-002",
        fileName: "voiceover.wav",
      }),
      metadataJson: { durationSec: 18.4 },
      createdAt: "2026-01-22T10:19:00.000Z",
    },
    {
      id: "asset-brand",
      orgId: "org-tactus",
      projectId: null,
      kind: "image",
      sha256: "sha-brand-003",
      storageKey: buildAssetKey({
        orgId: "org-tactus",
        projectId: null,
        kind: "image",
        sha256: "sha-brand-003",
        fileName: "brand-mark.png",
      }),
      metadataJson: { width: 1024, height: 1024 },
      createdAt: "2026-01-22T10:19:30.000Z",
    },
    {
      id: "asset-logo",
      orgId: "org-babulus",
      projectId: "proj-babulus",
      kind: "image",
      sha256: "sha-logo-004",
      storageKey: buildAssetKey({
        orgId: "org-babulus",
        projectId: "proj-babulus",
        kind: "image",
        sha256: "sha-logo-004",
        fileName: "logo.png",
      }),
      metadataJson: { width: 1200, height: 600 },
      createdAt: "2026-01-22T10:19:45.000Z",
    },
  ];

  const videos: Video[] = [
    {
      id: "vid-intro",
      orgId: "org-tactus",
      projectId: "proj-tactus",
      title: "Intro Overview",
      status: "ready",
      activeStoryboardVersionId: "sbv-intro-3",
      createdAt: "2026-01-22T10:20:00.000Z",
    },
    {
      id: "vid-guardrails",
      orgId: "org-tactus",
      projectId: "proj-tactus",
      title: "Guardrails",
      status: "draft",
      activeStoryboardVersionId: null,
      createdAt: "2026-01-22T10:24:00.000Z",
    },
    {
      id: "vid-launch",
      orgId: "org-babulus",
      projectId: "proj-babulus",
      title: "Launch Teaser",
      status: "generating",
      activeStoryboardVersionId: "sbv-launch-1",
      createdAt: "2026-01-22T10:26:00.000Z",
    },
  ];

  const storyboardVersions: StoryboardVersion[] = [
    {
      id: "sbv-intro-3",
      orgId: "org-tactus",
      videoId: "vid-intro",
      sourceText: "export default defineVideo(async (ctx) => ({ id: \"intro\", scenes: [] }))",
      parentVersionId: "sbv-intro-2",
      createdBy: userId,
      createdAt: "2026-01-22T10:30:00.000Z",
    },
    {
      id: "sbv-launch-1",
      orgId: "org-babulus",
      videoId: "vid-launch",
      sourceText: "export default defineVideo(async (ctx) => ({ id: \"launch\", scenes: [] }))",
      parentVersionId: null,
      createdBy: userId,
      createdAt: "2026-01-22T10:34:00.000Z",
    },
  ];

  const generationRuns: GenerationRun[] = [
    {
      id: "gen-intro-1",
      orgId: "org-tactus",
      videoId: "vid-intro",
      storyboardVersionId: "sbv-intro-3",
      status: "succeeded",
      scriptArtifactKey: "org/tactus/vid-intro/intro.script.json",
      timelineArtifactKey: "org/tactus/vid-intro/intro.timeline.json",
      audioArtifactKey: "org/tactus/vid-intro/intro.wav",
      logsArtifactKey: "org/tactus/vid-intro/gen.log",
      createdAt: "2026-01-22T10:40:00.000Z",
    },
    {
      id: "gen-launch-1",
      orgId: "org-babulus",
      videoId: "vid-launch",
      storyboardVersionId: "sbv-launch-1",
      status: "running",
      scriptArtifactKey: null,
      timelineArtifactKey: null,
      audioArtifactKey: null,
      logsArtifactKey: null,
      createdAt: "2026-01-22T10:41:00.000Z",
    },
  ];

  const renderRuns: RenderRun[] = [
    {
      id: "render-intro-1",
      orgId: "org-tactus",
      videoId: "vid-intro",
      generationRunId: "gen-intro-1",
      status: "succeeded",
      mp4ArtifactKey: "org/tactus/vid-intro/intro.mp4",
      stillsArtifactPrefix: "org/tactus/vid-intro/stills/",
      logsArtifactKey: "org/tactus/vid-intro/render.log",
      createdAt: "2026-01-22T10:44:00.000Z",
    },
  ];

  const jobs: Job[] = [
    {
      id: "job-render-1",
      orgId: "org-tactus",
      kind: "render",
      status: "queued",
      claimedByAgentId: null,
      executionMode: "local",
      inputJson: JSON.stringify({ videoId: "vid-intro" }),
      createdAt: "2026-01-22T10:50:00.000Z",
      updatedAt: "2026-01-22T10:50:00.000Z",
    },
    {
      id: "job-generate-1",
      orgId: "org-babulus",
      kind: "generate",
      status: "running",
      claimedByAgentId: "agent-7",
      executionMode: "cloud",
      inputJson: JSON.stringify({ videoId: "vid-launch" }),
      createdAt: "2026-01-22T10:51:00.000Z",
      updatedAt: "2026-01-22T10:52:00.000Z",
    },
  ];

  const jobEvents: JobEvent[] = [
    {
      id: "job-event-1",
      orgId: "org-tactus",
      jobId: "job-render-1",
      type: "status",
      message: "queued",
      progress: 0,
      createdAt: "2026-01-22T10:50:00.000Z",
    },
    {
      id: "job-event-2",
      orgId: "org-babulus",
      jobId: "job-generate-1",
      type: "status",
      message: "running",
      progress: 0.4,
      createdAt: "2026-01-22T10:52:00.000Z",
    },
    {
      id: "job-event-3",
      orgId: "org-tactus",
      jobId: "job-render-1",
      type: "progress",
      message: "frames rendered",
      progress: 0.2,
      createdAt: "2026-01-22T10:50:20.000Z",
    },
    {
      id: "job-event-4",
      orgId: "org-tactus",
      jobId: "job-render-1",
      type: "log",
      message: "render run created",
      progress: null,
      createdAt: "2026-01-22T10:50:30.000Z",
    },
    {
      id: "job-event-5",
      orgId: "org-babulus",
      jobId: "job-generate-1",
      type: "log",
      message: "generation run created",
      progress: null,
      createdAt: "2026-01-22T10:52:10.000Z",
    },
    {
      id: "job-event-6",
      orgId: "org-babulus",
      jobId: "job-generate-1",
      type: "progress",
      message: "generation complete",
      progress: 0.7,
      createdAt: "2026-01-22T10:52:20.000Z",
    },
  ];

  const conversations = [
    {
      id: "conv-intro",
      orgId: "org-tactus",
      videoId: "vid-intro",
      createdAt: "2026-01-22T10:55:00.000Z",
    },
    {
      id: "conv-launch",
      orgId: "org-babulus",
      videoId: "vid-launch",
      createdAt: "2026-01-22T10:56:00.000Z",
    },
  ];

  const messages: Message[] = [
    {
      id: "msg-1",
      orgId: "org-tactus",
      conversationId: "conv-intro",
      role: "assistant",
      content: "I drafted a tighter hook and added a stronger CTA. Want to preview?",
      createdAt: "2026-01-22T10:57:00.000Z",
    },
    {
      id: "msg-2",
      orgId: "org-tactus",
      conversationId: "conv-intro",
      role: "user",
      content: "Yes, but keep the tone calm and confident.",
      createdAt: "2026-01-22T10:58:00.000Z",
    },
    {
      id: "msg-3",
      orgId: "org-tactus",
      conversationId: "conv-intro",
      role: "assistant",
      content: "Done. I also shortened the second scene to keep pacing tight.",
      createdAt: "2026-01-22T10:59:00.000Z",
    },
  ];

  const approvals: Approval[] = [
    {
      id: "approval-script",
      orgId: "org-tactus",
      videoId: "vid-intro",
      kind: "script",
      status: "pending",
      requestedBy: userId,
      decidedBy: null,
      decidedAt: null,
    },
  ];

  const usageEvents: UsageEvent[] = [
    {
      id: "usage-tts-1",
      orgId: "org-tactus",
      videoId: "vid-intro",
      runId: "gen-intro-1",
      provider: "openai",
      unitType: "tokens",
      quantity: 12400,
      estimatedCost: 3.4,
      actualCost: null,
      createdAt: "2026-01-22T10:42:00.000Z",
    },
    {
      id: "usage-render-1",
      orgId: "org-tactus",
      videoId: "vid-intro",
      runId: "render-intro-1",
      provider: "ffmpeg",
      unitType: "seconds",
      quantity: 192,
      estimatedCost: 2.1,
      actualCost: null,
      createdAt: "2026-01-22T10:45:00.000Z",
    },
  ];

  const renderAgents: RenderAgent[] = [
    {
      id: "agent-mac",
      orgId: "org-tactus",
      label: "Mac Studio",
      status: "online",
      lastSeenAt: "2026-01-22T10:48:00.000Z",
    },
    {
      id: "agent-cloud",
      orgId: "org-babulus",
      label: "Cloud Worker",
      status: "busy",
      lastSeenAt: "2026-01-22T10:49:00.000Z",
    },
  ];

  const store = createControlPlaneStore({
    orgs,
    orgMembers,
    billingAccounts,
    users,
    conversations,
    messages,
    approvals,
    usageEvents,
    renderAgents,
    assets,
    jobs,
    jobEvents,
    projects,
    videos,
    storyboardVersions,
    generationRuns,
    renderRuns,
  });

  return { orgs, userId, store };
};

const selectActiveId = <T extends { id: string }>(items: T[], currentId: string | null): string | null => {
  if (currentId && items.some((item) => item.id === currentId)) {
    return currentId;
  }
  return items[0]?.id ?? null;
};

export default function Home() {
  const seedRef = useRef<ReturnType<typeof seedControlPlane> | null>(null);
  if (!seedRef.current) {
    seedRef.current = seedControlPlane();
  }
  const { store, userId } = seedRef.current;

  const fallbackScript: ScriptData = {
    fps: 30,
    meta: { width: 1280, height: 720 },
    scenes: [
      {
        id: "scene-1",
        title: "Opening Hook",
        startSec: 0,
        endSec: 6,
        cues: [
          { id: "cue-1", label: "Problem statement", startSec: 0, endSec: 3 },
          { id: "cue-2", label: "Credibility signal", startSec: 3, endSec: 6 },
        ],
      },
      {
        id: "scene-2",
        title: "Product Reveal",
        startSec: 6,
        endSec: 12,
        cues: [
          { id: "cue-3", label: "Capability overview", startSec: 6, endSec: 9 },
          { id: "cue-4", label: "Outcome promise", startSec: 9, endSec: 12 },
        ],
      },
      {
        id: "scene-3",
        title: "Call to Action",
        startSec: 12,
        endSec: 18,
        cues: [
          { id: "cue-5", label: "Invite signup", startSec: 12, endSec: 15 },
          { id: "cue-6", label: "Next steps", startSec: 15, endSec: 18 },
        ],
      },
    ],
  };

  const [script, setScript] = useState<ScriptData | null>(null);
  const [previewEntry, setPreviewEntry] = useState<PreviewEntry | null>(null);
  const [previewIndex, setPreviewIndex] = useState<PreviewEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string>(() => "org-tactus");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [storeRevision, setStoreRevision] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [executionNotice, setExecutionNotice] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRaf = useRef<number | null>(null);
  const audioSrc = previewEntry?.audio ? `/preview/${previewEntry.audio}` : null;

  const previewScript = script ?? fallbackScript;
  const scenes = previewScript.scenes ?? [];
  const timelineSummary = useMemo(() => summarizeTimeline(timeline), [timeline]);
  const { fps, width, height, durationSec, durationFrames } = useMemo(
    () =>
      deriveVideoConfig({
        script: previewScript,
        timelineSummary,
        defaults: { fps: 30, width: 1280, height: 720 },
      }),
    [previewScript, timelineSummary],
  );
  const currentTimeSec = currentFrame / fps;
  const activeAudioClips = useMemo(() => getActiveClips(timeline, currentTimeSec), [timeline, currentTimeSec]);
  const timelineLayout = useMemo(() => buildTimelineLayout(timeline, durationSec), [timeline, durationSec]);
  const activeClipKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of activeAudioClips) {
      const trackKey = entry.trackId ?? entry.trackKind ?? "track";
      const clipKey = entry.clip.id ?? entry.clip.kind ?? "clip";
      keys.add(`${trackKey}:${clipKey}`);
    }
    return keys;
  }, [activeAudioClips]);

  const memberships = useMemo(() => listUserMemberships(store, userId), [store, userId, storeRevision]);
  const orgs = useMemo(() => listOrgs(store, userId), [store, userId, storeRevision]);
  const orgMembers = useMemo(() => listOrgMembers(store, activeOrgId), [store, activeOrgId, storeRevision]);
  const orgUsers = useMemo(() => listUsers(store, activeOrgId), [store, activeOrgId, storeRevision]);
  const projects = useMemo(() => listProjects(store, activeOrgId), [store, activeOrgId, storeRevision]);
  const videos = useMemo(
    () => listVideos(store, activeOrgId, activeProjectId),
    [store, activeOrgId, activeProjectId, storeRevision],
  );
  const assets = useMemo(
    () => listAssets(store, activeOrgId, activeProjectId),
    [store, activeOrgId, activeProjectId, storeRevision],
  );
  const storyboardVersions = useMemo(
    () => listStoryboardVersions(store, activeOrgId, activeVideoId),
    [store, activeOrgId, activeVideoId, storeRevision],
  );
  const generationRuns = useMemo(
    () => listGenerationRuns(store, activeOrgId, activeVideoId),
    [store, activeOrgId, activeVideoId, storeRevision],
  );
  const renderRuns = useMemo(
    () => listRenderRuns(store, activeOrgId, generationRuns[0]?.id ?? null),
    [store, activeOrgId, generationRuns, storeRevision],
  );
  const jobs = useMemo(() => listJobs(store, activeOrgId), [store, activeOrgId, storeRevision]);
  const jobEvents = useMemo(() => listJobEvents(store, activeOrgId), [store, activeOrgId, storeRevision]);
  const conversations = useMemo(
    () => listConversations(store, activeOrgId, activeVideoId),
    [store, activeOrgId, activeVideoId, storeRevision],
  );
  const orderedConversations = useMemo(
    () => [...conversations].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [conversations],
  );
  const activeConversation =
    orderedConversations.find((conversation) => conversation.id === activeConversationId) ??
    orderedConversations[orderedConversations.length - 1] ??
    null;
  const chatMessages = useMemo(
    () =>
      activeConversation
        ? listMessages(store, activeOrgId, activeConversation.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : [],
    [store, activeOrgId, activeConversation, storeRevision],
  );
  const approvals = useMemo(
    () => listApprovals(store, activeOrgId, activeVideoId),
    [store, activeOrgId, activeVideoId, storeRevision],
  );
  const usageEvents = useMemo(
    () => listUsageEvents(store, activeOrgId, activeVideoId ?? null),
    [store, activeOrgId, activeVideoId, storeRevision],
  );
  const usageSummary = useMemo(() => summarizeUsageEvents(usageEvents), [usageEvents]);
  const renderAgents = useMemo(
    () => listRenderAgents(store, activeOrgId),
    [store, activeOrgId, storeRevision],
  );
  const orderedStoryboardVersions = useMemo(
    () => [...storyboardVersions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [storyboardVersions],
  );
  const jobEventSummaries = useMemo(() => summarizeJobEvents(jobEvents), [jobEvents]);
  const jobEventsByJob = useMemo(() => {
    const map = new Map<string, JobEvent[]>();
    const ordered = [...jobEvents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const event of ordered) {
      const list = map.get(event.jobId) ?? [];
      list.push(event);
      map.set(event.jobId, list);
    }
    return map;
  }, [jobEvents]);

  useEffect(() => {
    setActiveOrgId((prev) => {
      const next = selectActiveId(orgs, prev);
      return next ?? prev;
    });
  }, [orgs]);

  useEffect(() => {
    setActiveProjectId((prev) => {
      const next = selectActiveId(projects, prev);
      return prev === next ? prev : next;
    });
  }, [projects]);

  useEffect(() => {
    setActiveVideoId((prev) => {
      const next = selectActiveId(videos, prev);
      return prev === next ? prev : next;
    });
  }, [videos]);

  useEffect(() => {
    setActiveConversationId((prev) => {
      if (!orderedConversations.length) {
        return null;
      }
      if (prev && orderedConversations.some((conversation) => conversation.id === prev)) {
        return prev;
      }
      return orderedConversations[orderedConversations.length - 1]?.id ?? null;
    });
  }, [orderedConversations]);

  const activeOrg = useMemo(() => orgs.find((org) => org.id === activeOrgId) ?? null, [orgs, activeOrgId]);
  const activeSession = useMemo(() => {
    try {
      return buildActiveSession({ userId, memberships, preferredOrgId: activeOrgId });
    } catch {
      return null;
    }
  }, [userId, memberships, activeOrgId]);
  const activeBilling = useMemo(() => listBillingAccounts(store, activeOrgId)[0] ?? null, [store, activeOrgId, storeRevision]);
  const localAgentId = useMemo(() => renderAgents[0]?.id ?? "agent-local", [renderAgents]);
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );
  const activeVideo = useMemo(
    () => videos.find((video) => video.id === activeVideoId) ?? null,
    [videos, activeVideoId],
  );
  const activeStoryboardVersionId = activeVideo?.activeStoryboardVersionId ?? null;
  const activeStoryboardVersion = useMemo(
    () => orderedStoryboardVersions.find((version) => version.id === activeStoryboardVersionId) ?? null,
    [orderedStoryboardVersions, activeStoryboardVersionId],
  );
  const canCreateProject = activeSession ? sessionCan(activeSession, "project:create") : false;
  const canCreateVideo = activeSession ? sessionCan(activeSession, "video:create") : false;
  const canEditStoryboard = activeSession ? sessionCan(activeSession, "storyboard:edit") : false;
  const canRenderVideo = activeSession ? sessionCan(activeSession, "video:render") : false;
  const canViewAssets = activeSession ? sessionCan(activeSession, "asset:read") : false;
  const canUploadAsset = activeSession ? sessionCan(activeSession, "asset:upload") : false;
  const canManageBilling = activeSession ? sessionCan(activeSession, "billing:manage") : false;
  const usageVisibility =
    activeSession && activeBilling
      ? resolveUsageVisibility(activeSession.role, activeBilling.usageVisibilityMode)
      : "redacted";
  const assetScopeLabel = activeProject ? `${activeProject.name} + shared` : "Shared assets";

  useEffect(() => {
    if (!autoRun || !canRenderVideo) {
      return;
    }
    const interval = window.setInterval(() => {
      const claimed = claimNextJob(store, localAgentId, activeOrgId);
      if (!claimed) {
        return;
      }
      try {
        const result = executeJob(store, claimed.id, localAgentId, activeOrgId);
        applyExecutionResult(result);
        setExecutionNotice(`Auto-executed ${claimed.kind} job ${claimed.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setExecutionNotice(`Auto-run failed: ${message}`);
      }
      bumpStore();
    }, 2000);
    return () => {
      window.clearInterval(interval);
    };
  }, [autoRun, canRenderVideo, activeOrgId, localAgentId, store]);

  const cueCount = useMemo(
    () => scenes.reduce((sum, scene) => sum + (scene.cues?.length ?? 0), 0),
    [scenes],
  );

  const activeScene = useMemo(() => getActiveScene(previewScript, currentTimeSec), [previewScript, currentTimeSec]);
  const activeCue = useMemo(() => getActiveCue(previewScript, currentTimeSec), [previewScript, currentTimeSec]);

  useEffect(() => {
    let canceled = false;
    const loadIndex = async () => {
      try {
        const res = await fetch(`/preview/index.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        const entries = Array.isArray(data?.compositions) ? (data.compositions as PreviewEntry[]) : [];
        if (canceled) {
          return;
        }
        setPreviewIndex(entries);
        const preferredId = activeVideo?.id ?? activeId;
        const preferred = preferredId ? entries.find((entry) => entry.id === preferredId) : null;
        const fallback = entries[0] ?? null;
        const next = preferred ?? fallback;
        if (next?.id) {
          setPreviewEntry(next);
          setActiveId(next.id);
        }
      } catch {
        // ignore
      }
    };
    loadIndex();
    return () => {
      canceled = true;
    };
  }, [activeVideo?.id, activeId]);

  useEffect(() => {
    if (!previewIndex.length || !activeVideo?.id) {
      return;
    }
    const match = previewIndex.find((entry) => entry.id === activeVideo.id);
    if (match?.id) {
      setPreviewEntry(match);
      setActiveId(match.id);
    }
  }, [previewIndex, activeVideo?.id]);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    let canceled = false;
    const scriptName = previewEntry?.script ?? `${activeId}.script.json`;

    const loadScript = async () => {
      try {
        const res = await fetch(`/preview/${scriptName}?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (canceled || !data?.scenes) {
          return;
        }
        const mappedScenes: ScriptScene[] = data.scenes.map((scene: ScriptScene) => ({
          id: scene.id,
          title: scene.title ?? scene.id,
          startSec: scene.startSec ?? 0,
          endSec: scene.endSec ?? 0,
          markup: scene.markup ?? undefined,
          cues: (scene.cues ?? []).map((cue) => ({
            id: cue.id,
            label: cue.label ?? cue.text ?? cue.id,
            text: cue.text ?? "",
            startSec: cue.startSec ?? 0,
            endSec: cue.endSec ?? cue.startSec ?? 0,
            markup: cue.markup ?? undefined,
          })),
        }));
        setScript({
          scenes: mappedScenes,
          fps: data.fps,
          meta: data.meta,
        });
        setLastSync(new Date().toLocaleTimeString());
      } catch {
        // ignore
      }
    };

    loadScript();
    const interval = setInterval(loadScript, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeId, previewEntry?.script]);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    let canceled = false;
    const timelineName = previewEntry?.timeline ?? `${activeId}.timeline.json`;

    const loadTimeline = async () => {
      try {
        const res = await fetch(`/preview/${timelineName}?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (canceled) {
          return;
        }
        setTimeline(data as TimelineData);
      } catch {
        // ignore
      }
    };

    loadTimeline();
    const interval = setInterval(loadTimeline, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeId, previewEntry?.timeline]);

  useEffect(() => {
    setCurrentFrame(0);
    setPlaying(false);
  }, [activeId]);

  useEffect(() => {
    const maxFrame = Math.max(0, durationFrames - 1);
    setCurrentFrame((prev) => Math.min(prev, maxFrame));
  }, [durationFrames]);

  const syncAudioToFrame = (frame: number) => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }
    const target = frame / fps;
    if (!Number.isFinite(target)) {
      return;
    }
    if (Math.abs(audio.currentTime - target) > 0.08) {
      try {
        audio.currentTime = target;
      } catch {
        return;
      }
    }
  };

  useEffect(() => {
    syncAudioToFrame(currentFrame);
  }, [audioSrc, fps, currentFrame]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }
    if (playing) {
      syncAudioToFrame(currentFrame);
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [playing, audioSrc]);

  useEffect(() => {
    if (!playing || !audioSrc) {
      if (playbackRaf.current != null) {
        cancelAnimationFrame(playbackRaf.current);
      }
      playbackRaf.current = null;
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (audio && Number.isFinite(audio.currentTime)) {
        const nextFrame = Math.max(0, Math.min(durationFrames - 1, Math.round(audio.currentTime * fps)));
        setCurrentFrame(nextFrame);
      }
      playbackRaf.current = requestAnimationFrame(tick);
    };
    playbackRaf.current = requestAnimationFrame(tick);
    return () => {
      if (playbackRaf.current != null) {
        cancelAnimationFrame(playbackRaf.current);
      }
      playbackRaf.current = null;
    };
  }, [playing, audioSrc, durationFrames, fps]);

  useEffect(() => {
    if (!playing) {
      syncAudioToFrame(currentFrame);
    }
  }, [currentFrame, playing]);

  const handleOrgChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActiveOrgId(event.target.value);
  };

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value as OrgMembership["role"];
    const membership = memberships.find((entry) => entry.orgId === activeOrgId);
    if (!membership) {
      return;
    }
    setOrgMemberRole(store, membership.userId, nextRole, activeOrgId);
    bumpStore();
  };

  const handleCreateOrg = () => {
    if (!activeSession || !sessionCan(activeSession, "org:manage")) {
      return;
    }
    const name = window.prompt("Organization name");
    if (!name) {
      return;
    }
    const org = createOrg(store, { name }, undefined);
    createOrgMember(
      store,
      {
        orgId: org.id,
        userId: activeSession.userId,
        role: "owner",
      },
      org.id,
    );
    setActiveOrgId(org.id);
    bumpStore();
  };

  const handleProjectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActiveProjectId(event.target.value || null);
  };

  const handleVideoChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActiveVideoId(event.target.value || null);
  };

  const handleConversationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActiveConversationId(event.target.value || null);
  };

  const handlePreviewChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    const match = previewIndex.find((entry) => entry.id === nextId);
    if (!match) {
      return;
    }
    setActiveId(match.id);
    setPreviewEntry(match);
  };

  const bumpStore = () => {
    setStoreRevision((value) => value + 1);
  };

  const handleStoryboardChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!activeVideo) {
      return;
    }
    const nextId = event.target.value;
    if (!nextId) {
      return;
    }
    setActiveStoryboardVersion(store, activeVideo.id, nextId, activeOrgId);
    bumpStore();
  };

  const handleNewVersion = () => {
    if (!activeVideo || !canEditStoryboard) {
      return;
    }
    const stub = `export default defineVideo(async (ctx) => ({ id: \"${activeVideo.id}\", scenes: [] }))`;
    const version = createStoryboardVersion(
      store,
      {
        videoId: activeVideo.id,
        sourceText: stub,
        parentVersionId: activeStoryboardVersionId ?? null,
        createdBy: "local-user",
      },
      activeOrgId,
    );
    setActiveStoryboardVersion(store, activeVideo.id, version.id, activeOrgId);
    bumpStore();
  };

  const handleCreateProject = () => {
    if (!canCreateProject) {
      return;
    }
    const name = window.prompt("Project name");
    if (!name) {
      return;
    }
    const record = createProject(store, { name }, activeOrgId);
    setActiveProjectId(record.id);
    bumpStore();
  };

  const handleCreateVideo = () => {
    if (!activeProject || !canCreateVideo) {
      return;
    }
    const title = window.prompt("Video title");
    if (!title) {
      return;
    }
    const record = createVideo(
      store,
      {
        projectId: activeProject.id,
        title,
      },
      activeOrgId,
    );
    setActiveVideoId(record.id);
    bumpStore();
  };

  const handleUploadAsset = () => {
    if (!canUploadAsset) {
      return;
    }
    const fileName = window.prompt("Asset filename", "asset.png");
    if (!fileName) {
      return;
    }
    const kindInput = window.prompt("Asset kind (image/audio/video/font/data)", "image");
    if (!kindInput) {
      return;
    }
    const kind = normalizeAssetKind(kindInput);
    const shared = activeProjectId ? window.confirm("Store as shared org asset?") : true;
    const projectId = shared ? null : activeProjectId;
    const sha256 = Math.random().toString(16).slice(2, 10);
    createAsset(
      store,
      {
        projectId,
        kind,
        sha256,
        fileName,
        metadataJson: { fileName, uploadedBy: userId },
      },
      activeOrgId,
    );
    bumpStore();
  };

  const handleInviteMember = () => {
    if (!activeOrgId) {
      return;
    }
    const email = window.prompt("Member email");
    if (!email) {
      return;
    }
    const roleInput = window.prompt("Role (owner/admin/editor/viewer)", "viewer");
    if (!roleInput) {
      return;
    }
    const role = roleInput.toLowerCase() as OrgMembership["role"];
    const profile = createUserProfile(store, { email }, undefined);
    createOrgMember(
      store,
      {
        orgId: activeOrgId,
        userId: profile.id,
        role,
      },
      activeOrgId,
    );
    bumpStore();
  };

  const handleBillingVisibility = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!activeBilling || !canManageBilling) {
      return;
    }
    const next = event.target.value as BillingAccount["usageVisibilityMode"];
    setBillingVisibility(store, activeBilling.id, next, activeOrgId);
    bumpStore();
  };

  const handleSendMessage = () => {
    if (!activeOrgId || !chatInput.trim()) {
      return;
    }
    let conversation = activeConversation;
    if (!conversation) {
      conversation = createConversation(store, { videoId: activeVideoId ?? null }, activeOrgId);
      setActiveConversationId(conversation.id);
    }
    createMessage(
      store,
      {
        conversationId: conversation.id,
        role: "user",
        content: chatInput.trim(),
      },
      activeOrgId,
    );
    setChatInput("");
    bumpStore();
  };

  const handleNewConversation = () => {
    if (!activeOrgId) {
      return;
    }
    const conversation = createConversation(store, { videoId: activeVideoId ?? null }, activeOrgId);
    setActiveConversationId(conversation.id);
    bumpStore();
  };

  const handleRequestApproval = () => {
    if (!activeVideo || !activeSession) {
      return;
    }
    const kind = window.prompt("Approval kind", "script");
    if (!kind) {
      return;
    }
    createApproval(
      store,
      {
        videoId: activeVideo.id,
        kind,
        status: "pending",
        requestedBy: activeSession.userId,
      },
      activeOrgId,
    );
    bumpStore();
  };

  const handleApprovalStatus = (approvalId: string, status: "approved" | "rejected") => {
    if (!activeSession) {
      return;
    }
    setApprovalStatus(store, approvalId, status, activeOrgId, activeSession.userId, new Date().toISOString());
    bumpStore();
  };

  const handleRegisterAgent = () => {
    const label = window.prompt("Agent label", "Render Agent");
    if (!label) {
      return;
    }
    createRenderAgent(
      store,
      {
        label,
        status: "online",
        lastSeenAt: new Date().toISOString(),
      },
      activeOrgId,
    );
    bumpStore();
  };

  const handleAgentStatus = (agentId: string, status: "online" | "offline" | "busy") => {
    setRenderAgentStatus(store, agentId, status, activeOrgId, new Date().toISOString());
    bumpStore();
  };

  const handleGenerationStatus = (runId: string, status: "queued" | "running" | "succeeded" | "failed") => {
    if (!canRenderVideo) {
      return;
    }
    setGenerationRunStatus(store, runId, status, activeOrgId);
    if (activeVideo) {
      if (status === "succeeded") {
        setVideoStatus(store, activeVideo.id, "ready", activeOrgId);
      } else if (status === "failed") {
        setVideoStatus(store, activeVideo.id, "error", activeOrgId);
      } else if (status === "running") {
        setVideoStatus(store, activeVideo.id, "generating", activeOrgId);
      }
    }
    bumpStore();
  };

  const handleRenderStatus = (runId: string, status: "queued" | "running" | "succeeded" | "failed") => {
    if (!canRenderVideo) {
      return;
    }
    setRenderRunStatus(store, runId, status, activeOrgId);
    if (activeVideo) {
      if (status === "succeeded") {
        setVideoStatus(store, activeVideo.id, "published", activeOrgId);
      } else if (status === "failed") {
        setVideoStatus(store, activeVideo.id, "error", activeOrgId);
      } else if (status === "running") {
        setVideoStatus(store, activeVideo.id, "rendering", activeOrgId);
      }
    }
    bumpStore();
  };

  const handleQueueJob = (kind: Job["kind"]) => {
    if (!activeVideo || !canRenderVideo) {
      return;
    }
    const input: Record<string, string> = { videoId: activeVideo.id };
    if (kind === "generate") {
      const versionId = activeStoryboardVersion?.id ?? activeVideo.activeStoryboardVersionId ?? null;
      if (!versionId) {
        window.alert("Select a storyboard version before generating.");
        return;
      }
      input.storyboardVersionId = versionId;
    }
    if (kind === "render") {
      const latestRun = [...generationRuns].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-1)[0];
      if (!latestRun) {
        window.alert("Generate a run before rendering.");
        return;
      }
      input.generationRunId = latestRun.id;
    }
    const job = createJob(
      store,
      {
        kind,
        status: "queued",
        executionMode: "local",
        inputJson: JSON.stringify(input),
      },
      activeOrgId,
    );
    createJobEvent(
      store,
      {
        jobId: job.id,
        type: "status",
        message: "queued",
        progress: 0,
      },
      activeOrgId,
    );
    bumpStore();
  };

  const handleClaimJob = (jobId: string) => {
    if (!canRenderVideo) {
      return;
    }
    claimJobWithEvent(store, jobId, localAgentId, activeOrgId);
    if (renderAgents.some((agent) => agent.id === localAgentId)) {
      setRenderAgentStatus(store, localAgentId, "busy", activeOrgId, new Date().toISOString());
    }
    setExecutionNotice(`Claimed job ${jobId}`);
    bumpStore();
  };

  const handleClaimNextJob = () => {
    if (!canRenderVideo) {
      return;
    }
    const claimed = claimNextJob(store, localAgentId, activeOrgId);
    if (!claimed) {
      setExecutionNotice("No queued jobs");
      return;
    }
    setExecutionNotice(`Claimed ${claimed.kind} job ${claimed.id}`);
    bumpStore();
  };

  const handleJobStatus = (jobId: string, status: JobStatus) => {
    if (!canRenderVideo) {
      return;
    }
    setJobStatusWithEvent(store, jobId, status, activeOrgId);
    setExecutionNotice(`Job ${jobId} → ${status}`);
    bumpStore();
  };

  const applyExecutionResult = (result?: { generationRun?: GenerationRun; renderRun?: RenderRun }) => {
    if (!result) {
      return;
    }
    if (result.generationRun) {
      setVideoStatus(store, result.generationRun.videoId, "ready", activeOrgId);
    }
    if (result.renderRun) {
      setVideoStatus(store, result.renderRun.videoId, "published", activeOrgId);
    }
  };

  const handleExecuteJob = (jobId: string) => {
    if (!canRenderVideo) {
      return;
    }
    try {
      const result = executeJob(store, jobId, localAgentId, activeOrgId);
      applyExecutionResult(result);
      setExecutionNotice(`Executed job ${jobId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionNotice(`Job ${jobId} failed: ${message}`);
    }
    bumpStore();
  };

  const handleExecuteNextJob = () => {
    if (!canRenderVideo) {
      return;
    }
    const claimed = claimNextJob(store, localAgentId, activeOrgId);
    if (!claimed) {
      setExecutionNotice("No queued jobs");
      return;
    }
    try {
      const result = executeJob(store, claimed.id, localAgentId, activeOrgId);
      applyExecutionResult(result);
      setExecutionNotice(`Executed ${claimed.kind} job ${claimed.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionNotice(`Job ${claimed.id} failed: ${message}`);
    }
    bumpStore();
  };

  useEffect(() => {
    if (!activeVideo || orderedStoryboardVersions.length === 0) {
      return;
    }
    const existing = activeVideo.activeStoryboardVersionId;
    if (existing && orderedStoryboardVersions.some((version) => version.id === existing)) {
      return;
    }
    const latest = orderedStoryboardVersions[orderedStoryboardVersions.length - 1];
    setActiveStoryboardVersion(store, activeVideo.id, latest.id, activeOrgId);
    bumpStore();
  }, [activeVideo, orderedStoryboardVersions, activeOrgId, store]);

  const handleGenerateClick = () => {
    if (!activeVideo) {
      return;
    }
    const targetVersion = activeStoryboardVersion ?? orderedStoryboardVersions[orderedStoryboardVersions.length - 1];
    if (!targetVersion) {
      return;
    }
    createGenerationRun(
      store,
      {
        videoId: activeVideo.id,
        storyboardVersionId: targetVersion.id,
        status: "running",
      },
      activeOrgId,
    );
    setVideoStatus(store, activeVideo.id, "generating", activeOrgId);
    bumpStore();
  };

  const handleRenderClick = () => {
    if (!activeVideo) {
      return;
    }
    const sortedRuns = [...generationRuns].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latestRun = sortedRuns[sortedRuns.length - 1];
    if (!latestRun) {
      return;
    }
    createRenderRun(
      store,
      {
        videoId: activeVideo.id,
        generationRunId: latestRun.id,
        status: "running",
      },
      activeOrgId,
    );
    setVideoStatus(store, activeVideo.id, "rendering", activeOrgId);
    bumpStore();
  };

  const seekToSeconds = (seconds: number) => {
    const frame = Math.round(seconds * fps);
    const clamped = Math.max(0, Math.min(durationFrames - 1, frame));
    setCurrentFrame(clamped);
    syncAudioToFrame(clamped);
  };

  const playheadPct = durationSec > 0 ? Math.min(100, Math.max(0, (currentTimeSec / durationSec) * 100)) : 0;

  const handleFrameChange = (frame: number) => {
    if (audioSrc) {
      seekToSeconds(frame / fps);
      return;
    }
    setCurrentFrame(frame);
  };

  const seekToRatio = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    seekToSeconds(clamped * durationSec);
  };

  const onTimelineClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) {
      return;
    }
    seekToRatio((event.clientX - rect.left) / rect.width);
  };

  const trackColor = (kind: string | null) => {
    switch (kind) {
      case "music":
        return "rgba(56, 189, 248, 0.7)";
      case "sfx":
        return "rgba(251, 191, 36, 0.75)";
      case "narration":
        return "rgba(129, 140, 248, 0.75)";
      default:
        return "rgba(148, 163, 184, 0.6)";
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <div className="brand">Babulus Studio</div>
          <div className="header-meta">
            {activeOrg?.name ?? "No org"} / {activeProject?.name ?? "No project"} /{" "}
            {activeVideo?.title ?? "No video"}
            {activeVideo ? ` · ${activeVideo.status}` : ""}
            {activeSession ? ` · ${activeSession.role}` : ""}
            {activeId ? ` · preview ${activeId}` : " · preview demo"}
          </div>
        </div>
        <div className="header-actions">
          <div className="workspace-controls">
            <label className="workspace-field">
              <span className="workspace-label">Org</span>
              <select className="workspace-select" value={activeOrgId} onChange={handleOrgChange}>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button--ghost button--compact"
              type="button"
              onClick={handleCreateOrg}
              disabled={!activeSession || !sessionCan(activeSession, "org:manage")}
            >
              New Org
            </button>
            <label className="workspace-field">
              <span className="workspace-label">Role</span>
              <select
                className="workspace-select"
                value={activeSession?.role ?? "viewer"}
                onChange={handleRoleChange}
                disabled={!activeSession}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <label className="workspace-field">
              <span className="workspace-label">Project</span>
              <select
                className="workspace-select"
                value={activeProjectId ?? ""}
                onChange={handleProjectChange}
                disabled={!projects.length}
              >
                {projects.length ? null : <option value="">None</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="workspace-field">
              <span className="workspace-label">Video</span>
              <select
                className="workspace-select"
                value={activeVideoId ?? ""}
                onChange={handleVideoChange}
                disabled={!videos.length}
              >
                {videos.length ? null : <option value="">None</option>}
                {videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="button button--ghost"
            type="button"
            onClick={handleGenerateClick}
            disabled={!activeVideo || !canRenderVideo}
          >
            Generate
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={handleRenderClick}
            disabled={!activeVideo || !canRenderVideo}
          >
            Render
          </button>
          <button className="button button--primary" type="button">
            Share Preview
          </button>
        </div>
      </header>

      <section className="app-body">
        <aside className="panel panel--storyboard">
          <div className="panel-title">Storyboard</div>
            <div className="storyboard-meta">
              <div className="storyboard-actions">
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleCreateProject}
                disabled={!canCreateProject}
              >
                New Project
              </button>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleCreateVideo}
                disabled={!activeProject || !canCreateVideo}
              >
                New Video
              </button>
            </div>
            <div className="storyboard-controls">
              <span className="storyboard-label">Active Version</span>
              <select
                className="storyboard-select"
                value={activeStoryboardVersionId ?? ""}
                onChange={handleStoryboardChange}
                disabled={!activeVideo || orderedStoryboardVersions.length === 0}
              >
                {orderedStoryboardVersions.length === 0 ? <option value="">None</option> : null}
                {orderedStoryboardVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.id}
                  </option>
                ))}
              </select>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleNewVersion}
                disabled={!activeVideo || !canEditStoryboard}
              >
                New Version
              </button>
            </div>
            <div className="storyboard-info">
              {activeStoryboardVersion
                ? `Updated ${formatTimestamp(activeStoryboardVersion.createdAt)} · ${activeStoryboardVersion.createdBy ?? "unknown"}`
                : "No storyboard version selected"}
            </div>
            <div className="storyboard-source">
              {activeStoryboardVersion?.sourceText
                ? activeStoryboardVersion.sourceText.split("\n").slice(0, 3).join("\n")
                : "No storyboard source available"}
            </div>
          </div>
          <ul className="story-list">
            {scenes.map((scene) => (
              <li key={scene.id} className={`story-item ${activeScene?.id === scene.id ? "story-item--active" : ""}`}>
                <button className="story-title story-link" type="button" onClick={() => seekToSeconds(scene.startSec ?? 0)}>
                  <span>
                    {scene.title}
                    {renderMarkupTags(scene.markup)}
                  </span>
                  <span className="story-time">{formatTime(scene.startSec ?? 0)}</span>
                </button>
                <ul className="cue-list">
                  {(scene.cues ?? []).map((cue) => (
                    <li key={cue.id}>
                      <button
                        className={`cue-item ${activeCue?.id === cue.id ? "cue-item--active" : ""}`}
                        type="button"
                        onClick={() => seekToSeconds(cue.startSec ?? 0)}
                      >
                        <span className="cue-label">
                          {cue.label ?? cue.text ?? cue.id}
                          {renderMarkupTags(cue.markup)}
                        </span>
                        <span className="cue-time">{formatTime(cue.startSec ?? 0)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="asset-panel">
            <div className="asset-header">
              <div>
                <div className="asset-title">Assets</div>
                <div className="asset-meta">
                  {assets.length} items · {assetScopeLabel}
                </div>
              </div>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleUploadAsset}
                disabled={!canUploadAsset}
              >
                Upload
              </button>
            </div>
            {canViewAssets ? (
              assets.length ? (
                <ul className="asset-list">
                  {assets.slice(0, 6).map((asset) => (
                    <li key={asset.id} className="asset-item">
                      <div>
                        <div className="asset-name">{resolveAssetFileName(asset)}</div>
                        <div className="asset-sub">
                          {asset.kind.toUpperCase()} · {asset.projectId ? "Project" : "Shared"}
                        </div>
                      </div>
                      <span className="asset-hash">{asset.sha256 ?? "no-hash"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="asset-empty">No assets yet.</div>
              )
            ) : (
              <div className="asset-empty">No asset access.</div>
            )}
          </div>
          <div className="member-panel">
            <div className="asset-header">
              <div>
                <div className="asset-title">Org Members</div>
                <div className="asset-meta">{orgMembers.length} members</div>
              </div>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleInviteMember}
                disabled={!activeSession || !sessionCan(activeSession, "org:invite")}
              >
                Invite
              </button>
            </div>
            {orgMembers.length ? (
              <ul className="asset-list">
                {orgMembers.map((member) => (
                  <li key={`${member.orgId}-${member.userId}`} className="asset-item">
                    <div>
                      <div className="asset-name">{resolveMemberLabel(member, orgUsers)}</div>
                      <div className="asset-sub">{member.userId}</div>
                    </div>
                    <span className="asset-hash">{member.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="asset-empty">No members yet.</div>
            )}
          </div>
          <div className="panel-footer">
            {scenes.length} scenes · {cueCount} cues · {formatTime(durationSec)} · {fps} fps
            {lastSync ? ` · synced ${lastSync}` : " · using demo data"}
            {activeVideo
              ? ` · ${storyboardVersions.length} versions · ${generationRuns.length} runs · ${renderRuns.length} renders`
              : ""}
          </div>
        </aside>

        <section className="panel panel--chat">
          <div className="panel-title">Agent Chat</div>
          <div className="chat-controls">
            <label className="chat-label">Conversation</label>
            <select
              className="chat-select"
              value={activeConversation?.id ?? ""}
              onChange={handleConversationChange}
              disabled={orderedConversations.length === 0}
            >
              {orderedConversations.length === 0 ? <option value="">None</option> : null}
              {orderedConversations.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  {conversation.id} · {formatTimestamp(conversation.createdAt)}
                </option>
              ))}
            </select>
            <button className="button button--ghost button--compact" type="button" onClick={handleNewConversation}>
              New
            </button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-bubble chat-bubble--${msg.role}`}>
                <div className="chat-role">{msg.role === "assistant" ? "Agent" : "You"}</div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              placeholder="Describe the change you want..."
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <button className="button button--primary" type="button" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </section>

        <aside className="panel panel--preview">
          <div className="panel-title">Preview</div>
          <div className="preview-controls">
            <span className="preview-label">Preview Source</span>
            <select
              className="preview-select"
              value={activeId ?? ""}
              onChange={handlePreviewChange}
              disabled={!previewIndex.length}
            >
              {previewIndex.length === 0 ? <option value="">Demo</option> : null}
              {previewIndex.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title ?? entry.id}
                </option>
              ))}
            </select>
          </div>
          <Player
            component={StoryboardRenderer}
            config={{
              fps,
              width,
              height,
              durationFrames,
            }}
            inputProps={{ script: previewScript }}
            frame={currentFrame}
            onFrameChange={handleFrameChange}
            playing={playing}
            onPlayingChange={setPlaying}
            clock={audioSrc ? "external" : "internal"}
            surfaceStyle={{ width: "100%", height: "auto", aspectRatio: "16 / 9" }}
          />
          <audio
            ref={audioRef}
            src={audioSrc ?? undefined}
            preload="auto"
            onEnded={() => setPlaying(false)}
            style={{ display: "none" }}
          />
          <div className="artifact-grid">
            <div className="artifact-card">
              <div className="artifact-title">Artifacts</div>
              <div className="artifact-meta">
                {previewEntry?.script ?? `${activeId ?? "preview"}.script.json`} ·{" "}
                {previewEntry?.timeline ?? `${activeId ?? "preview"}.timeline.json`}
              </div>
            </div>
            <div className="artifact-card">
              <div className="artifact-title">Audio</div>
              <div className="artifact-meta">
                {previewEntry?.audio ?? "voiceover.wav"} · {timelineSummary.trackCount} tracks · {timelineSummary.clipCount} clips
              </div>
            </div>
          </div>
          <div className="runs-panel">
            <div className="panel-title">Runs</div>
            <div className="run-section">
              <div className="run-section-title">Generation</div>
              {generationRuns.length ? (
                <ul className="run-list">
                  {generationRuns.map((run) => (
                    <li key={run.id} className="run-item">
                      <div className="run-meta">
                        <span className="run-id">{run.id}</span>
                        <span className={`run-status run-status--${run.status}`}>{run.status}</span>
                      </div>
                      <div className="run-meta">{formatTimestamp(run.createdAt)}</div>
                      <div className="run-artifacts">
                        <div>Script: {run.scriptArtifactKey ?? "—"}</div>
                        <div>Timeline: {run.timelineArtifactKey ?? "—"}</div>
                        <div>Audio: {run.audioArtifactKey ?? "—"}</div>
                      </div>
                      <div className="run-actions">
                        <button
                          className="button button--ghost button--compact"
                          type="button"
                          onClick={() => handleGenerationStatus(run.id, "succeeded")}
                          disabled={!canRenderVideo}
                        >
                          Mark Succeeded
                        </button>
                        <button
                          className="button button--ghost button--compact"
                          type="button"
                          onClick={() => handleGenerationStatus(run.id, "failed")}
                          disabled={!canRenderVideo}
                        >
                          Mark Failed
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="run-empty">No generation runs yet</div>
              )}
            </div>
            <div className="run-section">
              <div className="run-section-title">Render</div>
              {renderRuns.length ? (
                <ul className="run-list">
                  {renderRuns.map((run) => (
                    <li key={run.id} className="run-item">
                      <div className="run-meta">
                        <span className="run-id">{run.id}</span>
                        <span className={`run-status run-status--${run.status}`}>{run.status}</span>
                      </div>
                      <div className="run-meta">{formatTimestamp(run.createdAt)}</div>
                      <div className="run-artifacts">
                        <div>MP4: {run.mp4ArtifactKey ?? "—"}</div>
                        <div>Stills: {run.stillsArtifactPrefix ?? "—"}</div>
                      </div>
                      <div className="run-actions">
                        <button
                          className="button button--ghost button--compact"
                          type="button"
                          onClick={() => handleRenderStatus(run.id, "succeeded")}
                          disabled={!canRenderVideo}
                        >
                          Mark Succeeded
                        </button>
                        <button
                          className="button button--ghost button--compact"
                          type="button"
                          onClick={() => handleRenderStatus(run.id, "failed")}
                          disabled={!canRenderVideo}
                        >
                          Mark Failed
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="run-empty">No render runs yet</div>
              )}
            </div>
          </div>
          <div className="usage-panel">
            <div className="panel-title">Usage</div>
            <div className="usage-meta">
              {activeBilling
                ? `${activeBilling.billingMode.toUpperCase()} · ${activeBilling.usageVisibilityMode}`
                : "No billing profile"}
            </div>
            {activeBilling ? (
              <label className="usage-controls">
                <span className="usage-label">Visibility</span>
                <select
                  className="usage-select"
                  value={activeBilling.usageVisibilityMode}
                  onChange={handleBillingVisibility}
                  disabled={!canManageBilling}
                >
                  <option value="redacted">Redacted</option>
                  <option value="full">Full</option>
                </select>
              </label>
            ) : null}
            {usageVisibility === "full" ? (
              <div className="usage-grid">
                <div className="usage-card">
                  <div className="usage-label">TTS Units</div>
                  <div className="usage-value">
                    {usageSummary.tokens > 0
                      ? `${formatCount(usageSummary.tokens)} tok`
                      : `${formatCount(usageSummary.chars)} chars`}
                  </div>
                </div>
                <div className="usage-card">
                  <div className="usage-label">Render Minutes</div>
                  <div className="usage-value">{(usageSummary.seconds / 60).toFixed(1)}</div>
                </div>
                <div className="usage-card">
                  <div className="usage-label">Storage</div>
                  <div className="usage-value">
                    {usageSummary.bytes > 0 ? `${(usageSummary.bytes / (1024 * 1024)).toFixed(1)} MB` : "0 MB"}
                  </div>
                </div>
                <div className="usage-card">
                  <div className="usage-label">Est. Cost</div>
                  <div className="usage-value">${usageSummary.estimatedCost.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <div className="usage-grid">
                <div className="usage-card">
                  <div className="usage-label">Credits</div>
                  <div className="usage-value">42 / 100</div>
                </div>
                <div className="usage-card">
                  <div className="usage-label">Plan Window</div>
                  <div className="usage-value">Month-to-date</div>
                </div>
              </div>
            )}
          </div>
          <div className="approvals-panel">
            <div className="panel-title">Approvals</div>
            <div className="approval-header">
              <div className="approval-meta">{approvals.length} pending items</div>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleRequestApproval}
                disabled={!activeVideo}
              >
                Request
              </button>
            </div>
            {approvals.length ? (
              <ul className="approval-list">
                {approvals.map((approval) => (
                  <li key={approval.id} className="approval-item">
                    <div>
                      <div className="approval-kind">{approval.kind}</div>
                      <div className="approval-sub">{approval.status}</div>
                    </div>
                    <div className="approval-actions">
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleApprovalStatus(approval.id, "approved")}
                        disabled={approval.status === "approved"}
                      >
                        Approve
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleApprovalStatus(approval.id, "rejected")}
                        disabled={approval.status === "rejected"}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="approval-empty">No approvals yet.</div>
            )}
          </div>
          <div className="agents-panel">
            <div className="panel-title">Render Agents</div>
            <div className="approval-header">
              <div className="approval-meta">{renderAgents.length} registered</div>
              <button className="button button--ghost button--compact" type="button" onClick={handleRegisterAgent}>
                Register
              </button>
            </div>
            {renderAgents.length ? (
              <ul className="approval-list">
                {renderAgents.map((agent) => (
                  <li key={agent.id} className="approval-item">
                    <div>
                      <div className="approval-kind">{agent.label ?? agent.id}</div>
                      <div className="approval-sub">{agent.status}</div>
                    </div>
                    <div className="approval-actions">
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleAgentStatus(agent.id, "online")}
                        disabled={agent.status === "online"}
                      >
                        Online
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleAgentStatus(agent.id, "busy")}
                        disabled={agent.status === "busy"}
                      >
                        Busy
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="approval-empty">No agents yet.</div>
            )}
          </div>
          <div className="jobs-panel">
            <div className="panel-title">Jobs</div>
            <div className="job-actions">
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={() => handleQueueJob("generate")}
                disabled={!activeVideo || !canRenderVideo}
              >
                Queue Generate
              </button>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={() => handleQueueJob("render")}
                disabled={!activeVideo || !canRenderVideo}
              >
                Queue Render
              </button>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleClaimNextJob}
                disabled={!canRenderVideo}
              >
                Claim Next
              </button>
              <button
                className="button button--ghost button--compact"
                type="button"
                onClick={handleExecuteNextJob}
                disabled={!canRenderVideo}
              >
                Execute Next
              </button>
              <button
                className={`button button--compact ${autoRun ? "button--primary" : "button--ghost"}`}
                type="button"
                onClick={() => setAutoRun((prev) => !prev)}
                disabled={!canRenderVideo}
              >
                Auto-run {autoRun ? "On" : "Off"}
              </button>
            </div>
            {executionNotice ? <div className="job-note">{executionNotice}</div> : null}
            {jobs.length ? (
              <ul className="job-list">
                {jobs.map((job) => {
                  const summary = jobEventSummaries.get(job.id);
                  const statusEvent = summary?.status ?? summary?.latest ?? null;
                  const progressValue = summary?.progress?.progress ?? statusEvent?.progress ?? null;
                  const recentEvents = (jobEventsByJob.get(job.id) ?? []).slice(-3);
                  return (
                    <li key={job.id} className="job-item">
                      <div className="job-meta">
                        <span className="job-kind">{job.kind}</span>
                        <span className={`job-status job-status--${job.status}`}>{job.status}</span>
                        <span className="job-agent">{job.claimedByAgentId ?? "unclaimed"}</span>
                      </div>
                      <div className="job-meta">{formatTimestamp(job.updatedAt)}</div>
                      {summary ? (
                        <div className="job-event">
                          <span className="job-event-type">{statusEvent?.type ?? "event"}</span>
                          <span className="job-event-message">{statusEvent?.message ?? "update"}</span>
                          {progressValue != null ? (
                            <span className="job-event-progress">
                              {Math.round(progressValue * 100)}%
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {summary?.log?.message ? (
                        <div className="job-event job-event--log">
                          <span className="job-event-type">log</span>
                          <span className="job-event-message">{summary.log.message}</span>
                        </div>
                      ) : null}
                      {recentEvents.length ? (
                        <div className="job-event-list">
                          {recentEvents.map((event) => (
                            <div key={event.id} className="job-event job-event--history">
                              <span className="job-event-type">{event.type}</span>
                              <span className="job-event-message">{event.message ?? "update"}</span>
                              {event.progress != null ? (
                                <span className="job-event-progress">
                                  {Math.round((event.progress ?? 0) * 100)}%
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="job-actions">
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleClaimJob(job.id)}
                        disabled={!canRenderVideo || job.status !== "queued"}
                      >
                        Claim
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleExecuteJob(job.id)}
                        disabled={!canRenderVideo || job.status === "succeeded" || job.status === "failed"}
                      >
                        Execute
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleJobStatus(job.id, "running")}
                        disabled={!canRenderVideo}
                      >
                        Running
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleJobStatus(job.id, "succeeded")}
                        disabled={!canRenderVideo}
                      >
                        Succeeded
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        type="button"
                        onClick={() => handleJobStatus(job.id, "failed")}
                        disabled={!canRenderVideo}
                      >
                        Failed
                      </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="job-empty">No jobs queued</div>
            )}
          </div>
          <div className="audio-summary">
            <div className="panel-title">Active Audio</div>
            {activeAudioClips.length ? (
              <ul className="audio-list">
                {activeAudioClips.map((entry, index) => (
                  <li
                    key={`${entry.trackId ?? entry.trackKind ?? "track"}-${entry.clip.id ?? entry.clip.kind ?? index}`}
                    className="audio-item"
                  >
                    <span className="audio-badge">{entry.trackKind ?? entry.trackId ?? "track"}</span>
                    <span className="audio-label">{entry.clip.id ?? entry.clip.kind ?? "clip"}</span>
                    <span className="audio-time">
                      {formatTime(entry.range.startSec)}–{formatTime(entry.range.endSec)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="audio-empty">No active clips</div>
            )}
          </div>
          <div className="timeline-panel">
            <div className="panel-title">Timeline</div>
            <div className="timeline-rows">
              {timelineLayout.length ? (
                timelineLayout.map((track) => {
                  const trackKey = track.id ?? track.kind ?? "track";
                  return (
                    <div key={trackKey} className="timeline-row">
                      <div className="timeline-label">{track.kind ?? track.id ?? "track"}</div>
                      <div className="timeline-track" onClick={onTimelineClick} role="presentation">
                        <div className="timeline-playhead" style={{ left: `${playheadPct}%` }} />
                        {track.clips.map((clip, index) => {
                          const clipKey = `${trackKey}:${clip.id ?? clip.kind ?? index}`;
                          const isActive = activeClipKeys.has(clipKey);
                          return (
                            <button
                              key={clipKey}
                              type="button"
                              className={`timeline-clip ${isActive ? "timeline-clip--active" : ""}`}
                              style={{
                                left: `${clip.leftPct}%`,
                                width: `${clip.widthPct}%`,
                                background: trackColor(track.kind ?? null),
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                seekToSeconds(clip.range.startSec);
                              }}
                              title={`${clip.id ?? clip.kind ?? "clip"} ${formatTime(clip.range.startSec)}–${formatTime(clip.range.endSec)}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="audio-empty">No timeline clips</div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
