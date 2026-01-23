import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { estimateUsageCost } from "../../src/pricing.js";
import type { RateCard } from "../../src/pricing.js";
import type { UsageEntry } from "../../src/telemetry.js";

let rateCard: RateCard | null = null;
let entry: UsageEntry | null = null;
let estimated: number | null = null;

Given("a rate card:", (docString: string) => {
  rateCard = JSON.parse(docString) as RateCard;
});

Given(
  "a usage entry of kind {string} provider {string} unit {string} quantity {int}",
  (kind: UsageEntry["kind"], provider: string, unit: UsageEntry["unitType"], quantity: number) => {
    entry = {
      kind,
      provider,
      unitType: unit,
      quantity,
      timestamp: new Date().toISOString(),
    };
  },
);

When("I estimate usage cost", () => {
  estimated = entry ? estimateUsageCost(entry, rateCard) : null;
});

Then("the estimated cost should be {float}", (value: number) => {
  assert.ok(estimated !== null);
  assert.ok(Math.abs(estimated - value) < 1e-9);
});

Then("the estimated cost should be null", () => {
  assert.equal(estimated, null);
});
