import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import { deriveVideoConfig, type DerivedVideoConfig, type ScriptData } from "../../packages/shared/src/video.js";
import type { TimelineData } from "../../packages/shared/src/timeline.js";

let script: ScriptData | null = null;
let timeline: TimelineData | null = null;
let derived: DerivedVideoConfig | null = null;

Before(() => {
  script = null;
  timeline = null;
  derived = null;
});

Given(
  "a script with fps {int} width {int} height {int} duration {int}",
  (fps: number, width: number, height: number, duration: number) => {
    script = {
      fps,
      meta: { fps, width, height, durationSeconds: duration },
      scenes: [],
    };
  },
);

Given("the script scenes end at {int} and {int}", (firstEnd: number, secondEnd: number) => {
  const scenes = [
    { id: "scene-1", title: "Scene 1", startSec: 0, endSec: firstEnd, cues: [] },
    { id: "scene-2", title: "Scene 2", startSec: firstEnd, endSec: secondEnd, cues: [] },
  ];
  script = { ...(script ?? {}), scenes };
});

Given("an empty script", () => {
  script = { scenes: [] };
});

Given("no timeline data", () => {
  timeline = null;
});

Given("a timeline duration of {int} seconds", (duration: number) => {
  timeline = {
    audio: {
      tracks: [
        {
          id: "music",
          kind: "music",
          clips: [{ id: "bed", kind: "music", startSec: 0, durationSec: duration }],
        },
      ],
    },
  };
});

When("I derive the video config with defaults fps {int} width {int} height {int}", (fps: number, width: number, height: number) => {
  derived = deriveVideoConfig({
    script,
    timeline,
    defaults: { fps, width, height },
  });
});

Then(
  "the derived config should be fps {int} width {int} height {int} duration {int} frames {int}",
  (fps: number, width: number, height: number, duration: number, frames: number) => {
    assert.ok(derived);
    assert.equal(derived?.fps, fps);
    assert.equal(derived?.width, width);
    assert.equal(derived?.height, height);
    assert.equal(derived?.durationSec, duration);
    assert.equal(derived?.durationFrames, frames);
  },
);
