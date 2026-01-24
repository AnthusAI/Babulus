/**
 * Storage client for S3 operations via Amplify Storage
 *
 * Provides org-scoped storage operations for assets (images, audio, video, etc.)
 * All paths follow the pattern: org/{orgId}/...
 *
 * The storage resource is configured in amplify/storage/resource.ts with:
 * - Bucket: studioAssets
 * - Access pattern: org/* (authenticated users)
 * - IAM policies enforce org-scoped access
 */

import { uploadData, getUrl, remove, list, copy } from "aws-amplify/storage";
import type { UploadDataInput } from "aws-amplify/storage";

/**
 * Generate storage key for an asset
 * Pattern: org/{orgId}/assets/{sha256}/{filename}
 */
export function buildAssetStorageKey(orgId: string, sha256: string, filename: string): string {
  return `org/${orgId}/assets/${sha256}/${filename}`;
}

/**
 * Generate storage key for an artifact (script, timeline, audio, logs)
 * Pattern: org/{orgId}/artifacts/{runId}/{artifactType}
 */
export function buildArtifactStorageKey(
  orgId: string,
  runId: string,
  artifactType: "script" | "timeline" | "audio" | "logs" | "mp4" | "stills",
): string {
  const extensions: Record<typeof artifactType, string> = {
    script: ".json",
    timeline: ".json",
    audio: ".mp3",
    logs: ".txt",
    mp4: ".mp4",
    stills: "", // directory prefix, not a file
  };

  if (artifactType === "stills") {
    return `org/${orgId}/artifacts/${runId}/stills/`;
  }

  return `org/${orgId}/artifacts/${runId}/${artifactType}${extensions[artifactType]}`;
}

/**
 * Upload a file to S3 storage
 *
 * @param storageKey - Full storage path (e.g., org/org-123/assets/abc.../image.png)
 * @param file - File or Blob to upload
 * @param contentType - MIME type (e.g., image/png, audio/mp3)
 * @param metadata - Optional metadata to attach to the file
 * @returns Upload result with key and metadata
 */
export async function uploadFile(
  storageKey: string,
  file: File | Blob,
  contentType?: string,
  metadata?: Record<string, string>,
) {
  const options: UploadDataInput = {
    path: storageKey,
    data: file,
    options: {
      contentType,
      metadata,
    },
  };

  const result = await uploadData(options).result;
  return result;
}

/**
 * Upload JSON data to S3 storage
 *
 * @param storageKey - Full storage path
 * @param data - JavaScript object to serialize as JSON
 * @returns Upload result
 */
export async function uploadJSON(storageKey: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  return uploadFile(storageKey, blob, "application/json");
}

/**
 * Upload text data to S3 storage
 *
 * @param storageKey - Full storage path
 * @param text - Text content
 * @param contentType - MIME type (defaults to text/plain)
 * @returns Upload result
 */
export async function uploadText(storageKey: string, text: string, contentType = "text/plain") {
  const blob = new Blob([text], { type: contentType });
  return uploadFile(storageKey, blob, contentType);
}

/**
 * Get a signed URL for downloading a file
 *
 * @param storageKey - Full storage path
 * @param expiresIn - URL expiration time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL for downloading
 */
export async function getDownloadUrl(storageKey: string, expiresIn = 900) {
  const result = await getUrl({
    path: storageKey,
    options: {
      expiresIn,
      validateObjectExistence: true,
    },
  });
  return result.url;
}

/**
 * Delete a file from S3 storage
 *
 * @param storageKey - Full storage path
 * @returns Delete result
 */
export async function deleteFile(storageKey: string) {
  return remove({ path: storageKey });
}

/**
 * List files in a directory
 *
 * @param prefix - Directory prefix (e.g., org/org-123/assets/)
 * @param options - List options (pageSize, nextToken)
 * @returns List of files with keys and metadata
 */
export async function listFiles(
  prefix: string,
  options?: {
    pageSize?: number;
    nextToken?: string;
  },
) {
  const result = await list({
    path: prefix,
    options: {
      listAll: false,
      pageSize: options?.pageSize ?? 100,
      nextToken: options?.nextToken,
    },
  });

  return {
    items: result.items.map((item) => ({
      key: item.path,
      size: item.size,
      lastModified: item.lastModified,
      eTag: item.eTag,
    })),
    nextToken: result.nextToken,
    hasMore: !!result.nextToken,
  };
}

/**
 * Copy a file within S3 storage
 *
 * @param sourceKey - Source storage path
 * @param destinationKey - Destination storage path
 * @returns Copy result
 */
export async function copyFile(sourceKey: string, destinationKey: string) {
  return copy({
    source: {
      path: sourceKey,
    },
    destination: {
      path: destinationKey,
    },
  });
}

/**
 * Download a file as a Blob
 *
 * @param storageKey - Full storage path
 * @returns Blob with file contents
 */
export async function downloadFile(storageKey: string): Promise<Blob> {
  const url = await getDownloadUrl(storageKey);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Download JSON data from S3 storage
 *
 * @param storageKey - Full storage path
 * @returns Parsed JSON object
 */
export async function downloadJSON<T = unknown>(storageKey: string): Promise<T> {
  const blob = await downloadFile(storageKey);
  const text = await blob.text();
  return JSON.parse(text) as T;
}

/**
 * Download text data from S3 storage
 *
 * @param storageKey - Full storage path
 * @returns Text content
 */
export async function downloadText(storageKey: string): Promise<string> {
  const blob = await downloadFile(storageKey);
  return blob.text();
}

/**
 * Check if a file exists in S3 storage
 *
 * @param storageKey - Full storage path
 * @returns True if file exists, false otherwise
 */
export async function fileExists(storageKey: string): Promise<boolean> {
  try {
    await getUrl({
      path: storageKey,
      options: {
        validateObjectExistence: true,
        expiresIn: 60,
      },
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata without downloading
 *
 * @param storageKey - Full storage path
 * @returns File metadata (size, lastModified, etc.)
 */
export async function getFileMetadata(storageKey: string) {
  const result = await list({
    path: storageKey,
    options: {
      listAll: false,
      pageSize: 1,
    },
  });

  const item = result.items.find((i) => i.path === storageKey);
  if (!item) {
    throw new Error(`File not found: ${storageKey}`);
  }

  return {
    key: item.path,
    size: item.size,
    lastModified: item.lastModified,
    eTag: item.eTag,
  };
}

/**
 * Upload an asset and return storage metadata
 *
 * @param orgId - Organization ID
 * @param projectId - Project ID (optional)
 * @param file - File to upload
 * @param kind - Asset kind (image, audio, video, etc.)
 * @param sha256 - SHA-256 hash of file content
 * @returns Storage metadata for creating Asset record
 */
export async function uploadAsset(
  orgId: string,
  projectId: string | null,
  file: File,
  kind: string,
  sha256: string,
): Promise<{
  storageKey: string;
  metadata: {
    filename: string;
    size: number;
    contentType: string;
  };
}> {
  const storageKey = buildAssetStorageKey(orgId, sha256, file.name);

  await uploadFile(storageKey, file, file.type, {
    orgId,
    projectId: projectId ?? "",
    kind,
    sha256,
    filename: file.name,
  });

  return {
    storageKey,
    metadata: {
      filename: file.name,
      size: file.size,
      contentType: file.type,
    },
  };
}
