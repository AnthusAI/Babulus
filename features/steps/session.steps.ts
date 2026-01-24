import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { buildActiveSession, sessionCan, type ActiveSession } from "../../packages/shared/src/session.js";
import type { OrgMemberRole } from "../../packages/shared/src/index.js";
import type { OrgPermission } from "../../packages/shared/src/rbac.js";
import type { OrgMembership } from "../../packages/shared/src/tenancy.js";

let memberships: OrgMembership[] = [];
let session: ActiveSession | null = null;
let sessionError: string | null = null;

const reset = () => {
  session = null;
  sessionError = null;
};

Given("session org memberships {string}", (value: string) => {
  reset();
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

When("I build a session for user {string} with preferred org {string}", (userId: string, preferred: string) => {
  reset();
  try {
    session = buildActiveSession({
      userId,
      memberships,
      preferredOrgId: preferred.toLowerCase() === "none" ? null : preferred,
    });
  } catch (error) {
    sessionError = error instanceof Error ? error.message : String(error);
  }
});

Then("the session org should be {string}", (expected: string) => {
  assert.equal(session?.activeOrgId, expected);
});

Then("the session role should be {string}", (expected: string) => {
  assert.equal(session?.role, expected);
});

Then("the session error should include {string}", (snippet: string) => {
  assert.ok(sessionError?.includes(snippet));
});

Then("the session permission {string} should be allowed", (permission: string) => {
  assert.ok(session);
  assert.equal(sessionCan(session as ActiveSession, permission as OrgPermission), true);
});

Then("the session permission {string} should be denied", (permission: string) => {
  assert.ok(session);
  assert.equal(sessionCan(session as ActiveSession, permission as OrgPermission), false);
});
