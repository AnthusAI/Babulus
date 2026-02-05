import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";

let workspace = "";
let dslPath = "";
let exitCode: number | null = null;
let stderr = "";
let scriptPath = "";
let timelinePath = "";
let audioPath = "";

const repoRoot = process.cwd();
const tsxPath = resolve(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const envVars = { ...process.env, BABULUS_ENV: "test" };

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-cli-sfx-"));
  mkdirSync(join(workspace, ".babulus"), { recursive: true });
  dslPath = "";
  exitCode = null;
  stderr = "";
});

After(() => {
  if (workspace) {
    rmSync(workspace, { recursive: true, force: true });
  }
  workspace = "";
});

Given("a CLI sfx workspace", () => {});

Given("a sfx DSL file {string} with composition {string}", (relativePath: string, compId: string) => {
  dslPath = join(workspace, relativePath);
  mkdirSync(join(workspace, "content"), { recursive: true });
  writeFileSync(
    dslPath,
    `<video id="${compId}" title="${compId}" fps="30" width="1280" height="720">
  <scene id="scene" title="Scene" />
</video>
`,
  );
});

Given(
  "a sfx DSL file {string} with composition {string} and cue",
  (relativePath: string, compId: string) => {
    dslPath = join(workspace, relativePath);
    mkdirSync(join(workspace, "content"), { recursive: true });
    writeFileSync(
      dslPath,
      `<video id="${compId}" title="${compId}" fps="30" width="1280" height="720">
  <scene id="scene" title="Scene">
    <cue id="cue">
      <voice>Hello world</voice>
    </cue>
  </scene>
</video>
`,
    );
    scriptPath = join(workspace, "src", "videos", compId, `${compId}.script.json`);
    timelinePath = join(workspace, "src", "videos", compId, `${compId}.timeline.json`);
    audioPath = join(workspace, "public", "babulus", `${compId}.wav`);
  },
);

Given(
  "sfx DSL files in {string} named:",
  (dir: string, table: { raw: () => string[][] }) => {
    const target = join(workspace, dir);
    mkdirSync(target, { recursive: true });
    const rows = table.raw().flat();
    for (const name of rows) {
      const id = name.replace(/\.babulus\.xml$/, "");
      const path = join(target, name);
      writeFileSync(
        path,
        `<video id="${id}" title="${id}" fps="30" width="1280" height="720">
  <scene id="scene" title="Scene" />
</video>
`,
      );
    }
  },
);

When("I run babulus sfx list for DSL {string}", (relativePath: string) => {
  const path = join(workspace, relativePath);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "sfx", "list", "--dsl", path, "--out-dir", join(workspace, ".babulus", "out", "demo"), "--project-dir", workspace],
    { cwd: repoRoot, encoding: "utf-8", env: envVars },
  );
  exitCode = result.status;
  stderr = result.stderr;
});

When(
  "I run babulus sfx set clip {string} pick {int} for DSL {string}",
  (clip: string, pick: number, relativePath: string) => {
    const path = join(workspace, relativePath);
    const result = spawnSync(
      tsxPath,
      [
        "src/cli.ts",
        "sfx",
        "set",
        "--clip",
        clip,
        "--pick",
        String(pick),
        "--dsl",
        path,
        "--out-dir",
        join(workspace, ".babulus", "out", "demo"),
        "--project-dir",
        workspace,
      ],
      { cwd: repoRoot, encoding: "utf-8", env: envVars },
    );
    exitCode = result.status;
    stderr = result.stderr;
  },
);

When(
  "I run babulus sfx set clip {string} pick {int} with apply for DSL {string}",
  (clip: string, pick: number, relativePath: string) => {
    const path = join(workspace, relativePath);
    const result = spawnSync(
      tsxPath,
      [
        "src/cli.ts",
        "sfx",
        "set",
        "--clip",
        clip,
        "--pick",
        String(pick),
        "--apply",
        "--dsl",
        path,
        "--out-dir",
        join(workspace, ".babulus", "out", "demo"),
        "--project-dir",
        workspace,
      ],
      { cwd: repoRoot, encoding: "utf-8", env: envVars },
    );
    exitCode = result.status;
    stderr = result.stderr;
  },
);

Then("the sfx CLI exit code should be {int}", (code: number) => {
  assert.equal(exitCode, code);
});

Then("the sfx CLI output should include {string}", (value: string) => {
  assert.ok(stderr.includes(value), `stderr did not include "${value}".\nstderr:\n${stderr}`);
});

Then("the sfx generated script should exist for composition {string}", (_compId: string) => {
  assert.ok(scriptPath, "scriptPath not set");
  assert.ok(existsSync(scriptPath), `Missing script: ${scriptPath}`);
});

Then("the sfx generated timeline should exist for composition {string}", (_compId: string) => {
  assert.ok(timelinePath, "timelinePath not set");
  assert.ok(existsSync(timelinePath), `Missing timeline: ${timelinePath}`);
});

Then("the sfx generated audio should exist for composition {string}", (_compId: string) => {
  assert.ok(audioPath, "audioPath not set");
  assert.ok(existsSync(audioPath), `Missing audio: ${audioPath}`);
});
