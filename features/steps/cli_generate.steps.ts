import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";

let workspace = "";
let exitCode: number | null = null;
let stderr = "";

const repoRoot = process.cwd();
const tsxPath = resolve(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const cliPath = resolve(repoRoot, "src", "cli.ts");

const recordResult = (result: ReturnType<typeof spawnSync>) => {
  exitCode = result.status;
  stderr = result.stderr ?? "";
  if (exitCode !== 0) {
    console.log("CLI stdout:", result.stdout ?? "");
    console.log("CLI stderr:", result.stderr ?? "");
  }
};

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-cli-generate-"));
  mkdirSync(join(workspace, "content"), { recursive: true });
  exitCode = null;
  stderr = "";
});

After(() => {
  if (workspace) {
    rmSync(workspace, { recursive: true, force: true });
  }
  workspace = "";
});

Given("a CLI generate workspace", () => {});

Given("a generate DSL file {string} with composition {string}", (relativePath: string, compId: string) => {
  const path = join(workspace, relativePath);
  writeFileSync(path, buildDsl([compId]));
});

Given(
  "a generate DSL file {string} with compositions {string} and {string}",
  (relativePath: string, first: string, second: string) => {
    const path = join(workspace, relativePath);
    writeFileSync(path, buildDsl([first, second]));
  },
);

Given("generate DSL files in {string} named:", (dir: string, table: { raw: () => string[][] }) => {
  const target = join(workspace, dir);
  mkdirSync(target, { recursive: true });
  const rows = table.raw().flat();
  for (const name of rows) {
    const path = join(target, name);
    writeFileSync(path, buildDsl([name.replace(/\.babulus\.xml$/, "")]));
  }
});

When("I run babulus generate for DSL {string} env {string}", (relativePath: string, env: string) => {
  const path = join(workspace, relativePath);
  const result = spawnSync(
    tsxPath,
    [
      "src/cli.ts",
      "generate",
      path,
      "--env",
      env,
      "--provider",
      "dry-run",
      "--project-dir",
      workspace,
    ],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  recordResult(result);
});

When(
  "I run babulus generate for DSL {string} env {string} without usage",
  (relativePath: string, env: string) => {
    const path = join(workspace, relativePath);
    const result = spawnSync(
      tsxPath,
      [
        "src/cli.ts",
        "generate",
        path,
        "--env",
        env,
        "--provider",
        "dry-run",
        "--no-usage",
        "--project-dir",
        workspace,
      ],
      { cwd: repoRoot, encoding: "utf-8" },
    );
    recordResult(result);
  },
);

When("I run babulus generate with script override for DSL {string}", (relativePath: string) => {
  const path = join(workspace, relativePath);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "generate", path, "--script-out", "override.json", "--project-dir", workspace],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  recordResult(result);
});

When("I run babulus generate watch with script override for directory {string}", (dir: string) => {
  const path = join(workspace, dir);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "generate", path, "--watch", "--script-out", "override.json", "--project-dir", workspace],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  recordResult(result);
});

When("I run babulus generate with auto-discovery env {string}", (env: string) => {
  const result = spawnSync(
    tsxPath,
    [cliPath, "generate", "--env", env, "--provider", "dry-run", "--project-dir", workspace],
    { cwd: workspace, encoding: "utf-8" },
  );
  recordResult(result);
});

When("I run babulus generate for missing path {string}", (relativePath: string) => {
  const path = join(workspace, relativePath);
  const result = spawnSync(
    tsxPath,
    [cliPath, "generate", path],
    { cwd: workspace, encoding: "utf-8" },
  );
  recordResult(result);
});

Then("the generate CLI exit code should be {int}", (code: number) => {
  assert.equal(exitCode, code);
});

Then("the generate CLI error output should include {string}", (value: string) => {
  assert.ok(stderr.includes(value), `stderr did not include "${value}".\nstderr:\n${stderr}`);
});

Then("the generated script should exist for composition {string}", (compId: string) => {
  const path = join(workspace, "src", "videos", compId, `${compId}.script.json`);
  assert.ok(existsSync(path), `Missing script: ${path}`);
});

Then("the generated timeline should exist for composition {string}", (compId: string) => {
  const path = join(workspace, "src", "videos", compId, `${compId}.timeline.json`);
  assert.ok(existsSync(path), `Missing timeline: ${path}`);
});

Then("the generated audio should exist for composition {string}", (compId: string) => {
  const path = join(workspace, "public", "babulus", `${compId}.wav`);
  assert.ok(existsSync(path), `Missing audio: ${path}`);
});

Then("the usage ledger should exist for composition {string} env {string}", (compId: string, env: string) => {
  const path = join(workspace, ".babulus", "out", compId, "env", env, "usage.jsonl");
  assert.ok(existsSync(path), `Missing usage ledger: ${path}`);
});

Then("the usage ledger should not exist for composition {string} env {string}", (compId: string, env: string) => {
  const path = join(workspace, ".babulus", "out", compId, "env", env, "usage.jsonl");
  assert.ok(!existsSync(path), `Expected no usage ledger at: ${path}`);
});

const buildDsl = (compositionIds: string[]) => {
  const id = compositionIds[0] ?? "demo";
  return `<vml id="${id}" title="${id}" fps="30" width="1280" height="720">
  <scene id="scene" title="Scene">
    <cue id="cue">
      <voice>Hello world</voice>
    </cue>
  </scene>
</vml>
`;
};
