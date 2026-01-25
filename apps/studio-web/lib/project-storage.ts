import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from './amplify-server';
import { fetchAuthSession } from 'aws-amplify/auth/server';

// Load bucket configuration
let bucketConfig: { bucketName: string; region: string } | null = null;

function getBucketConfig() {
  if (!bucketConfig) {
    try {
      const outputs = require('../amplify_outputs.json');
      bucketConfig = {
        bucketName: outputs.storage.bucket_name,
        region: outputs.storage.aws_region
      };
    } catch (e) {
      throw new Error('amplify_outputs.json not found or missing storage config');
    }
  }
  return bucketConfig;
}

// Get CloudFront domain from Amplify outputs
const ASSETS_DOMAIN = process.env.NEXT_PUBLIC_ASSETS_DOMAIN;

export function getProjectFileUrl(
  orgId: string,
  projectId: string,
  relativePath: string
): string {
  if (ASSETS_DOMAIN) {
    return `https://${ASSETS_DOMAIN}/org/${orgId}/projects/${projectId}/${relativePath}`;
  } else {
    return `org/${orgId}/projects/${projectId}/${relativePath}`;
  }
}

async function getS3Client(contextSpec: any) {
  const config = getBucketConfig();

  // Get authenticated session credentials
  const session = await fetchAuthSession(contextSpec);

  if (!session.credentials) {
    throw new Error('No authenticated credentials available');
  }

  return new S3Client({
    region: config.region,
    credentials: session.credentials
  });
}

export async function uploadProjectFile(
  orgId: string,
  projectId: string,
  relativePath: string,
  data: File | string | Blob,
  contentType?: string
): Promise<string> {
  const config = getBucketConfig();
  const storageKey = `org/${orgId}/projects/${projectId}/${relativePath}`;

  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      // Convert data to Buffer
      let body: Buffer;
      if (typeof data === 'string') {
        body = Buffer.from(data, 'utf-8');
      } else if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        body = Buffer.from(arrayBuffer);
      } else {
        const arrayBuffer = await data.arrayBuffer();
        body = Buffer.from(arrayBuffer);
      }

      const client = await getS3Client(contextSpec);

      // Determine content type
      let finalContentType = 'text/plain';
      if (contentType) {
        finalContentType = contentType;
      } else if (data instanceof Blob) {
        finalContentType = (data as any).type || 'text/plain';
      }

      await client.send(new PutObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
        Body: body,
        ContentType: finalContentType
      }));

      return storageKey;
    }
  });
}

export async function readProjectFile(
  orgId: string,
  projectId: string,
  relativePath: string
): Promise<string> {
  const config = getBucketConfig();
  const storageKey = `org/${orgId}/projects/${projectId}/${relativePath}`;

  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      const client = await getS3Client(contextSpec);

      const response = await client.send(new GetObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey
      }));

      const text = await response.Body!.transformToString();
      return text;
    }
  });
}

export async function deleteProjectFile(
  orgId: string,
  projectId: string,
  relativePath: string
): Promise<void> {
  const config = getBucketConfig();
  const storageKey = `org/${orgId}/projects/${projectId}/${relativePath}`;

  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      const client = await getS3Client(contextSpec);

      await client.send(new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey
      }));
    }
  });
}

export async function listProjectFilesInStorage(
  orgId: string,
  projectId: string
): Promise<Array<{ path: string; lastModified?: Date; size?: number }>> {
  const config = getBucketConfig();
  const prefix = `org/${orgId}/projects/${projectId}/`;

  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      const client = await getS3Client(contextSpec);

      const response = await client.send(new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefix
      }));

      return (response.Contents || []).map(item => ({
        path: item.Key || '',
        lastModified: item.LastModified,
        size: item.Size
      }));
    }
  });
}
