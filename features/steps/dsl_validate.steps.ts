import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { validateVideoSpec } from "../../packages/dsl/src/validate.js";
import type { ValidationResult } from "../../packages/dsl/src/validate.js";

let spec: unknown;
let result: ValidationResult | undefined;

Given("a video spec:", (docString: string) => {
  spec = JSON.parse(docString);
});

When("I validate the video spec", () => {
  result = validateVideoSpec(spec);
});

Then("the validation should succeed", () => {
  assert.ok(result?.ok);
});

Then("the validation should fail", () => {
  assert.ok(result && !result.ok);
});

Then("the validation error path should be {string}", (path: string) => {
  assert.ok(result && result.errors.length > 0);
  assert.equal(result.errors[0].path, path);
});
