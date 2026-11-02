import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { OrgMemberRole } from "../../packages/shared/src/index.js";
import {
  assertOrgPermission,
  checkOrgPermission,
  type OrgAccessDecision,
} from "../../packages/shared/src/access.js";
import type { OrgPermission } from "../../packages/shared/src/rbac.js";
import type { OrgMembership } from "../../packages/shared/src/tenancy.js";

let memberships: OrgMembership[] = [];
let accessDecision: OrgAccessDecision | null = null;
let accessRole: OrgMemberRole | null = null;
let accessError: string | null = null;

const resetState = () => {
  accessDecision = null;
  accessRole = null;
  accessError = null;
};

Given("access org memberships {string}", (value: string) => {
  resetState();
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "none") {
    memberships = [];
    return;
  }
  memberships = trimmed.split(",").map((entry) => {
    const [orgId, role] = entry.split(":").map((part) => part.trim());
    return { orgId, role: role as OrgMemberRole };
  });
});

When(
  "I check access for org {string} with active org {string} permission {string}",
  (orgId: string, activeOrgId: string, permission: string) => {
    resetState();
    accessDecision = checkOrgPermission({
      memberships,
      orgId,
      activeOrgId,
      permission: permission as OrgPermission,
    });
  },
);

When(
  "I assert access for org {string} with active org {string} permission {string}",
  (orgId: string, activeOrgId: string, permission: string) => {
    resetState();
    try {
      accessRole = assertOrgPermission({
        memberships,
        orgId,
        activeOrgId,
        permission: permission as OrgPermission,
      });
    } catch (error) {
      accessError = error instanceof Error ? error.message : String(error);
    }
  },
);

Then("access should be allowed", () => {
  assert.equal(accessDecision?.allowed, true);
});

Then("access should be denied with reason {string}", (snippet: string) => {
  assert.equal(accessDecision?.allowed, false);
  assert.ok(accessDecision?.reason?.includes(snippet));
});

Then("the access role should be {string}", (expected: string) => {
  const resolvedRole = accessRole ?? accessDecision?.role;
  assert.equal(resolvedRole, expected);
});

Then("the access error should include {string}", (snippet: string) => {
  assert.ok(accessError?.includes(snippet));
});
