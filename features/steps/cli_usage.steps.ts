import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import type { UsageSummary } from "../../packages/telemetry/src/index.js";
import type { UsageBreakdown } from "../../src/telemetry.js";

let workspace = "";
let exitCode: number | null = null;
let stdout = "";
let stderr = "";
let ledgerPath = "";

const repoRoot = process.cwd();
const tsxPath = resolve(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-cli-usage-"));
  exitCode = null;
  stdout = "";
  stderr = "";
  ledgerPath = "";
});

After(() => {
  rmSync(workspace, { recursive: true, force: true });
});

Given("a CLI usage workspace", () => {});

Given("a usage ledger {string} with entries:", (name: string, table: { raw: () => string[][] }) => {
  ledgerPath = join(workspace, name);
  writeUsageLedger(ledgerPath, table);
});

When("I run babulus usage summarize with ledger {string} and json output", (name: string) => {
  const path = join(workspace, name);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "usage", "summarize", "--ledger", path, "--json"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  exitCode = result.status;
  stdout = result.stdout;
  stderr = result.stderr;
});

When("I run babulus usage summarize with ledger {string} and detail output", (name: string) => {
  const path = join(workspace, name);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "usage", "summarize", "--ledger", path, "--detail"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  exitCode = result.status;
  stdout = result.stdout;
  stderr = result.stderr;
});

When("I run babulus usage summarize with ledger {string} and detail json output", (name: string) => {
  const path = join(workspace, name);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "usage", "summarize", "--ledger", path, "--detail", "--json"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  exitCode = result.status;
  stdout = result.stdout;
  stderr = result.stderr;
});

When("I run babulus usage summarize with missing ledger {string}", (name: string) => {
  const path = join(workspace, name);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "usage", "summarize", "--ledger", path, "--json"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  exitCode = result.status;
  stdout = result.stdout;
  stderr = result.stderr;
});

Given("a usage DSL file {string} with composition {string}", (relativePath: string, compositionId: string) => {
  const path = join(workspace, relativePath);
  mkdirSync(join(workspace, "content"), { recursive: true });
  writeFileSync(
    path,
    `<vml id="${compositionId}" title="${compositionId}" fps="30" width="1280" height="720">
  <scene id="scene" title="Scene" />
</vml>
`,
  );
});

Given(
  "a usage ledger for composition {string} env {string} with entries:",
  (compositionId: string, env: string, table: { raw: () => string[][] }) => {
    const ledger = join(workspace, ".babulus", "out", compositionId, "env", env, "usage.jsonl");
    mkdirSync(join(workspace, ".babulus", "out", compositionId, "env", env), { recursive: true });
    writeUsageLedger(ledger, table);
  },
);

When("I run babulus usage summarize for DSL {string} with env {string}", (relativePath: string, env: string) => {
  const dslPath = join(workspace, relativePath);
  const result = spawnSync(
    tsxPath,
    ["src/cli.ts", "usage", "summarize", "--dsl", dslPath, "--project-dir", workspace, "--env", env, "--json"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  exitCode = result.status;
  stdout = result.stdout;
  stderr = result.stderr;
});

Then("the usage CLI exit code should be {int}", (code: number) => {
  assert.equal(exitCode, code);
});

Then("the usage summary json total quantity should be {int}", (quantity: number) => {
  const parsed = JSON.parse(stdout.trim()) as UsageSummary;
  assert.equal(parsed.totalQuantity, quantity);
});

Then("the usage summary json unit {string} quantity should be {int}", (unit: string, quantity: number) => {
  const parsed = JSON.parse(stdout.trim()) as UsageSummary;
  assert.equal(parsed.byUnit[unit]?.quantity, quantity);
});

Then("the usage detail json total quantity should be {int}", (quantity: number) => {
  const parsed = JSON.parse(stdout.trim()) as UsageBreakdown;
  assert.equal(parsed.total.totalQuantity, quantity);
});

Then(
  "the usage detail json provider {string} total quantity should be {int}",
  (provider: string, quantity: number) => {
    const parsed = JSON.parse(stdout.trim()) as UsageBreakdown;
    assert.equal(parsed.byProvider[provider]?.totalQuantity, quantity);
  },
);

Then("the usage detail json kind {string} total quantity should be {int}", (kind: string, quantity: number) => {
  const parsed = JSON.parse(stdout.trim()) as UsageBreakdown;
  assert.equal(parsed.byKind[kind]?.totalQuantity, quantity);
});

Then("the usage CLI output should include {string}", (value: string) => {
  assert.ok(stdout.includes(value), `stdout did not include "${value}".\nstdout:\n${stdout}\nstderr:\n${stderr}`);
});

Then("the usage CLI error output should include {string}", (value: string) => {
  assert.ok(stderr.includes(value), `stderr did not include "${value}".\nstderr:\n${stderr}`);
});

const writeUsageLedger = (path: string, table: { raw: () => string[][] }) => {
  const rows = table.raw();
  const header = rows[0] ?? [];
  const getValue = (row: string[], key: string) => {
    const idx = header.indexOf(key);
    return idx >= 0 ? row[idx] : "";
  };
  const lines = rows.slice(1).map((row) => {
    const entry = {
      timestamp: new Date(0).toISOString(),
      kind: getValue(row, "kind") || "other",
      unitType: getValue(row, "unit") || "chars",
      quantity: Number(getValue(row, "quantity") || 0),
      provider: getValue(row, "provider") || undefined,
      estimatedCost: Number(getValue(row, "estimated") || 0),
      actualCost: Number(getValue(row, "actual") || 0),
    };
    return JSON.stringify(entry);
  });
  writeFileSync(path, lines.join("\n") + "\n");
};
