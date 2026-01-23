import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { writeRunArtifacts, type RunWriteResult } from "../../src/artifacts.js";

let workspace = "";
let envCacheDir = "";
let scriptPath = "";
let timelinePath = "";
let audioPath: string | null = null;
let result: RunWriteResult | null = null;
let secondResult: RunWriteResult | null = null;

const writeText = (path: string, content: string) => {
  writeFileSync(path, content);
};

Given("a run artifacts workspace", () => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-artifacts-"));
  envCacheDir = join(workspace, ".babulus", "out", "demo", "env", "test");
  scriptPath = join(workspace, "script.json");
  timelinePath = join(workspace, "timeline.json");
  audioPath = null;
  result = null;
});

Given("a script file", () => {
  writeText(scriptPath, JSON.stringify({ scenes: [] }) + "\n");
});

Given("a timeline file", () => {
  writeText(timelinePath, JSON.stringify({ items: [] }) + "\n");
});

Given("an audio file", () => {
  audioPath = join(workspace, "audio.wav");
  writeFileSync(audioPath, Buffer.from([0, 1, 2, 3]));
});

Given("a missing audio file path", () => {
  audioPath = join(workspace, "missing-audio.wav");
});

When("I write run artifacts without audio", () => {
  result = writeRunArtifacts({
    envCacheDir,
    env: "test",
    compositionId: "demo",
    dslPath: join(workspace, "content", "demo.babulus.ts"),
    scriptPath,
    timelinePath,
    audioPath: null,
  });
});

When("I write run artifacts with audio", () => {
  result = writeRunArtifacts({
    envCacheDir,
    env: "test",
    compositionId: "demo",
    dslPath: join(workspace, "content", "demo.babulus.ts"),
    scriptPath,
    timelinePath,
    audioPath,
  });
});

When("I write run artifacts again with audio", () => {
  secondResult = writeRunArtifacts({
    envCacheDir,
    env: "test",
    compositionId: "demo",
    dslPath: join(workspace, "content", "demo.babulus.ts"),
    scriptPath,
    timelinePath,
    audioPath,
  });
});

Then("the run should include script and timeline artifacts", () => {
  assert.ok(result);
  const kinds = new Set(result?.artifacts.map((artifact) => artifact.kind));
  assert.ok(kinds.has("script"));
  assert.ok(kinds.has("timeline"));
  assert.ok(existsSync(result!.runPath));
  const latestPath = join(envCacheDir, "runs", "latest.json");
  assert.ok(existsSync(latestPath));
  const latest = JSON.parse(readFileSync(latestPath, "utf8")) as { runPath?: string };
  assert.ok(latest.runPath);
});

Then("the run should not include audio artifacts", () => {
  assert.ok(result);
  const kinds = result?.artifacts.map((artifact) => artifact.kind) ?? [];
  assert.ok(!kinds.includes("audio"));
});

Then("the run should include audio artifacts", () => {
  assert.ok(result);
  const audio = result?.artifacts.find((artifact) => artifact.kind === "audio");
  assert.ok(audio?.path);
  assert.ok(existsSync(join(result!.runDir, audio!.path)));
});

Then("the run metadata file should exist", () => {
  assert.ok(result);
  assert.ok(existsSync(result!.runPath));
});

Then("the latest run pointer should match the run id", () => {
  assert.ok(result);
  const latestPath = join(envCacheDir, "runs", "latest.json");
  const latest = JSON.parse(readFileSync(latestPath, "utf8")) as { runId?: string; runPath?: string };
  assert.equal(latest.runId, result!.runId);
  assert.ok(latest.runPath?.includes(result!.runId));
});

Then("the run metadata should include composition id {string} and env {string}", (compositionId: string, env: string) => {
  assert.ok(result);
  const metadata = JSON.parse(readFileSync(result!.runPath, "utf8")) as { compositionId?: string; env?: string };
  assert.equal(metadata.compositionId, compositionId);
  assert.equal(metadata.env, env);
});

Then("the run metadata should include source path {string}", (dslPath: string) => {
  assert.ok(result);
  const metadata = JSON.parse(readFileSync(result!.runPath, "utf8")) as { source?: { dslPath?: string } };
  assert.ok(metadata.source?.dslPath);
  assert.ok(
    metadata.source?.dslPath?.endsWith(dslPath),
    `Expected source path to end with "${dslPath}" but got "${metadata.source?.dslPath}"`,
  );
});

Then("the run ids should match", () => {
  assert.ok(result);
  assert.ok(secondResult);
  assert.equal(result!.runId, secondResult!.runId);
});

After(() => {
  if (workspace) {
    rmSync(workspace, { recursive: true, force: true });
  }
  workspace = "";
  envCacheDir = "";
  scriptPath = "";
  timelinePath = "";
  audioPath = null;
  result = null;
  secondResult = null;
});
