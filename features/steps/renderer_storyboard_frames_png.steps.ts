import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import { renderStoryboardFramesPng } from "../../packages/renderer/src/storyboard-frames-png.js";
import { StoryboardRenderer } from "../../packages/renderer/src/storyboard.js";
import type { RenderFramesPngOptions, RenderFramesResult } from "../../packages/renderer/src/render.js";
import type { ScriptData } from "../../packages/shared/src/video.js";
import type { TimelineData } from "../../packages/shared/src/timeline.js";

let script: ScriptData;
let timeline: TimelineData | null = null;
let overrides: {
  fps?: number;
  width?: number;
  height?: number;
  durationFrames?: number;
  title?: string;
  subtitle?: string;
  framePattern?: string;
  scale?: number;
} = {};
let renderCall: RenderFramesPngOptions | null = null;

Before(() => {
  script = { scenes: [] };
  timeline = null;
  overrides = {};
  renderCall = null;
});

Given(
  "a storyboard png frames script with meta fps {int} width {int} height {int} scenes ending at {int}",
  (fps: number, width: number, height: number, endSec: number) => {
    script = {
      fps,
      meta: { width, height },
      scenes: [
        {
          id: "scene-1",
          title: "Scene 1",
          startSec: 0,
          endSec,
          cues: [
            { id: "cue-1", label: "Cue 1", startSec: 0, endSec: Math.min(1, endSec) },
          ],
        },
      ],
    };
  },
);

Given("a storyboard png frames timeline lasting {int} seconds", (durationSec: number) => {
  timeline = {
    audio: {
      tracks: [
        {
          id: "music",
          kind: "music",
          clips: [{ id: "bed", kind: "music", startSec: 0, durationSec }],
        },
      ],
    },
  };
});

Given(
  "storyboard png frames overrides fps {int} width {int} height {int} duration frames {int}",
  (fps: number, width: number, height: number, durationFrames: number) => {
    overrides = {
      ...overrides,
      fps,
      width,
      height,
      durationFrames,
    };
  },
);

Given("storyboard png frames title {string} subtitle {string}", (title: string, subtitle: string) => {
  overrides = { ...overrides, title, subtitle };
});

Given("storyboard png frames pattern {string}", (pattern: string) => {
  overrides = { ...overrides, framePattern: pattern };
});

Given("storyboard png frames scale {int}", (scale: number) => {
  overrides = { ...overrides, scale };
});

When("I render the storyboard png frames", async () => {
  const renderFrames = async (options: RenderFramesPngOptions): Promise<RenderFramesResult> => {
    renderCall = options;
    return { frames: [] };
  };
  await renderStoryboardFramesPng({
    script,
    timeline,
    title: overrides.title,
    subtitle: overrides.subtitle,
    fps: overrides.fps,
    width: overrides.width,
    height: overrides.height,
    durationFrames: overrides.durationFrames,
    framePattern: overrides.framePattern,
    deviceScaleFactor: overrides.scale,
    outDir: "frames",
    renderFrames,
  });
});

Then(
  "the storyboard png frames should render fps {int} width {int} height {int} duration frames {int}",
  (fps: number, width: number, height: number, durationFrames: number) => {
    assert.ok(renderCall);
    assert.equal(renderCall?.config.fps, fps);
    assert.equal(renderCall?.config.width, width);
    assert.equal(renderCall?.config.height, height);
    assert.equal(renderCall?.config.durationFrames, durationFrames);
  },
);

Then("the storyboard png frames should render the storyboard component", () => {
  assert.ok(renderCall);
  assert.equal(renderCall?.component, StoryboardRenderer);
});

Then("the storyboard png frames should pass title {string} subtitle {string}", (title: string, subtitle: string) => {
  assert.ok(renderCall);
  const props = renderCall?.inputProps as Record<string, unknown> | undefined;
  assert.equal(props?.title, title);
  assert.equal(props?.subtitle, subtitle);
});

Then("the storyboard png frames should render pattern {string}", (pattern: string) => {
  assert.ok(renderCall);
  assert.equal(renderCall?.framePattern, pattern);
});

Then("the storyboard png frames should render scale {int}", (scale: number) => {
  assert.ok(renderCall);
  assert.equal(renderCall?.deviceScaleFactor, scale);
});
