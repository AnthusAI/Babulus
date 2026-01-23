import assert from "node:assert/strict";
import { Then, When } from "@cucumber/cucumber";
import {
  clamp,
  easeInOutQuad,
  frameToTimeMs,
  interpolate,
  spring,
  timeMsToFrame,
  type EasingFn,
} from "../../packages/renderer/src/index.js";

let numberResult = 0;
let springResult = 0;

const easingMap: Record<string, EasingFn> = {
  easeInOutQuad,
};

When("I convert frame {int} at {int} fps to time", (frame: number, fps: number) => {
  numberResult = frameToTimeMs(frame, fps);
});

When("I convert time {int} at {int} fps to frame", (timeMs: number, fps: number) => {
  numberResult = timeMsToFrame(timeMs, fps);
});

When("I clamp {int} between {int} and {int}", (value: number, min: number, max: number) => {
  numberResult = clamp(value, min, max);
});

When(
  "I interpolate value {int} from {int} to {int} into {int} to {int}",
  (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    numberResult = interpolate(value, [inMin, inMax], [outMin, outMax]);
  },
);

When(
  "I interpolate value {int} from {int} to {int} into {int} to {int} with clamp",
  (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    numberResult = interpolate(value, [inMin, inMax], [outMin, outMax], { clamp: true });
  },
);

When(
  "I interpolate value {float} from {float} to {float} into {float} to {float} with easing {string}",
  (value: number, inMin: number, inMax: number, outMin: number, outMax: number, easing: string) => {
    const easingFn = easingMap[easing];
    if (!easingFn) {
      throw new Error(`Unknown easing: ${easing}`);
    }
    numberResult = interpolate(value, [inMin, inMax], [outMin, outMax], { easing: easingFn });
  },
);

When("I compute spring from {float} to {float} at frame {int} fps {int}", (from: number, to: number, frame: number, fps: number) => {
  springResult = spring({ frame, fps, config: { from, to } });
});

Then("the time should be {int}", (expected: number) => {
  assert.equal(numberResult, expected);
});

Then("the frame should be {int}", (expected: number) => {
  assert.equal(numberResult, expected);
});

Then("the clamped value should be {int}", (expected: number) => {
  assert.equal(numberResult, expected);
});

Then("the interpolated value should be {float}", (expected: number) => {
  assert.equal(numberResult, expected);
});

Then("the spring value should be {float}", (expected: number) => {
  assert.equal(springResult, expected);
});
