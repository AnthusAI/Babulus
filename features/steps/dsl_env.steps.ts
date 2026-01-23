import assert from "node:assert/strict";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { defineEnv } from "../../src/dsl/env.js";
import type { EnvResolver } from "../../src/dsl/env.js";

let resolver: EnvResolver | undefined;
let resolvedValue: string | undefined;
let originalEnv: string | undefined;

Before(() => {
  originalEnv = process.env.BABULUS_ENV;
  resolver = undefined;
  resolvedValue = undefined;
});

After(() => {
  if (originalEnv === undefined) {
    delete process.env.BABULUS_ENV;
  } else {
    process.env.BABULUS_ENV = originalEnv;
  }
});

Given("the environment is {string}", (value: string) => {
  process.env.BABULUS_ENV = value;
});

Given("the environment is unset", () => {
  delete process.env.BABULUS_ENV;
});

Given("the fallback list is {string}", (fallback: string) => {
  const names = fallback
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  resolver = defineEnv({ fallback: names });
});

When("I resolve default {string} with overrides:", (defaultValue: string, table: { raw: () => string[][] }) => {
  const rows = table.raw().slice(1);
  const overrides: Record<string, string> = {};
  for (const [env, value] of rows) {
    if (env) {
      overrides[env] = value ?? "";
    }
  }
  const activeResolver = resolver ?? defineEnv();
  resolvedValue = activeResolver.value(defaultValue, overrides);
});

Then("the resolved value should be {string}", (value: string) => {
  assert.equal(resolvedValue, value);
});
