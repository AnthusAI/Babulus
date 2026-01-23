import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { validateModuleSource } from "../../packages/dsl/src/ast.js";
import type { AstValidationResult } from "../../packages/dsl/src/ast.js";

let moduleSource: string | undefined;
let result: AstValidationResult | undefined;

Given("a TypeScript module:", (docString: string) => {
  moduleSource = docString;
});

When("I validate the module source", () => {
  result = validateModuleSource(moduleSource ?? "");
});

Then("the module validation should succeed", () => {
  assert.ok(result?.ok);
});

Then("the module validation should fail", () => {
  assert.ok(result && !result.ok);
});

Then("the first module error message should be {string}", (message: string) => {
  assert.ok(result && result.errors.length > 0);
  assert.equal(result.errors[0].message, message);
});

Then("the first module error location should be line {int} column {int}", (line: number, column: number) => {
  assert.ok(result && result.errors.length > 0);
  assert.equal(result.errors[0].line, line);
  assert.equal(result.errors[0].column, column);
});
