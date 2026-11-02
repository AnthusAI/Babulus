"use client";

/**
 * Client-side data fetching using Amplify GraphQL client
 * This provides fast, client-side queries without server round-trips
 */

import { generateClient } from "aws-amplify/data";
import type {
  Org,
  Project,
  Video,
  GenerationRun,
  Job,
  JobStatus,
} from "@babulus/shared";
import { configureAmplify } from "./amplify-config";

// Ensure Amplify is configured before creating client
configureAmplify();

// Create client-side GraphQL client lazily
// Note: Amplify is configured by the Authenticator component
let _client: ReturnType<typeof generateClient<any>> | null = null;
function getClient() {
  if (!_client) {
    _client = generateClient<any>({
      authMode: "userPool",
    });
  }
  return _client;
}

/**
 * Fetch all orgs for the current user
 */
export async function fetchOrgs(): Promise<Org[]> {
  const { data, errors } = await getClient().models.Org.list({});
  if (errors) {
    console.error("Error fetching orgs:", errors);
    throw new Error("Failed to fetch organizations");
  }
  return (data || []) as any[];
}

/**
 * Fetch a single org by ID
 */
export async function fetchOrg(orgId: string): Promise<Org | null> {
  const { data, errors } = await getClient().models.Org.get({ id: orgId });
  if (errors) {
    console.error("Error fetching org:", errors);
    return null;
  }
  return data as any;
}

/**
 * Fetch all projects for an org
 */
export async function fetchProjects(orgId: string): Promise<Project[]> {
  const { data, errors } = await getClient().models.Project.list({
    filter: { orgId: { eq: orgId } },
  });
  if (errors) {
    console.error("Error fetching projects:", errors);
    throw new Error("Failed to fetch projects");
  }
  return (data || []) as any[];
}

/**
 * Fetch a single project by ID
 */
export async function fetchProject(projectId: string): Promise<Project | null> {
  const { data, errors } = await getClient().models.Project.get({ id: projectId });
  if (errors) {
    console.error("Error fetching project:", errors);
    return null;
  }
  return data as any;
}

/**
 * Fetch all videos for a project
 */
export async function fetchVideos(orgId: string, projectId?: string): Promise<Video[]> {
  const filter: any = { orgId: { eq: orgId } };
  if (projectId) {
    filter.projectId = { eq: projectId };
  }

  const { data, errors } = await getClient().models.Video.list({ filter });
  if (errors) {
    console.error("Error fetching videos:", errors);
    throw new Error("Failed to fetch videos");
  }
  return (data || []) as any[];
}

/**
 * Fetch generation runs for a video
 */
export async function fetchGenerationRuns(orgId: string, videoId?: string): Promise<GenerationRun[]> {
  const filter: any = { orgId: { eq: orgId } };
  if (videoId) {
    filter.videoId = { eq: videoId };
  }

  const { data, errors } = await getClient().models.GenerationRun.list({ filter });
  if (errors) {
    console.error("Error fetching generation runs:", errors);
    throw new Error("Failed to fetch generation runs");
  }
  return (data || []) as any[];
}

/**
 * Fetch a single video by ID
 */
export async function fetchVideo(videoId: string): Promise<Video | null> {
  const { data, errors } = await getClient().models.Video.get({ id: videoId });
  if (errors) {
    console.error("Error fetching video:", errors);
    return null;
  }
  return data as any;
}

/**
 * Fetch jobs for an org
 */
export async function fetchJobs(orgId: string, status?: JobStatus): Promise<Job[]> {
  const filter: any = { orgId: { eq: orgId } };
  if (status) {
    filter.status = { eq: status };
  }

  const { data, errors } = await getClient().models.Job.list({ filter });
  if (errors) {
    console.error("Error fetching jobs:", errors);
    throw new Error("Failed to fetch jobs");
  }
  return (data || []) as any[];
}
