import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import {
  StoryboardRenderer,
  renderStoryboardVideo,
  type RenderFramesPngOptions,
  type RenderFramesResult,
  type EncodeVideoOptions,
  type EncodeRunner,
} from "../../packages/renderer/src/index.js";
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
  audioPath?: string | null;
  framePattern?: string;
  ffmpegPath?: string;
} = {};
let renderCall: RenderFramesPngOptions | null = null;
let encodeCall: EncodeVideoOptions | null = null;

Before(() => {
  script = { scenes: [] };
  timeline = null;
  overrides = {};
  renderCall = null;
  encodeCall = null;
});

Given(
  "a storyboard pipeline script with meta fps {int} width {int} height {int} scenes ending at {int}",
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

Given("a storyboard pipeline timeline lasting {int} seconds", (durationSec: number) => {
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
  "storyboard pipeline overrides fps {int} width {int} height {int} duration frames {int}",
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

Given("storyboard pipeline title {string} subtitle {string}", (title: string, subtitle: string) => {
  overrides = { ...overrides, title, subtitle };
});

Given("storyboard pipeline audio path {string}", (audioPath: string) => {
  overrides = { ...overrides, audioPath };
});

Given("storyboard pipeline frame pattern {string}", (pattern: string) => {
  overrides = { ...overrides, framePattern: pattern };
});

Given("storyboard pipeline ffmpeg path {string}", (path: string) => {
  overrides = { ...overrides, ffmpegPath: path };
});

When("I render the storyboard pipeline", async () => {
  const renderFrames = async (options: RenderFramesPngOptions): Promise<RenderFramesResult> => {
    renderCall = options;
    return { frames: [{ frame: 0, path: `${options.outDir}/frame-000000.png` }] };
  };
  const encode = async (options: EncodeVideoOptions, _runner?: EncodeRunner): Promise<void> => {
    encodeCall = options;
  };
  await renderStoryboardVideo({
    script,
    timeline,
    title: overrides.title,
    subtitle: overrides.subtitle,
    audioPath: overrides.audioPath ?? null,
    framePattern: overrides.framePattern,
    ffmpegPath: overrides.ffmpegPath,
    fps: overrides.fps,
    width: overrides.width,
    height: overrides.height,
    durationFrames: overrides.durationFrames,
    framesDir: "frames",
    outputPath: "video.mp4",
    renderFrames,
    encode,
  });
});

Then(
  "the storyboard pipeline should render fps {int} width {int} height {int} duration frames {int}",
  (fps: number, width: number, height: number, durationFrames: number) => {
    assert.ok(renderCall);
    assert.equal(renderCall?.config.fps, fps);
    assert.equal(renderCall?.config.width, width);
    assert.equal(renderCall?.config.height, height);
    assert.equal(renderCall?.config.durationFrames, durationFrames);
  },
);

Then("the storyboard pipeline should render the storyboard component", () => {
  assert.ok(renderCall);
  assert.equal(renderCall?.component, StoryboardRenderer);
});

Then("the storyboard pipeline should pass title {string} subtitle {string}", (title: string, subtitle: string) => {
  assert.ok(renderCall);
  const props = renderCall?.inputProps as Record<string, unknown> | undefined;
  assert.equal(props?.title, title);
  assert.equal(props?.subtitle, subtitle);
});

Then("the storyboard pipeline should encode audio {string}", (audioPath: string) => {
  assert.ok(encodeCall);
  assert.equal(encodeCall?.audioPath, audioPath);
});

Then("the storyboard pipeline should render pattern {string}", (pattern: string) => {
  assert.ok(renderCall);
  assert.equal(renderCall?.framePattern, pattern);
});

Then("the storyboard pipeline should encode with ffmpeg {string}", (ffmpegPath: string) => {
  assert.ok(encodeCall);
  assert.equal(encodeCall?.ffmpegPath, ffmpegPath);
});
