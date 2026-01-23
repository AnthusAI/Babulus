import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { computeSha256 } from "../../src/baseline.js";

let workspace = "";
let exitCode: number | null = null;

const repoRoot = process.cwd();
const tsxPath = resolve(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-cli-"));
  exitCode = null;
});

After(() => {
  rmSync(workspace, { recursive: true, force: true });
});

Given("a CLI baseline workspace", () => {
  // workspace created in Before
});

Given("a baseline artifact file {string} with content {string}", (name: string, content: string) => {
  writeFileSync(join(workspace, name), content);
});

Given(
  "a baseline record at {string} with artifact {string} and sha",
  (recordName: string, artifactName: string) => {
    const sha256 = computeSha256(join(workspace, artifactName));
    const record = { artifacts: [{ path: artifactName, sha256 }] };
    writeFileSync(join(workspace, recordName), JSON.stringify(record, null, 2));
  },
);

Given(
  "a baseline record at {string} with artifact {string} and missing sha",
  (recordName: string, artifactName: string) => {
    const record = { artifacts: [{ path: artifactName }] };
    writeFileSync(join(workspace, recordName), JSON.stringify(record, null, 2));
  },
);

Given("a baseline record at {string} with missing artifact {string}", (recordName: string, artifactName: string) => {
  const record = { artifacts: [{ path: artifactName }] };
  writeFileSync(join(workspace, recordName), JSON.stringify(record, null, 2));
});

When("I run babulus baseline verify with record {string}", (recordName: string) => {
  const recordPath = join(workspace, recordName);
  const result = spawnSync(tsxPath, ["src/cli.ts", "baseline", "verify", "--record", recordPath, "--root", workspace], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  exitCode = result.status;
});

When("I run babulus baseline update with record {string}", (recordName: string) => {
  const recordPath = join(workspace, recordName);
  const result = spawnSync(tsxPath, ["src/cli.ts", "baseline", "update", "--record", recordPath, "--root", workspace], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  exitCode = result.status;
});

Then("the CLI exit code should be {int}", (code: number) => {
  assert.equal(exitCode, code);
});

Then("the baseline record at {string} should include sha for {string}", (recordName: string, artifactName: string) => {
  const recordPath = join(workspace, recordName);
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as { artifacts: Array<{ path: string; sha256?: string }> };
  const entry = record.artifacts.find((artifact) => artifact.path === artifactName);
  assert.ok(entry?.sha256);
  const expected = computeSha256(join(workspace, artifactName));
  assert.equal(entry?.sha256, expected);
});

When(
  "I run babulus baseline init with record {string} and artifacts {string} and optional {string}",
  (recordName: string, artifacts: string, optional: string) => {
    const recordPath = join(workspace, recordName);
    const artifactList = artifacts
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const optionalList = optional
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const args = ["src/cli.ts", "baseline", "init", "--record", recordPath, "--artifact", ...artifactList];
    if (optionalList.length) {
      args.push("--optional", ...optionalList);
    }
    const result = spawnSync(tsxPath, args, { cwd: repoRoot, stdio: "ignore" });
    exitCode = result.status;
  },
);

Then("the baseline record at {string} should contain {int} artifacts", (recordName: string, count: number) => {
  const recordPath = join(workspace, recordName);
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as { artifacts: Array<{ path: string }> };
  assert.equal(record.artifacts.length, count);
});

Then("the baseline record at {string} should mark {string} optional", (recordName: string, artifactName: string) => {
  const recordPath = join(workspace, recordName);
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as { artifacts: Array<{ path: string; optional?: boolean }> };
  const entry = record.artifacts.find((artifact) => artifact.path === artifactName);
  assert.equal(entry?.optional, true);
});
