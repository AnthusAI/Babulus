import assert from "node:assert/strict";
import path from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";
import { loadVideoFile } from "../../src/dsl/load.js";
import { ParseError } from "../../src/errors.js";
import type { VideoFileSpec } from "../../src/dsl/types.js";

let dslPath = "";
let videoSpec: VideoFileSpec | undefined;
let loadError: Error | undefined;

Given("a DSL file at {string}", (relativePath: string) => {
  dslPath = path.resolve(process.cwd(), relativePath);
  videoSpec = undefined;
  loadError = undefined;
});

When("the video file is loaded", async () => {
  try {
    videoSpec = await loadVideoFile(dslPath);
  } catch (error) {
    loadError = error as Error;
  }
});

Then("the loaded composition id should be {string}", (id: string) => {
  assert.equal(videoSpec?.compositions[0]?.id, id);
});

Then("the loaded scene id should be {string}", (id: string) => {
  assert.equal(videoSpec?.compositions[0]?.scenes[0]?.id, id);
});

Then("the loaded cue id should be {string}", (id: string) => {
  const cue = videoSpec?.compositions[0]?.scenes[0]?.items[0];
  if (!cue || cue.kind !== "cue") {
    throw new Error("Expected first scene item to be a cue.");
  }
  assert.equal(cue.id, id);
});

Then("a parse error should be raised", () => {
  assert.ok(loadError, "Expected a parse error.");
  assert.ok(loadError instanceof ParseError, "Expected ParseError instance.");
});
