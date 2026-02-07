import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";

let workspace = "";
let dslPath = "";
let compositionId = "";
let envName = "";
let scriptPath = "";
let timelinePath = "";
let audioPath = "";
let envDir = "";
let publicDir = "";
let outputs: string[] = [];
let exitCode: number | null = null;
let stderr = "";

const repoRoot = process.cwd();
const tsxPath = resolve(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-cli-clean-"));
  mkdirSync(join(workspace, ".babulus"), { recursive: true });
  dslPath = "";
  compositionId = "";
  envName = "";
  scriptPath = "";
  timelinePath = "";
  audioPath = "";
  envDir = "";
  publicDir = "";
  outputs = [];
  exitCode = null;
  stderr = "";
});

After(() => {
  if (workspace) {
    rmSync(workspace, { recursive: true, force: true });
  }
  workspace = "";
});

Given("a CLI clean workspace", () => {});

Given("a clean DSL file {string} with composition {string}", (relativePath: string, compId: string) => {
  compositionId = compId;
  dslPath = join(workspace, relativePath);
  mkdirSync(join(workspace, "content"), { recursive: true });
  writeFileSync(
    dslPath,
    `<vml id="${compId}" title="${compId}" fps="30" width="1280" height="720">
  <scene id="scene" title="Scene" />
</vml>
`,
  );
});

Given(
  "the clean workspace has generated outputs for composition {string} in env {string}",
  (compId: string, env: string) => {
    compositionId = compId;
    envName = env;
    scriptPath = join(workspace, "src", "videos", compId, `${compId}.script.json`);
    timelinePath = join(workspace, "src", "videos", compId, `${compId}.timeline.json`);
    audioPath = join(workspace, "public", "babulus", `${compId}.wav`);
    envDir = join(workspace, ".babulus", "out", compId, "env", env);
    publicDir = join(workspace, "public", "babulus", compId);
    mkdirSync(join(workspace, "src", "videos", compId), { recursive: true });
    mkdirSync(join(workspace, "public", "babulus"), { recursive: true });
    mkdirSync(envDir, { recursive: true });
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(scriptPath, JSON.stringify({ scenes: [] }));
    writeFileSync(timelinePath, JSON.stringify({ audio: {} }));
    writeFileSync(audioPath, Buffer.from([1, 2, 3]));
    writeFileSync(join(envDir, "dummy.txt"), "ok");
    writeFileSync(join(publicDir, "dummy.txt"), "ok");
    outputs = [scriptPath, timelinePath, audioPath, envDir, publicDir];
  },
);

When("I run babulus clean dry-run for DSL {string} env {string}", (relativePath: string, env: string) => {
  const path = join(workspace, relativePath);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "clean", path, "--env", env, "--project-dir", workspace],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  exitCode = result.status;
  stderr = result.stderr;
});

When("I run babulus clean delete for DSL {string} env {string}", (relativePath: string, env: string) => {
  const path = join(workspace, relativePath);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "clean", path, "--env", env, "--project-dir", workspace, "--yes"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  exitCode = result.status;
  stderr = result.stderr;
});

Then("the clean CLI exit code should be {int}", (code: number) => {
  assert.equal(exitCode, code);
});

Then("the clean CLI output should include {string}", (value: string) => {
  assert.ok(stderr.includes(value), `stderr did not include "${value}".\nstderr:\n${stderr}`);
});

Then("the clean outputs should still exist", () => {
  for (const path of outputs) {
    assert.ok(existsSync(path), `Expected path to exist: ${path}`);
  }
});

Then("the clean outputs should be deleted", () => {
  for (const path of outputs) {
    assert.ok(!existsSync(path), `Expected path to be deleted: ${path}`);
  }
});
