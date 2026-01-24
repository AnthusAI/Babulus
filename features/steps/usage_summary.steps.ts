import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { summarizeUsageEvents, type UsageSummary, type UsageEvent } from "../../packages/shared/src/index.js";

let usageEvents: UsageEvent[] = [];
let usageSummary: UsageSummary | null = null;

const parseMaybeNumber = (value: string): number | null => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "none") {
    return null;
  }
  return Number(trimmed);
};

Given("usage events", (table: { hashes: () => Array<Record<string, string>> }) => {
  usageEvents = table.hashes().map((row, index) => ({
    id: `usage-${index + 1}`,
    orgId: "org-1",
    videoId: null,
    runId: null,
    provider: null,
    unitType: row.unitType as UsageEvent["unitType"],
    quantity: Number(row.quantity),
    estimatedCost: parseMaybeNumber(row.estimatedCost) ?? null,
    actualCost: parseMaybeNumber(row.actualCost) ?? null,
    createdAt: "2026-01-22T10:00:00.000Z",
  }));
});

When("I summarize usage events", () => {
  usageSummary = summarizeUsageEvents(usageEvents);
});

Then("the usage summary tokens should be {string}", (expected: string) => {
  assert.equal(usageSummary?.tokens, Number(expected));
});

Then("the usage summary seconds should be {string}", (expected: string) => {
  assert.equal(usageSummary?.seconds, Number(expected));
});

Then("the usage summary bytes should be {string}", (expected: string) => {
  assert.equal(usageSummary?.bytes, Number(expected));
});

Then("the usage summary estimated cost should be {string}", (expected: string) => {
  assert.equal(usageSummary?.estimatedCost, Number(expected));
});

Then("the usage summary actual cost should be {string}", (expected: string) => {
  assert.equal(usageSummary?.actualCost, Number(expected));
});
