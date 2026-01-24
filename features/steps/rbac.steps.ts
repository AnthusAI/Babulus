import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { can, resolveUsageVisibility, type OrgPermission } from "../../packages/shared/src/rbac.js";
import type { OrgMemberRole, UsageVisibilityMode } from "../../packages/shared/src/index.js";

let activeRole: OrgMemberRole = "viewer";
let resolvedVisibility: UsageVisibilityMode | null = null;

Given("an org role {string}", (role: string) => {
  activeRole = role as OrgMemberRole;
  resolvedVisibility = null;
});

Then("the role should allow {string}", (permission: string) => {
  assert.equal(can(activeRole, permission as OrgPermission), true);
});

Then("the role should deny {string}", (permission: string) => {
  assert.equal(can(activeRole, permission as OrgPermission), false);
});

When("I resolve usage visibility for billing mode {string}", (mode: string) => {
  resolvedVisibility = resolveUsageVisibility(activeRole, mode as UsageVisibilityMode);
});

Then("the usage visibility should be {string}", (expected: string) => {
  assert.equal(resolvedVisibility, expected);
});
