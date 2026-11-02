import assert from "node:assert/strict";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { getEnvironment, getEnvironmentFallbackChain, resolveEnvCacheDir } from "../../src/env.js";

let originalEnv: string | undefined;
let currentEnv: string | undefined;
let fallbackChain: string[] = [];
let cacheDir: string | undefined;

Before(() => {
  originalEnv = process.env.BABULUS_ENV;
  currentEnv = undefined;
  fallbackChain = [];
  cacheDir = undefined;
});

After(() => {
  if (originalEnv === undefined) {
    delete process.env.BABULUS_ENV;
  } else {
    process.env.BABULUS_ENV = originalEnv;
  }
});

Given("the process environment is unset", () => {
  delete process.env.BABULUS_ENV;
});

Given("the process environment is {string}", (value: string) => {
  process.env.BABULUS_ENV = value;
});

When("I read the active environment", () => {
  currentEnv = getEnvironment();
});

When("I build the fallback chain for {string}", (env: string) => {
  fallbackChain = getEnvironmentFallbackChain(env);
});

When("I resolve the env cache dir for out dir {string} and env {string}", (outDir: string, env: string) => {
  cacheDir = resolveEnvCacheDir(outDir, env);
});

Then("the active environment should be {string}", (expected: string) => {
  assert.equal(currentEnv, expected);
});

Then("the fallback chain should be:", (table: { raw: () => string[][] }) => {
  const expected = table.raw().slice(1).map((row) => row[0]);
  assert.deepEqual(fallbackChain, expected);
});

Then("the env cache dir should be {string}", (expected: string) => {
  assert.equal(cacheDir, expected);
});
