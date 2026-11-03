'use server';

import { cookies } from 'next/headers';
import { requireAccountForRequest } from '@/lib/account-session';
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

/**
 * Load a project the caller may use. The project row comes back through AppSync under the caller's own token
 * (so it is already limited to the caller's Accounts), and its Account is checked again against the verified
 * ID token before any storage is touched.
 */
async function authorizedProject(projectId: string) {
  const client = getClient();
  const { data: projects } = await client.models.Project.list({
    filter: { id: { eq: projectId } }
  });
  const project = projects?.[0];
  if (!project) throw new Error('Project not found');
  await requireAccountForRequest(null, project.orgId);
  return project;
}

export async function listProjectFilesAction(projectId: string) {
  const project = await authorizedProject(projectId);
  const client = getClient();

  // List files from database
  const { data: files } = await client.models.ProjectFile.list({
    filter: { projectId: { eq: projectId } }
  });

  // Generate URLs for each file
  const filesWithUrls = (files || []).map((file) => ({
    ...file,
    // Not a public URL: the browser asks /api/account-media for a short-lived signed one.
    key: storage.getProjectFileKey(project.orgId, projectId, file.relativePath)
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
  const project = await authorizedProject(projectId);
  const client = getClient();

  // Upload to S3
  const storageKey = await storage.uploadProjectFile(
    project.orgId,
    projectId,
    relativePath,
    content,
    contentType
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
  const project = await authorizedProject(projectId);
  const client = getClient();

  // Read from S3
  const content = await storage.readProjectFile(project.orgId, projectId, relativePath);
  return content;
}

export async function deleteProjectFileAction(projectId: string, relativePath: string) {
  const project = await authorizedProject(projectId);
  const client = getClient();

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
