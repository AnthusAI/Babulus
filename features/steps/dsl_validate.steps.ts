import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { validateVideoSpec, type ValidationResult } from "../../packages/dsl/src/validate.js";

let spec: unknown = null;
let result: ValidationResult | null = null;

const buildValidSpec = () => ({
  id: "demo",
  template: { id: "default", version: "1" },
  composition: { fps: 30, width: 1920, height: 1080, durationFrames: 90 },
  storyboard: {
    scenes: [
      {
        id: "scene-1",
        componentId: "TitleScene",
        cues: [
          {
            id: "cue-1",
            content: [{ kind: "say", text: "Hello world" }],
            audio: [{ kind: "sfx", id: "whoosh" }],
            markup: { goal: "hook" },
          },
        ],
        markup: { section: "intro" },
      },
    ],
  },
  publish: { slug: "intro", page: { title: "Intro" } },
  markup: { audience: "developers" },
});

Given("a valid video spec", () => {
  spec = buildValidSpec();
});

Given("a video spec without an id", () => {
  const value = buildValidSpec() as Record<string, unknown>;
  delete value.id;
  spec = value;
});

Given("a video spec with invalid storyboard scenes", () => {
  const value = buildValidSpec() as Record<string, unknown>;
  value.storyboard = { scenes: "nope" };
  spec = value;
});

Given("a video spec with invalid cue content", () => {
  const value = buildValidSpec() as any;
  value.storyboard.scenes[0].cues[0].content = [{ kind: "say" }];
  spec = value;
});

Given("a video spec with invalid cue markup", () => {
  const value = buildValidSpec() as any;
  value.storyboard.scenes[0].cues[0].markup = { tags: { nested: true } };
  spec = value;
});

When("I validate the video spec", () => {
  result = validateVideoSpec(spec);
});

Then("the validation should succeed", () => {
  assert.ok(result);
  assert.equal(result?.ok, true);
  assert.equal(result?.errors.length, 0);
});

Then("the validation should fail with path {string}", (path: string) => {
  assert.ok(result);
  assert.equal(result?.ok, false);
  const match = result?.errors.find((err) => err.path === path);
  assert.ok(match, `Expected error path ${path}, got ${result?.errors.map((err) => err.path).join(", ")}`);
});
