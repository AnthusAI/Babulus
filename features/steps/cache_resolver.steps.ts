import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import {
  getManifestDuration,
  loadManifest,
  resolveCachedMusic,
  resolveCachedSegment,
  resolveCachedSfx,
} from "../../src/cache-resolver.js";

let workspace = "";
let manifest: Record<string, unknown> = {};
let duration: number | null = null;
let cachedPath: string | null = null;
let cachedEnv: string | null = null;

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-cache-"));
  manifest = {};
  duration = null;
  cachedPath = null;
  cachedEnv = null;
});

After(() => {
  rmSync(workspace, { recursive: true, force: true });
});

Given("a cache workspace", () => {
  // workspace created in Before
});

Given("a manifest file {string} with content:", (name: string, content: string) => {
  const target = join(workspace, name);
  writeFileSync(target, content);
});

Given(
  "a manifest entry for section {string} and path {string} with key {string} and duration {float}",
  (section: string, pathValue: string, key: string, dur: number) => {
    manifest[section] = manifest[section] ?? {};
    const sectionObj = manifest[section] as Record<string, unknown>;
    sectionObj[pathValue] = { key, durationSec: dur };
  },
);

Given(
  "an env {string} has a {string} file named {string} with manifest key {string} and duration {float}",
  (env: string, kind: string, filename: string, key: string, dur: number) => {
    const envDir = join(workspace, "env", env, kind);
    mkdirSync(envDir, { recursive: true });
    const fullPath = join(envDir, filename);
    writeFileSync(fullPath, "audio");
    const manifestPath = join(workspace, "env", env, "manifest.json");
    const entry = { key, durationSec: dur };
    const manifestObj = { [kind]: { [fullPath]: entry } };
    writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2));
  },
);

When("I load the manifest at {string}", (name: string) => {
  const target = join(workspace, name);
  manifest = loadManifest(target);
});

When(
  "I get the manifest duration for section {string} path {string} with key {string}",
  (section: string, pathValue: string, key: string) => {
    duration = getManifestDuration(manifest, section, pathValue, key);
  },
);

When(
  "I resolve cached segment for env {string} with key {string} scene {string} cue {string} occurrence {int} ext {string}",
  (env: string, key: string, sceneId: string, cueId: string, occurrence: number, ext: string) => {
    const result = resolveCachedSegment(workspace, env, key, sceneId, cueId, occurrence, ext);
    cachedPath = result.path;
    cachedEnv = result.env;
  },
);

When(
  "I resolve cached sfx for env {string} with key {string} clip {string} variant {int} ext {string}",
  (env: string, key: string, clipId: string, variant: number, ext: string) => {
    const result = resolveCachedSfx(workspace, env, key, clipId, variant, ext);
    cachedPath = result.path;
    cachedEnv = result.env;
  },
);

When(
  "I resolve cached music for env {string} with key {string} clip {string} variant {int} ext {string}",
  (env: string, key: string, clipId: string, variant: number, ext: string) => {
    const result = resolveCachedMusic(workspace, env, key, clipId, variant, ext);
    cachedPath = result.path;
    cachedEnv = result.env;
  },
);

Then("the manifest should include section {string}", (section: string) => {
  assert.ok(manifest[section]);
});

Then("the manifest should be empty", () => {
  assert.deepEqual(manifest, {});
});

Then("the duration should be {float}", (expected: number) => {
  assert.equal(duration, expected);
});

Then("the cached path should exist", () => {
  assert.ok(cachedPath && cachedPath.length > 0);
});

Then("the cached env should be {string}", (env: string) => {
  assert.equal(cachedEnv, env);
});

Then("the cached path should be null", () => {
  assert.equal(cachedPath, null);
});
