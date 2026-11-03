import { buildAccountObjectKey } from "@babulus/shared";
import {
  deleteAccountObject,
  getAccountObjectText,
  listAccountObjects,
  putAccountObject,
} from "./account-media";

/**
 * Project files, server only. `accountId` must be an Account the caller was verified to belong to; the object key
 * is built here from that Account, never taken from the client.
 */

const PROJECT_ID = /^[A-Za-z0-9_-]{1,128}$/;

const projectPath = (projectId: string, relativePath: string): string => {
  if (!PROJECT_ID.test(projectId)) {
    throw new Error("Invalid project");
  }
  return `projects/${projectId}/${relativePath}`;
};

/** The stored key of a project file (also validates the path). */
export function getProjectFileKey(accountId: string, projectId: string, relativePath: string): string {
  return buildAccountObjectKey(accountId, projectPath(projectId, relativePath));
}

export async function uploadProjectFile(
  accountId: string,
  projectId: string,
  relativePath: string,
  data: File | string | Blob,
  contentType?: string,
): Promise<string> {
  const body = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(await (data as Blob).arrayBuffer());
  const type = contentType || (data instanceof Blob ? data.type : "") || "text/plain";
  return putAccountObject(accountId, projectPath(projectId, relativePath), body, type);
}

export async function readProjectFile(accountId: string, projectId: string, relativePath: string): Promise<string> {
  return getAccountObjectText(accountId, projectPath(projectId, relativePath));
}

export async function deleteProjectFile(accountId: string, projectId: string, relativePath: string): Promise<void> {
  await deleteAccountObject(accountId, projectPath(projectId, relativePath));
}

export async function listProjectFilesInStorage(accountId: string, projectId: string) {
  return listAccountObjects(accountId, projectPath(projectId, "").replace(/\/$/, ""));
}
