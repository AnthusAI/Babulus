import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { OrgMemberRole } from "../../packages/shared/src/index.js";
import {
  assertSameOrg,
  requireOrgAccess,
  resolveActiveOrgId,
  type OrgMembership,
} from "../../packages/shared/src/tenancy.js";

let memberships: OrgMembership[] = [];
let activeOrgId: string | null = null;
let activeRole: OrgMemberRole | null = null;
let tenancyError: string | null = null;

const resetState = () => {
  activeOrgId = null;
  activeRole = null;
  tenancyError = null;
};

Given("org memberships {string}", (value: string) => {
  resetState();
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "none") {
    memberships = [];
    return;
  }
  memberships = trimmed.split(",").map((entry) => {
    const [orgId, role] = entry.split(":").map((part) => part.trim());
    return {
      orgId,
      role: role as OrgMemberRole,
    };
  });
});

When("I resolve the active org with no preferred org", () => {
  resetState();
  try {
    activeOrgId = resolveActiveOrgId(memberships, null);
  } catch (error) {
    tenancyError = error instanceof Error ? error.message : String(error);
  }
});

When("I resolve the active org with preferred org {string}", (preferred: string) => {
  resetState();
  try {
    activeOrgId = resolveActiveOrgId(memberships, preferred);
  } catch (error) {
    tenancyError = error instanceof Error ? error.message : String(error);
  }
});

When("I require access to org {string}", (orgId: string) => {
  resetState();
  try {
    const membership = requireOrgAccess(memberships, orgId);
    activeRole = membership.role;
  } catch (error) {
    tenancyError = error instanceof Error ? error.message : String(error);
  }
});

When("I assert org {string} against active org {string}", (orgId: string, active: string) => {
  resetState();
  try {
    assertSameOrg(orgId, active);
  } catch (error) {
    tenancyError = error instanceof Error ? error.message : String(error);
  }
});

Then("the active org should be {string}", (expected: string) => {
  assert.equal(activeOrgId, expected);
});

Then("the active role should be {string}", (expected: string) => {
  assert.equal(activeRole, expected);
});

Then("the tenancy error should include {string}", (snippet: string) => {
  assert.ok(tenancyError?.includes(snippet));
});
