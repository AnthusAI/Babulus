import { uploadData, downloadData, remove, list } from 'aws-amplify/storage';

// Get CloudFront domain from Amplify outputs
// This will be populated after deployment
const ASSETS_DOMAIN = process.env.NEXT_PUBLIC_ASSETS_DOMAIN;

export function getProjectFileUrl(
  orgId: string,
  projectId: string,
  relativePath: string
): string {
  if (ASSETS_DOMAIN) {
    // Use CloudFront URL (permanent, no expiration)
    return `https://${ASSETS_DOMAIN}/org/${orgId}/projects/${projectId}/${relativePath}`;
  } else {
    // Fallback to direct S3 path (for local development)
    // In production, this should always use CloudFront
    return `org/${orgId}/projects/${projectId}/${relativePath}`;
  }
}

export async function uploadProjectFile(
  orgId: string,
  projectId: string,
  relativePath: string,
  data: File | string | Blob
): Promise<string> {
  const storageKey = `org/${orgId}/projects/${projectId}/${relativePath}`;
  await uploadData({ path: storageKey, data }).result;
  return storageKey;
}

export async function readProjectFile(
  orgId: string,
  projectId: string,
  relativePath: string
): Promise<string> {
  const storageKey = `org/${orgId}/projects/${projectId}/${relativePath}`;
  const { body } = await downloadData({ path: storageKey });

  // Convert body to text
  const text = await body.text();
  return text;
}

export async function deleteProjectFile(
  orgId: string,
  projectId: string,
  relativePath: string
): Promise<void> {
  const storageKey = `org/${orgId}/projects/${projectId}/${relativePath}`;
  await remove({ path: storageKey });
}

export async function listProjectFilesInStorage(
  orgId: string,
  projectId: string
): Promise<Array<{ path: string; lastModified?: Date; size?: number }>> {
  const prefix = `org/${orgId}/projects/${projectId}/`;
  const result = await list({
    path: prefix,
    options: { listAll: true }
  });

  return result.items.map(item => ({
    path: item.path,
    lastModified: item.lastModified,
    size: item.size
  }));
}
