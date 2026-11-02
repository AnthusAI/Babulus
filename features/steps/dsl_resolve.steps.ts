import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { defineVideo } from "../../packages/dsl/src/index.js";
import { resolveVideoModule } from "../../packages/dsl/src/resolve.js";
import type { ResolveContext, VideoSpec } from "../../packages/dsl/src/types.js";

const resolveContext: ResolveContext = {
  sources: {
    httpText: async () => "",
    httpJson: async <T = unknown>() => ({}) as T,
  },
  media: {
    image: {
      generate: async () => ({ url: "https://example.com" }),
    },
  },
  publish: {},
};

let moduleExport: unknown;
let resolved: VideoSpec | undefined;
let resolveError: Error | undefined;

Given("a resolver module for {string}", (id: string) => {
  moduleExport = defineVideo(() => ({ id, storyboard: { scenes: [] } }));
});

Given("a raw video spec for {string}", (id: string) => {
  moduleExport = { id, storyboard: { scenes: [] } };
});

When("I resolve the module", async () => {
  resolved = undefined;
  resolveError = undefined;
  try {
    resolved = await resolveVideoModule(moduleExport, resolveContext);
  } catch (error) {
    resolveError = error as Error;
  }
});

Then("the resolved video id should be {string}", (id: string) => {
  assert.equal(resolved?.id, id);
});

Then("the module resolution should fail", () => {
  assert.ok(resolveError);
});

Then("the module resolution error should be {string}", (message: string) => {
  assert.equal(resolveError?.message, message);
});
