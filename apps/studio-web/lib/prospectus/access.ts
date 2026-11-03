import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  ProspectusAccountsError,
  type ProspectusDirectoryAccount,
  type ProspectusRole,
  type ProspectusStudioAccounts,
} from "./site-identity";

/** The Prospectus product name Babulus registers as. */
export const BABULUS_PRODUCT = "babulus";

/** What a person can be in the Studio, decided from their Prospectus role on an Account. */
export type StudioRole = "owner" | "admin" | "editor";

/**
 * Prospectus owner, admin and member map to Studio owner, admin and editor. A Prospectus viewer gets no Studio data
 * access at all (the Studio has no read-only mode yet), so a viewer-only Account is never offered and grants no group.
 */
export const STUDIO_ROLE_FOR_PROSPECTUS_ROLE: Record<ProspectusRole, StudioRole | null> = {
  owner: "owner",
  admin: "admin",
  member: "editor",
  viewer: null,
};

export interface StudioAccountAccess {
  accountId: string;
  accountName: string;
  role: StudioRole;
}

/** Accounts of the directory that have Babulus switched on and give the person a Studio role. */
export function studioAccountsFromDirectory(accounts: readonly ProspectusDirectoryAccount[]): StudioAccountAccess[] {
  const result: StudioAccountAccess[] = [];
  for (const account of accounts) {
    const hasProduct = account.products.some((product) => product.product === BABULUS_PRODUCT && product.status === "active");
    const role = STUDIO_ROLE_FOR_PROSPECTUS_ROLE[account.role];
    if (hasProduct && role && ACCOUNT_ID_PATTERN.test(account.id)) {
      result.push({ accountId: account.id, accountName: account.name, role });
    }
  }
  return result;
}

/**
 * The Accounts the person may work in: Babulus is switched on, the role gives a Studio role, and Prospectus itself
 * authorizes `console:write` for it. A 403 from Prospectus drops that Account; any other failure throws, so a sync that
 * cannot be sure never changes anything.
 */
export async function authorizedStudioAccounts(
  accounts: Pick<ProspectusStudioAccounts, "accountDirectory" | "authorizeAccountOperation">,
  accessToken: string,
  personId: string,
): Promise<StudioAccountAccess[]> {
  const directory = await accounts.accountDirectory(accessToken);
  if (!directory.person || directory.person.id !== personId) {
    throw new ProspectusAccountsError(401, "unknown_person", "Sign in again: Prospectus does not recognize this session.");
  }
  const authorized: StudioAccountAccess[] = [];
  for (const candidate of studioAccountsFromDirectory(directory.accounts)) {
    try {
      const authorization = await accounts.authorizeAccountOperation(accessToken, candidate.accountId, "console:write");
      if (authorization.allowed === true && authorization.personId === personId && authorization.accountId === candidate.accountId) {
        authorized.push({ ...candidate, role: STUDIO_ROLE_FOR_PROSPECTUS_ROLE[authorization.role] ?? candidate.role });
      }
    } catch (error) {
      if (error instanceof ProspectusAccountsError && (error.status === 403 || error.status === 404)) continue;
      throw error;
    }
  }
  return authorized;
}

/** Account group names are lowercase UUIDs; nothing else in the pool is ever touched by the sync. */
export const ACCOUNT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface CognitoGroupAdmin {
  listGroupsForUser(userPoolId: string, username: string): Promise<string[]>;
  createGroup(userPoolId: string, groupName: string): Promise<void>;
  addUserToGroup(userPoolId: string, username: string, groupName: string): Promise<void>;
  removeUserFromGroup(userPoolId: string, username: string, groupName: string): Promise<void>;
}

export interface GroupSyncResult {
  added: string[];
  removed: string[];
  kept: string[];
}

/**
 * Makes the user's Account groups exactly the entitled Accounts. A group is named for the Prospectus Account UUID, and
 * the ID token's `cognito:groups` then carries it to the data layer, which authorizes records by their `orgId`. Groups
 * that are not Account UUIDs (anything an operator made by hand) are left alone. Groups are created on demand.
 */
export async function syncAccountGroups(options: {
  admin: CognitoGroupAdmin;
  userPoolId: string;
  username: string;
  entitledAccountIds: readonly string[];
}): Promise<GroupSyncResult> {
  const wanted = new Set(options.entitledAccountIds.map((id) => id.toLowerCase()));
  for (const id of wanted) if (!ACCOUNT_ID_PATTERN.test(id)) throw new Error("An Account id is not a lowercase UUID.");
  const current = (await options.admin.listGroupsForUser(options.userPoolId, options.username)).filter((name) => ACCOUNT_ID_PATTERN.test(name));
  const currentSet = new Set(current);
  const added = [...wanted].filter((id) => !currentSet.has(id)).sort();
  const removed = current.filter((id) => !wanted.has(id)).sort();
  for (const id of added) {
    await options.admin.createGroup(options.userPoolId, id);
    await options.admin.addUserToGroup(options.userPoolId, options.username, id);
  }
  for (const id of removed) await options.admin.removeUserFromGroup(options.userPoolId, options.username, id);
  return { added, removed, kept: current.filter((id) => wanted.has(id)).sort() };
}

/** The real Cognito calls, signed by the Studio's compute role. */
export function cognitoGroupAdmin(client: Pick<CognitoIdentityProviderClient, "send"> = new CognitoIdentityProviderClient({})): CognitoGroupAdmin {
  return {
    async listGroupsForUser(userPoolId, username) {
      const names: string[] = [];
      let nextToken: string | undefined;
      do {
        const page = await client.send(new AdminListGroupsForUserCommand({ UserPoolId: userPoolId, Username: username, NextToken: nextToken }));
        for (const group of page.Groups ?? []) if (group.GroupName) names.push(group.GroupName);
        nextToken = page.NextToken;
      } while (nextToken);
      return names;
    },
    async createGroup(userPoolId, groupName) {
      try {
        await client.send(new CreateGroupCommand({ UserPoolId: userPoolId, GroupName: groupName, Description: "Babulus Account" }));
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "GroupExistsException") throw error;
      }
    },
    async addUserToGroup(userPoolId, username, groupName) {
      await client.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: username, GroupName: groupName }));
    },
    async removeUserFromGroup(userPoolId, username, groupName) {
      await client.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: userPoolId, Username: username, GroupName: groupName }));
    },
  };
}
