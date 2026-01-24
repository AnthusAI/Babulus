import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";

let workspace = "";
let exitCode: number | null = null;

const repoRoot = process.cwd();
const tsxPath = resolve(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const cliPath = resolve(repoRoot, "src", "cli.ts");

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-cli-worker-"));
  exitCode = null;
});

After(() => {
  if (workspace) {
    rmSync(workspace, { recursive: true, force: true });
  }
  workspace = "";
});

Given("a CLI worker workspace", () => {});

Given("a worker script file {string}", (name: string) => {
  const path = join(workspace, name);
  const script = {
    scenes: [
      {
        id: "scene",
        title: "Scene",
        startSec: 0,
        endSec: 1,
        cues: [],
      },
    ],
  };
  writeFileSync(path, JSON.stringify(script));
});

Given("a worker timeline file {string}", (name: string) => {
  const path = join(workspace, name);
  const timeline = { audio: { tracks: [] } };
  writeFileSync(path, JSON.stringify(timeline));
});

Given(
  "a worker job file {string} referencing {string} and {string}",
  (jobName: string, scriptName: string, timelineName: string) => {
    const jobPath = join(workspace, jobName);
    const job = {
      version: 1,
      kind: "render-storyboard",
      input: {
        scriptPath: scriptName,
        timelinePath: timelineName,
        framesDir: "out/frames",
        outputPath: "out/video.mp4",
        options: {
          workers: 1,
        },
      },
    };
    writeFileSync(jobPath, JSON.stringify(job, null, 2));
  },
);

When(
  "I run babulus worker run with job {string} and result {string} dry-run",
  (jobName: string, resultName: string) => {
    const jobPath = join(workspace, jobName);
    const resultPath = join(workspace, resultName);
    const result = spawnSync(
      tsxPath,
      [cliPath, "worker", "run", "--job", jobPath, "--result", resultPath, "--dry-run"],
      { cwd: workspace, encoding: "utf-8" },
    );
    exitCode = result.status;
  },
);

Then("the worker command should succeed", () => {
  assert.equal(exitCode, 0);
});

Then("the worker command should fail", () => {
  assert.notEqual(exitCode, 0);
});

Then("the worker result at {string} should have status {string}", (resultName: string, status: string) => {
  const resultPath = join(workspace, resultName);
  const data = JSON.parse(readFileSync(resultPath, "utf8")) as { status?: string };
  assert.equal(data.status, status);
});
