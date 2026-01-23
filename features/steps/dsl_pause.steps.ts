import assert from "node:assert/strict";
import { When, Then } from "@cucumber/cucumber";
import { isPauseSpec, normalizePause, pause } from "../../src/dsl/pause.js";
import type { PauseSpec } from "../../src/dsl/types.js";

let pauseSpec: PauseSpec | undefined;
let pauseValidity: boolean | undefined;

When("I create a fixed pause of {float} seconds", (seconds: number) => {
  pauseSpec = pause(seconds);
});

When(
  "I create a gaussian pause with mean {float} std {float} min {float} max {float}",
  (mean: number, std: number, min: number, max: number) => {
    pauseSpec = pause(mean, std, { min, max });
  },
);

When("I normalize a pause value of {float}", (seconds: number) => {
  pauseSpec = normalizePause(seconds);
});

When("I check if a fixed pause of {float} seconds is valid", (seconds: number) => {
  pauseValidity = isPauseSpec(pause(seconds));
});

When("I check if an invalid pause value is valid", () => {
  pauseValidity = isPauseSpec({ kind: "pause", mode: "oops" } as PauseSpec);
});

Then("the pause spec should be fixed with seconds {float}", (seconds: number) => {
  assert.ok(pauseSpec);
  assert.equal(pauseSpec.kind, "pause");
  assert.equal(pauseSpec.mode, "fixed");
  assert.equal(pauseSpec.seconds, seconds);
});

Then(
  "the pause spec should be gaussian with mean {float} std {float} min {float} max {float}",
  (mean: number, std: number, min: number, max: number) => {
    assert.ok(pauseSpec);
    assert.equal(pauseSpec.kind, "pause");
    assert.equal(pauseSpec.mode, "gaussian");
    assert.equal(pauseSpec.mean, mean);
    assert.equal(pauseSpec.std, std);
    assert.equal(pauseSpec.min ?? null, min);
    assert.equal(pauseSpec.max ?? null, max);
  },
);

Then("the pause validity should be {word}", (value: string) => {
  assert.equal(pauseValidity, value === "true");
});
