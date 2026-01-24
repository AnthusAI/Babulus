import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { DataTable } from "@cucumber/cucumber";
import { applyOrgScope, assertOrgScope, buildOrgFilter } from "../../packages/shared/src/org-scope.js";

type ScopedInput = {
  orgId?: string;
  title?: string;
};

let scopedInput: ScopedInput = {};
let scopedResult: ScopedInput | null = null;
let scopeError: string | null = null;
let orgFilter: Record<string, { eq: string }> | null = null;

const reset = () => {
  scopedResult = null;
  scopeError = null;
  orgFilter = null;
};

Given("an org scoped input with org {string} and title {string}", (orgId: string, title: string) => {
  reset();
  scopedInput = {
    title,
  };
  if (orgId && orgId.toLowerCase() !== "none") {
    scopedInput.orgId = orgId;
  }
});

Given("an org record with org {string}", (orgId: string) => {
  reset();
  scopedInput = { orgId };
});

When("I apply org scope {string}", (activeOrgId: string) => {
  reset();
  try {
    scopedResult = applyOrgScope(scopedInput, activeOrgId);
  } catch (error) {
    scopeError = error instanceof Error ? error.message : String(error);
  }
});

When("I assert org scope {string}", (activeOrgId: string) => {
  reset();
  try {
    scopedResult = assertOrgScope({ orgId: scopedInput.orgId ?? "" }, activeOrgId);
  } catch (error) {
    scopeError = error instanceof Error ? error.message : String(error);
  }
});

When("I build an org filter for org {string}", (orgId: string) => {
  reset();
  orgFilter = buildOrgFilter(orgId);
});

Then("the scoped org should be {string}", (expected: string) => {
  assert.equal(scopedResult?.orgId, expected);
});

Then("the scoped title should be {string}", (expected: string) => {
  assert.equal(scopedResult?.title, expected);
});

Then("the org scope error should include {string}", (snippet: string) => {
  assert.ok(scopeError?.includes(snippet));
});

Then("the org filter should be:", (table: DataTable) => {
  const [values] = table.hashes();
  const expected = {
    [values.field]: { eq: values.eq },
  };
  assert.deepEqual(orgFilter, expected);
});
