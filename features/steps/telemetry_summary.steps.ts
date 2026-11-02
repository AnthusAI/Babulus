import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { summarizeUsage } from "../../packages/telemetry/src/index.js";
import type { UsageEvent, UsageSummary, UsageUnitType } from "../../packages/telemetry/src/index.js";

let events: UsageEvent[] = [];
let summary: UsageSummary | undefined;

Given("usage events:", (table: { raw: () => string[][] }) => {
  const rows = table.raw().slice(1);
  events = rows.map(([unit, quantity, estimated, actual]) => ({
    unitType: unit as UsageUnitType,
    quantity: Number(quantity),
    estimatedCost: estimated ? Number(estimated) : 0,
    actualCost: actual ? Number(actual) : 0,
  }));
});

When("I summarize usage", () => {
  summary = summarizeUsage(events);
});

Then("the total quantity should be {int}", (value: number) => {
  assert.equal(summary?.totalQuantity, value);
});

Then("the total estimated cost should be {float}", (value: number) => {
  assert.equal(summary?.totalEstimatedCost, value);
});

Then("the total actual cost should be {float}", (value: number) => {
  assert.equal(summary?.totalActualCost, value);
});

Then("the unit {string} quantity should be {int}", (unit: string, value: number) => {
  const unitSummary = summary?.byUnit[unit as UsageUnitType];
  assert.equal(unitSummary?.quantity, value);
});
