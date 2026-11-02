import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import type { BaselineCheckResult, BaselineRecord } from "../../src/baseline.js";
import { computeSha256, readBaselineRecord, verifyBaseline, writeBaselineRecord } from "../../src/baseline.js";

let workspace: string;
let record: BaselineRecord;
let result: BaselineCheckResult | undefined;
let baselineError: Error | undefined;

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-baseline-"));
  record = { artifacts: [] };
  result = undefined;
  baselineError = undefined;
});

After(() => {
  rmSync(workspace, { recursive: true, force: true });
});

Given("a baseline workspace", () => {
  // workspace already created in Before
});

Given("a file {string} with content {string}", (name: string, content: string) => {
  const target = join(workspace, name);
  writeFileSync(target, content);
});

Given("a baseline file {string} with content:", (name: string, content: string) => {
  const target = join(workspace, name);
  writeFileSync(target, content);
});

Given("the baseline record includes {string} with its sha", (name: string) => {
  const target = join(workspace, name);
  const sha256 = computeSha256(target);
  record.artifacts.push({ path: name, sha256 });
});

Given("the baseline record includes {string} with sha {string}", (name: string, sha256: string) => {
  record.artifacts.push({ path: name, sha256 });
});

Given("the baseline record includes missing artifact {string} marked optional", (name: string) => {
  record.artifacts.push({ path: name, optional: true });
});

Given("the baseline record includes missing artifact {string}", (name: string) => {
  record.artifacts.push({ path: name });
});

When("I verify the baseline record", () => {
  result = verifyBaseline(record, { baseDir: workspace });
});

When("I write the baseline record to {string}", (name: string) => {
  writeBaselineRecord(join(workspace, name), record);
});

When("I read the baseline record at {string}", (name: string) => {
  try {
    readBaselineRecord(join(workspace, name));
  } catch (err) {
    baselineError = err as Error;
  }
});

Then("the baseline should be valid", () => {
  assert.ok(result?.ok);
});

Then("the baseline should be invalid", () => {
  assert.ok(result && !result.ok);
});

Then("the mismatch count should be {int}", (count: number) => {
  assert.equal(result?.mismatched.length ?? 0, count);
});

Then("the missing count should be {int}", (count: number) => {
  assert.equal(result?.missing.length ?? 0, count);
});

Then("a baseline parse error should be raised", () => {
  assert.ok(baselineError);
});

Then("no baseline parse error should be raised", () => {
  assert.equal(baselineError, undefined);
});
