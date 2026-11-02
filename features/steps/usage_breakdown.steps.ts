import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { summarizeUsageEntriesDetailed } from "../../src/telemetry.js";
import type { UsageBreakdown, UsageEntry } from "../../src/telemetry.js";
import type { UsageUnitType } from "../../packages/telemetry/src/index.js";

let entries: UsageEntry[] = [];
let summary: UsageBreakdown | undefined;

Given("usage entries:", (table: { raw: () => string[][] }) => {
  const rows = table.raw().slice(1);
  entries = rows.map(([kind, provider, unit, quantity]) => ({
    kind: kind as UsageEntry["kind"],
    provider,
    unitType: unit as UsageUnitType,
    quantity: Number(quantity),
    timestamp: new Date().toISOString(),
  }));
});

When("I summarize usage breakdown", () => {
  summary = summarizeUsageEntriesDetailed(entries);
});

Then("the provider {string} unit {string} quantity should be {int}", (provider: string, unit: string, quantity: number) => {
  const byProvider = summary?.byProvider[provider];
  assert.equal(byProvider?.byUnit[unit as UsageUnitType].quantity, quantity);
});

Then("the kind {string} unit {string} quantity should be {int}", (kind: string, unit: string, quantity: number) => {
  const byKind = summary?.byKind[kind];
  assert.equal(byKind?.byUnit[unit as UsageUnitType].quantity, quantity);
});
