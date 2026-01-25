'use server';

import { getCurrentUser } from '@/lib/amplify-server-utils';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import * as storage from '@/lib/project-storage';

const client = generateClient<Schema>();

async function verifyOrgAccess(userId: string, orgId: string): Promise<void> {
  const { data: memberships } = await client.models.OrgMember.list({
    filter: { userId: { eq: userId }, orgId: { eq: orgId } }
  });
  if (!memberships || memberships.length === 0) {
    throw new Error('Unauthorized: Not a member of this organization');
  }
}

export async function listProjectFilesAction(projectId: string) {
  const user = await getCurrentUser();

  // Get project to find orgId
  const { data: project } = await client.models.Project.get({ id: projectId });
  if (!project) throw new Error('Project not found');

  // Verify access
  await verifyOrgAccess(user.userId, project.orgId);

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
  const user = await getCurrentUser();

  const { data: project } = await client.models.Project.get({ id: projectId });
  if (!project) throw new Error('Project not found');

  await verifyOrgAccess(user.userId, project.orgId);

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
  const user = await getCurrentUser();

  const { data: project } = await client.models.Project.get({ id: projectId });
  if (!project) throw new Error('Project not found');

  await verifyOrgAccess(user.userId, project.orgId);

  // Read from S3
  const content = await storage.readProjectFile(project.orgId, projectId, relativePath);
  return content;
}

export async function deleteProjectFileAction(projectId: string, relativePath: string) {
  const user = await getCurrentUser();

  const { data: project } = await client.models.Project.get({ id: projectId });
  if (!project) throw new Error('Project not found');

  await verifyOrgAccess(user.userId, project.orgId);

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
