"use client";

/**
 * React hooks for loading and managing org-scoped data
 *
 * These hooks provide a convenient way to fetch and cache control-plane data
 * in client components. They handle loading states, errors, and automatic refetching.
 *
 * Usage:
 *   const { orgs, loading, error, refetch } = useOrgs();
 *   const { projects, loading, error } = useProjects(orgId);
 *   const { videos, loading, error } = useVideos(orgId, projectId);
 */

import { useEffect, useState, useCallback } from "react";
import type {
  Org,
  Project,
  Video,
  StoryboardVersion,
  GenerationRun,
  RenderRun,
  Asset,
  Job,
  JobEvent,
  Conversation,
  Message,
  Approval,
  UsageEvent,
  RenderAgent,
  BillingAccount,
  JobStatus,
} from "@babulus/shared";
import {
  getOrgsForUser,
  getProjectsForOrg,
  getVideosForOrg,
  getStoryboardVersions,
  getGenerationRuns,
  getRenderRuns,
  getAssetsForOrg,
  getJobsForOrg,
  getJobEventsForJob,
  getConversationsForVideo,
  getMessagesForConversation,
  getApprovalsForVideo,
  getUsageEventsForOrg,
  getRenderAgentsForOrg,
  getBillingAccountsForOrg,
} from "../app/actions.js";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Hook to load orgs for the current user
 */
export function useOrgs() {
  const [state, setState] = useState<
    AsyncState<{ userId: string; orgs: Org[]; memberships: import("@babulus/shared").OrgMember[] }>
  >({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getOrgsForUser();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    userId: state.data?.userId ?? null,
    orgs: state.data?.orgs ?? [],
    memberships: state.data?.memberships ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load projects for an org
 */
export function useProjects(orgId: string | null) {
  const [state, setState] = useState<AsyncState<Project[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getProjectsForOrg(orgId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    projects: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load videos for an org (optionally filtered by project)
 */
export function useVideos(orgId: string | null, projectId?: string | null) {
  const [state, setState] = useState<AsyncState<Video[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getVideosForOrg(orgId, projectId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    videos: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load storyboard versions for a video
 */
export function useStoryboardVersions(orgId: string | null, videoId?: string | null) {
  const [state, setState] = useState<AsyncState<StoryboardVersion[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getStoryboardVersions(orgId, videoId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, videoId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    versions: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load the active storyboard version content for a video
 */
export function useActiveStoryboard(orgId: string | null, videoId?: string | null) {
  const { videos } = useVideos(orgId, null);
  const video = videos.find(v => v.id === videoId);
  const { versions, loading, error, refetch } = useStoryboardVersions(orgId, videoId);
  
  const activeVersion = versions.find(v => v.id === video?.activeStoryboardVersionId);
  
  return {
    activeVersion,
    loading,
    error,
    refetch
  };
}

/**
 * Hook to load jobs for an org (optionally filtered by status)
 */
export function useJobs(orgId: string | null, status?: JobStatus | null) {
  const [state, setState] = useState<AsyncState<Job[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getJobsForOrg(orgId, status);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, status]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    jobs: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load job events for a specific job
 */
export function useJobEvents(orgId: string | null, jobId: string | null) {
  const [state, setState] = useState<AsyncState<JobEvent[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId || !jobId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getJobEventsForJob(orgId, jobId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, jobId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    events: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load assets for an org (optionally filtered by project)
 */
export function useAssets(orgId: string | null, projectId?: string | null) {
  const [state, setState] = useState<AsyncState<Asset[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getAssetsForOrg(orgId, projectId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    assets: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load generation runs for a video
 */
export function useGenerationRuns(orgId: string | null, videoId?: string | null) {
  const [state, setState] = useState<AsyncState<GenerationRun[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getGenerationRuns(orgId, videoId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, videoId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    runs: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load render runs for a generation run
 */
export function useRenderRuns(orgId: string | null, generationRunId?: string | null) {
  const [state, setState] = useState<AsyncState<RenderRun[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRenderRuns(orgId, generationRunId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, generationRunId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    runs: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load render runs for a video
 */
export function useVideoRenderRuns(orgId: string | null, videoId?: string | null) {
  const [state, setState] = useState<AsyncState<RenderRun[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId || !videoId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRenderRuns(orgId, null, videoId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, videoId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    runs: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load usage events for an org
 */
export function useUsageEvents(
  orgId: string | null,
  videoId?: string | null,
  runId?: string | null,
) {
  const [state, setState] = useState<AsyncState<UsageEvent[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getUsageEventsForOrg(orgId, videoId, runId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId, videoId, runId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    events: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load render agents for an org
 */
export function useRenderAgents(orgId: string | null) {
  const [state, setState] = useState<AsyncState<RenderAgent[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRenderAgentsForOrg(orgId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    agents: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load billing account for an org
 */
export function useBillingAccount(orgId: string | null) {
  const [state, setState] = useState<AsyncState<BillingAccount | null>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!orgId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const accounts = await getBillingAccountsForOrg(orgId);
      // Return the first account or null
      setState({ data: accounts[0] ?? null, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    account: state.data,
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}

/**
 * Hook to load project files for a project
 */
export function useProjectFiles(projectId: string | null) {
  const [state, setState] = useState<AsyncState<any[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!projectId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { listProjectFilesAction } = await import("../app/actions/project-files");
      const data = await listProjectFilesAction(projectId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    files: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: load,
  };
}
