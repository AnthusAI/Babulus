import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import {
  archiveVariants,
  bumpPick,
  clearLiveVariants,
  loadSelections,
  restoreVariants,
  setPick,
} from "../../src/sfx-workflow.js";
import { resolveEnvCacheDir } from "../../src/env.js";
import { BabulusError } from "../../src/errors.js";

let workspace = "";
const env = "development";
let lastPick: number | undefined;
let sfxError: Error | undefined;

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-sfx-"));
  lastPick = undefined;
  sfxError = undefined;
});

After(() => {
  rmSync(workspace, { recursive: true, force: true });
});

Given("an SFX workspace", () => {
  // workspace created in Before
});

Given("live variants for clip {string} with {int} files", (clipId: string, count: number) => {
  const liveDir = join(resolveEnvCacheDir(workspace, env), "sfx");
  mkdirSync(liveDir, { recursive: true });
  for (let i = 0; i < count; i += 1) {
    const filename = `${clipId}--v${i + 1}--hash.wav`;
    writeFileSync(join(liveDir, filename), "sfx");
  }
});

When("I set pick {int} for clip {string}", (pick: number, clipId: string) => {
  try {
    lastPick = setPick(workspace, clipId, pick, env);
  } catch (err) {
    sfxError = err as Error;
  }
});

When("I bump pick by {int} with {int} variants for clip {string}", (delta: number, variants: number, clipId: string) => {
  try {
    lastPick = bumpPick(workspace, clipId, delta, variants, env);
  } catch (err) {
    sfxError = err as Error;
  }
});

When("I archive variants for clip {string} keeping variant {int}", (clipId: string, keep: number) => {
  archiveVariants(workspace, clipId, keep, env);
});

When("I restore variants for clip {string}", (clipId: string) => {
  restoreVariants(workspace, clipId, env);
});

When("I clear live variants for clip {string}", (clipId: string) => {
  clearLiveVariants(workspace, clipId, env);
});

Then("the saved pick for clip {string} should be {int}", (clipId: string, pick: number) => {
  const state = loadSelections(workspace, env);
  assert.equal(state.picks[clipId], pick);
  assert.equal(lastPick, pick);
});

Then("the live variants count for clip {string} should be {int}", (clipId: string, expected: number) => {
  const liveDir = join(resolveEnvCacheDir(workspace, env), "sfx");
  const entries = readdirSync(liveDir).filter((entry) => entry.startsWith(`${clipId}--v`));
  assert.equal(entries.length, expected);
});

Then("the archived variants count for clip {string} should be {int}", (clipId: string, expected: number) => {
  const archivedDir = join(resolveEnvCacheDir(workspace, env), "sfx_archived", clipId);
  const entries = readdirSync(archivedDir).filter((entry) => entry.startsWith(`${clipId}--v`));
  assert.equal(entries.length, expected);
});

Then("an SFX error should be raised", () => {
  assert.ok(sfxError);
  assert.ok(sfxError instanceof BabulusError);
});
