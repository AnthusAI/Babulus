import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import { renderFrameToHtml, type VideoConfig, StoryboardRenderer } from "../../packages/renderer/src/index.js";
import type { ScriptData } from "../../packages/shared/src/video.js";

let config: VideoConfig;
let script: ScriptData;
let html = "";

Before(() => {
  config = { fps: 30, width: 1280, height: 720, durationFrames: 300 };
  script = { scenes: [] };
  html = "";
});

Given("a storyboard script with scenes and cues", () => {
  script = {
    scenes: [
      {
        id: "intro",
        title: "Intro Scene",
        startSec: 0,
        endSec: 3,
        cues: [
          { id: "cue-1", label: "Hello", text: "Hello", startSec: 0, endSec: 1 },
          { id: "cue-2", label: "World", text: "World", startSec: 1, endSec: 3 },
        ],
      },
    ],
  };
});

Given(
  "a storyboard render config fps {int} width {int} height {int} duration {int}",
  (fps: number, width: number, height: number, duration: number) => {
    config = { fps, width, height, durationFrames: duration };
  },
);

When("I render the storyboard at frame {int}", (frame: number) => {
  html = renderFrameToHtml({
    component: StoryboardRenderer,
    config,
    frame,
    inputProps: { script },
  });
});

Then("the storyboard HTML should include {string}", (snippet: string) => {
  assert.ok(html.includes(snippet));
});
