import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertKeyInAccount, buildAccountObjectKey, buildPublishedKey } from "@babulus/shared";

/**
 * Account media, server only. Every stored object lives under `org/<Account ID>/`, and the Account ID passed to
 * these functions must already have been verified against the caller's ID token (see account-authorization.ts).
 * The server acts with its own role; browsers have no direct access to `org/*`.
 */

export const PRESIGNED_URL_SECONDS = 900;

let client: S3Client | null = null;
let bucket: string | null = null;

const config = () => {
  if (!client || !bucket) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const outputs = require("../amplify_outputs.json");
    bucket = outputs?.storage?.bucket_name;
    const region = outputs?.storage?.aws_region;
    if (!bucket || !region) {
      throw new Error("Storage is not configured.");
    }
    // No explicit credentials: the default chain picks up the Studio server's own role.
    client = new S3Client({ region });
  }
  return { client, bucket };
};

/** A short-lived download URL for an object that belongs to the Account. */
export const presignAccountDownload = async (accountId: string, key: string): Promise<string> => {
  const { client: s3, bucket: name } = config();
  assertKeyInAccount(key, accountId);
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: name, Key: key }), { expiresIn: PRESIGNED_URL_SECONDS });
};

export const putAccountObject = async (
  accountId: string,
  relativePath: string,
  body: Buffer,
  contentType: string,
): Promise<string> => {
  const { client: s3, bucket: name } = config();
  const key = buildAccountObjectKey(accountId, relativePath);
  await s3.send(new PutObjectCommand({ Bucket: name, Key: key, Body: body, ContentType: contentType }));
  return key;
};

export const getAccountObjectText = async (accountId: string, relativePath: string): Promise<string> => {
  const { client: s3, bucket: name } = config();
  const key = buildAccountObjectKey(accountId, relativePath);
  const response = await s3.send(new GetObjectCommand({ Bucket: name, Key: key }));
  return response.Body!.transformToString();
};

export const deleteAccountObject = async (accountId: string, relativePath: string): Promise<void> => {
  const { client: s3, bucket: name } = config();
  await s3.send(new DeleteObjectCommand({ Bucket: name, Key: buildAccountObjectKey(accountId, relativePath) }));
};

export const listAccountObjects = async (accountId: string, relativePrefix: string) => {
  const { client: s3, bucket: name } = config();
  const prefix = `${buildAccountObjectKey(accountId, relativePrefix)}/`;
  const response = await s3.send(new ListObjectsV2Command({ Bucket: name, Prefix: prefix }));
  return (response.Contents ?? []).map((item) => ({ path: item.Key ?? "", lastModified: item.LastModified, size: item.Size }));
};

/**
 * Publish a rendered video: copy it from the Account's own prefix to `published/<Account ID>/<slug>.mp4`. The
 * Account ID is part of the public key so one Account can never overwrite another's published file.
 */
export const publishAccountObject = async (accountId: string, sourceKey: string, slug: string): Promise<string> => {
  const destination = buildPublishedKey(accountId, slug);
  const { client: s3, bucket: name } = config();
  assertKeyInAccount(sourceKey, accountId);
  await s3.send(new CopyObjectCommand({ Bucket: name, Key: destination, CopySource: `${name}/${sourceKey}` }));
  return destination;
};
