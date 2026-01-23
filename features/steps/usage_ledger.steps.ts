import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";
import { createUsageLedger, recordUsage, summarizeUsageFile } from "../../src/telemetry.js";
import type { UsageLedger } from "../../src/telemetry.js";
import type { UsageSummary } from "../../packages/telemetry/src/index.js";

let ledger: UsageLedger;
let summary: UsageSummary | undefined;

Given("a usage ledger", () => {
  const dir = mkdtempSync(join(tmpdir(), "babulus-usage-"));
  ledger = createUsageLedger(join(dir, "usage.jsonl"));
});

When("I record a tts usage of {int} chars", (chars: number) => {
  recordUsage(ledger, {
    kind: "tts",
    unitType: "chars",
    quantity: chars,
    provider: "openai",
  });
});

When("I record a music usage of {int} seconds", (seconds: number) => {
  recordUsage(ledger, {
    kind: "music",
    unitType: "seconds",
    quantity: seconds,
    provider: "elevenlabs",
  });
});

Then("the usage summary total quantity should be {int}", (total: number) => {
  summary = summarizeUsageFile(ledger.path);
  assert.equal(summary.totalQuantity, total);
});

Then("the usage summary unit {string} quantity should be {int}", (unit: string, quantity: number) => {
  summary = summary ?? summarizeUsageFile(ledger.path);
  assert.equal(summary.byUnit[unit as keyof UsageSummary["byUnit"]].quantity, quantity);
});
