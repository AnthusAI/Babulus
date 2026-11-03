import type { OrgMemberRole } from "./index.ts";
import { buildOrgPrefix } from "./storage.ts";

/**
 * Account scope helpers. An Account is a Prospectus Account; its lowercase UUID is the `orgId` on every
 * Studio row and the `org/<id>/` prefix on every stored object. The only trusted source of "which Accounts
 * may this person use" is the `cognito:groups` claim of a verified ID token, which the sign-in service sets.
 */

/** A Prospectus Account ID: a lowercase UUID. Anything else in the groups claim is not an Account. */
export const ACCOUNT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isAccountId = (value: unknown): value is string =>
  typeof value === "string" && ACCOUNT_ID_PATTERN.test(value);

/** The Account IDs named by a groups claim, deduplicated, ignoring every group that is not an Account ID. */
export const accountIdsFromGroups = (groups: unknown): string[] => {
  if (!Array.isArray(groups)) {
    return [];
  }
  return [...new Set(groups.filter(isAccountId))];
};

export type AccountRole = "owner" | "admin" | "member" | "viewer";

/**
 * Babulus's own permissions are capped by the Prospectus role. `editor` has no Prospectus equivalent, so
 * `member` maps to it. A viewer gets no Studio access at all, so there is no Babulus role for it.
 */
export const babulusRoleForAccountRole = (role: AccountRole | string | null | undefined): OrgMemberRole | null => {
  switch (role) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "member":
      return "editor";
    default:
      return null;
  }
};

const assertRelativePath = (relativePath: string): string[] => {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("Path is required");
  }
  if (relativePath.startsWith("/") || relativePath.includes("\\") || relativePath.includes("\0")) {
    throw new Error("Path must be relative and use forward slashes");
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(relativePath)) {
    throw new Error("Path must not include a scheme");
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(".."))) {
    throw new Error("Path must not include empty, '.' or '..' segments");
  }
  return segments;
};

/**
 * The object key for a path inside one Account. The prefix comes from the verified Account ID, never from
 * the caller's path, and a path that tries to leave the prefix is refused.
 */
export const buildAccountObjectKey = (accountId: string, relativePath: string): string => {
  if (!isAccountId(accountId)) {
    throw new Error("accountId must be an Account ID");
  }
  const segments = assertRelativePath(relativePath);
  return `${buildOrgPrefix(accountId)}/${segments.join("/")}`;
};

/** Refuse any stored key that is not under the Account's own prefix (a key read from a row is not trusted either). */
export const assertKeyInAccount = (key: string, accountId: string): string => {
  const prefix = `${buildOrgPrefix(accountId)}/`;
  if (!isAccountId(accountId) || typeof key !== "string" || !key.startsWith(prefix)) {
    throw new Error("Key is outside this Account");
  }
  assertRelativePath(key.slice(prefix.length));
  return key;
};

const PUBLISH_SLUG = /^[a-z0-9][a-z0-9-]{2,62}$/;

/**
 * Where a published video lives: `published/<Account ID>/<slug>.mp4`. The Account ID is part of the public key
 * so one Account can never overwrite another Account's published file, whatever slug it picks.
 */
export const buildPublishedKey = (accountId: string, slug: string): string => {
  if (!isAccountId(accountId) || !PUBLISH_SLUG.test(slug)) {
    throw new Error("Invalid publish request");
  }
  return `published/${accountId}/${slug}.mp4`;
};
