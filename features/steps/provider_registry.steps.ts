import assert from "node:assert/strict";
import YAML from "yaml";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import { getTtsProvider } from "../../src/providers/tts/registry.js";
import { getSfxProvider } from "../../src/providers/sfx/registry.js";
import { getMusicProvider } from "../../src/providers/music/registry.js";
import type { Config } from "../../src/config.js";

let config: Config = {};
let errorMessage: string | null = null;

Before(() => {
  config = {};
  errorMessage = null;
});

Given("a provider config:", (docString: string) => {
  config = (YAML.parse(docString) ?? {}) as Config;
});

When("I resolve tts provider {string}", (name: string) => {
  try {
    getTtsProvider(name, config);
    errorMessage = null;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

When("I resolve sfx provider {string}", (name: string) => {
  try {
    getSfxProvider(name, config);
    errorMessage = null;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

When("I resolve music provider {string}", (name: string) => {
  try {
    getMusicProvider(name, config);
    errorMessage = null;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

Then("the provider error should include {string}", (snippet: string) => {
  assert.ok(errorMessage);
  assert.ok(errorMessage?.includes(snippet));
});
