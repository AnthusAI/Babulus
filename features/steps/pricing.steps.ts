import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { estimateUsageCost, getRateCard } from "../../src/pricing.js";
import type { RateCard } from "../../src/pricing.js";
import type { Config } from "../../src/config.js";
import type { UsageEntry } from "../../src/telemetry.js";

let rateCard: RateCard | null = null;
let entry: UsageEntry | null = null;
let estimated: number | null = null;
let config: Config | null = null;
let parsedRateCard: RateCard | null = null;
let parseError: Error | null = null;

Given("a rate card:", (docString: string) => {
  rateCard = JSON.parse(docString) as RateCard;
});

Given("a pricing config:", (docString: string) => {
  config = JSON.parse(docString) as Config;
  parsedRateCard = null;
  parseError = null;
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

When("I parse the pricing rate card", () => {
  try {
    parsedRateCard = getRateCard(config ?? {});
  } catch (error) {
    parseError = error as Error;
  }
});

Then("the estimated cost should be {float}", (value: number) => {
  assert.ok(estimated !== null);
  assert.ok(Math.abs(estimated - value) < 1e-9);
});

Then("the estimated cost should be null", () => {
  assert.equal(estimated, null);
});

Then("the parsed rate card should be null", () => {
  assert.equal(parsedRateCard, null);
});

Then("the parsed rate card unit {string} should be {float}", (unit: string, value: number) => {
  assert.ok(parsedRateCard?.units);
  assert.equal(parsedRateCard?.units?.[unit], value);
});

Then(
  "the parsed rate card provider {string} unit {string} should be {float}",
  (provider: string, unit: string, value: number) => {
    assert.ok(parsedRateCard?.providers?.[provider]);
    assert.equal(parsedRateCard?.providers?.[provider]?.units?.[unit], value);
  },
);

Then(
  "the parsed rate card provider {string} kind {string} unit {string} should be {float}",
  (provider: string, kind: string, unit: string, value: number) => {
    assert.ok(parsedRateCard?.providers?.[provider]);
    assert.equal(parsedRateCard?.providers?.[provider]?.kinds?.[kind]?.units?.[unit], value);
  },
);

Then("a pricing parse error should include {string}", (message: string) => {
  assert.ok(parseError, "Expected pricing parse error.");
  assert.ok(parseError?.message.includes(message), `Expected error to include "${message}" but got "${parseError?.message}"`);
});
