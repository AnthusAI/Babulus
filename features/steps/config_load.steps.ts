import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { getDefaultMusicProvider, getDefaultProvider, getDefaultSfxProvider, getProviderConfig, loadConfig } from "../../src/config.js";

let workspace = "";
let configPath = "";
let previousPath: string | undefined;
let config: Record<string, unknown> | null = null;
let errorMessage: string | null = null;

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-config-"));
  configPath = join(workspace, "config.yml");
  previousPath = process.env.BABULUS_PATH;
  config = null;
  errorMessage = null;
});

After(() => {
  if (previousPath === undefined) {
    delete process.env.BABULUS_PATH;
  } else {
    process.env.BABULUS_PATH = previousPath;
  }
  rmSync(workspace, { recursive: true, force: true });
});

Given("a config file with content:", (docString: string) => {
  writeFileSync(configPath, docString);
});

When("I load the config from BABULUS_PATH", () => {
  process.env.BABULUS_PATH = configPath;
  config = loadConfig();
});

When("I load the config from BABULUS_PATH and capture errors", () => {
  process.env.BABULUS_PATH = configPath;
  try {
    config = loadConfig();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

When("I load the config from BABULUS_PATH and capture errors for provider {string}", (provider: string) => {
  process.env.BABULUS_PATH = configPath;
  try {
    config = loadConfig();
    getProviderConfig(config ?? {}, provider);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

Then("the default provider should be {string}", (value: string) => {
  assert.equal(getDefaultProvider(config ?? {}), value);
});

Then("the default sfx provider should be {string}", (value: string) => {
  assert.equal(getDefaultSfxProvider(config ?? {}), value);
});

Then("the default music provider should be {string}", (value: string) => {
  assert.equal(getDefaultMusicProvider(config ?? {}), value);
});

Then("the provider config for {string} should include {string} = {string}", (provider: string, key: string, value: string) => {
  const cfg = getProviderConfig(config ?? {}, provider);
  assert.equal(String(cfg[key] ?? ""), value);
});

Then("the config error should include {string}", (snippet: string) => {
  assert.ok(errorMessage);
  assert.ok(errorMessage?.includes(snippet));
});
