'use server';

import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify-server';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
// @ts-ignore - Schema type is generated after backend deployment
import type { Schema } from '../amplify/data/resource.js';
import * as storage from '@/lib/project-storage';

// Load outputs dynamically to handle missing file gracefully
let outputs: any = null;

function getOutputs() {
  if (!outputs) {
    try {
      // @ts-ignore
      outputs = require('../../amplify_outputs.json');
    } catch (e) {
      throw new Error('amplify_outputs.json not found. Run: npx ampx generate outputs');
    }
  }
  return outputs;
}

const getClient = () => {
  return generateServerClientUsingCookies<Schema>({
    config: getOutputs(),
    cookies,
  });
};

async function getAuthenticatedUserId(): Promise<string> {
  try {
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });
    return currentUser.userId;
  } catch (error) {
    throw new Error('User not authenticated');
  }
}

async function verifyOrgAccess(userId: string, orgId: string): Promise<void> {
  const client = getClient();
  const { data: memberships } = await client.models.OrgMember.list({
    filter: { userId: { eq: userId }, orgId: { eq: orgId } }
  });
  if (!memberships || memberships.length === 0) {
    throw new Error('Unauthorized: Not a member of this organization');
  }
}

export async function listProjectFilesAction(projectId: string) {
  const userId = await getAuthenticatedUserId();
  const client = getClient();

  // Get project to find orgId
  const { data: projects } = await client.models.Project.list({
    filter: { id: { eq: projectId } }
  });
  const project = projects?.[0];
  if (!project) throw new Error('Project not found');

  // Verify access
  await verifyOrgAccess(userId, project.orgId);

  // List files from database
  const { data: files } = await client.models.ProjectFile.list({
    filter: { projectId: { eq: projectId } }
  });

  // Generate URLs for each file
  const filesWithUrls = (files || []).map((file) => ({
    ...file,
    url: storage.getProjectFileUrl(project.orgId, projectId, file.relativePath)
  }));

  return filesWithUrls;
}

export async function uploadProjectFileAction(
  projectId: string,
  relativePath: string,
  content: string | File | Blob,
  fileType: 'video' | 'utility' | 'asset',
  contentType?: string
) {
  const userId = await getAuthenticatedUserId();
  const client = getClient();

  const { data: projects } = await client.models.Project.list({
    filter: { id: { eq: projectId } }
  });
  const project = projects?.[0];
  if (!project) throw new Error('Project not found');

  await verifyOrgAccess(userId, project.orgId);

  // Upload to S3
  const storageKey = await storage.uploadProjectFile(
    project.orgId,
    projectId,
    relativePath,
    content
  );

  // Calculate size
  let sizeBytes = 0;
  if (typeof content === 'string') {
    sizeBytes = new Blob([content]).size;
  } else if (content instanceof Blob) {
    sizeBytes = content.size;
  }

  // Create database record
  const { data: file } = await client.models.ProjectFile.create({
    orgId: project.orgId,
    projectId,
    relativePath,
    storageKey,
    fileType,
    contentType,
    sizeBytes,
  });

  return file;
}

export async function readProjectFileAction(projectId: string, relativePath: string) {
  const userId = await getAuthenticatedUserId();
  const client = getClient();

  const { data: projects } = await client.models.Project.list({
    filter: { id: { eq: projectId } }
  });
  const project = projects?.[0];
  if (!project) throw new Error('Project not found');

  await verifyOrgAccess(userId, project.orgId);

  // Read from S3
  const content = await storage.readProjectFile(project.orgId, projectId, relativePath);
  return content;
}

export async function deleteProjectFileAction(projectId: string, relativePath: string) {
  const userId = await getAuthenticatedUserId();
  const client = getClient();

  const { data: projects } = await client.models.Project.list({
    filter: { id: { eq: projectId } }
  });
  const project = projects?.[0];
  if (!project) throw new Error('Project not found');

  await verifyOrgAccess(userId, project.orgId);

  // Delete from S3
  await storage.deleteProjectFile(project.orgId, projectId, relativePath);

  // Delete database record
  const { data: files } = await client.models.ProjectFile.list({
    filter: { projectId: { eq: projectId }, relativePath: { eq: relativePath } }
  });

  if (files && files[0]) {
    await client.models.ProjectFile.delete({ id: files[0].id });
  }
}
