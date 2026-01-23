import assert from "node:assert/strict";
import React from "react";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  renderVideo,
  type RenderVideoOptions,
  type RenderFramesPngOptions,
  type RenderFramesResult,
  type EncodeVideoOptions,
  type EncodeRunner,
} from "../../packages/renderer/src/index.js";

let pipelineConfig: RenderVideoOptions;
let renderCall: RenderFramesPngOptions | null = null;
let encodeCall: EncodeVideoOptions | null = null;
let pipelineAudioPath: string | null = null;
let pipelineFfmpegPath: string | null = null;
let pipelineFramePattern: string | null = null;
let pipelineStartFrame: number | undefined;
let pipelineEndFrame: number | undefined;
let pipelineScale: number | undefined;
let pipelineEncodeRunner: EncodeRunner | null = null;
let encodeRunnerPassed = false;
let pipelineInputProps: Record<string, unknown> = {};
let pipelineRenderEmpty = false;
let pipelineError: string | null = null;
let pipelineFrameCallbackEnabled = false;
let pipelineFrameCallbackCount = 0;
let pipelineFrameCallbackLast: { frame: number; path: string } | null = null;

const DummyComponent = () => React.createElement("div", null, "frame");

Given(
  "a pipeline config fps {int} width {int} height {int} duration {int} frames dir {string} output {string}",
  (fps: number, width: number, height: number, duration: number, framesDir: string, outputPath: string) => {
    pipelineConfig = {
      component: DummyComponent,
      config: { fps, width, height, durationFrames: duration },
      framesDir,
      outputPath,
      framePattern: "frame-%06d.png",
    };
    renderCall = null;
    encodeCall = null;
    pipelineAudioPath = null;
    pipelineFfmpegPath = null;
    pipelineFramePattern = null;
    pipelineStartFrame = undefined;
    pipelineEndFrame = undefined;
    pipelineScale = undefined;
    pipelineEncodeRunner = null;
    encodeRunnerPassed = false;
    pipelineInputProps = {};
    pipelineRenderEmpty = false;
    pipelineError = null;
    pipelineFrameCallbackEnabled = false;
    pipelineFrameCallbackCount = 0;
    pipelineFrameCallbackLast = null;
  },
);

Given("a pipeline audio path {string}", (audioPath: string) => {
  pipelineAudioPath = audioPath;
});

Given("the ffmpeg path is {string}", (ffmpegPath: string) => {
  pipelineFfmpegPath = ffmpegPath;
});

Given("the pipeline frame pattern is {string}", (pattern: string) => {
  pipelineFramePattern = pattern;
});

Given("the pipeline frame range is {int} to {int}", (start: number, end: number) => {
  pipelineStartFrame = start;
  pipelineEndFrame = end;
});

Given("the pipeline scale is {int}", (scale: number) => {
  pipelineScale = scale;
});

Given("a pipeline encode runner is injected", () => {
  pipelineEncodeRunner = async () => ({ code: 0 });
});

Given("the pipeline input prop {string} is {string}", (key: string, value: string) => {
  pipelineInputProps = { ...pipelineInputProps, [key]: value };
});

Given("the pipeline renders no frames", () => {
  pipelineRenderEmpty = true;
});

Given("a pipeline frame callback is registered", () => {
  pipelineFrameCallbackEnabled = true;
  pipelineFrameCallbackCount = 0;
  pipelineFrameCallbackLast = null;
});

When("I run the render pipeline", async () => {
  const renderFrames = async (options: RenderFramesPngOptions): Promise<RenderFramesResult> => {
    renderCall = options;
    if (pipelineRenderEmpty) {
      return { frames: [] };
    }
    if (options.onFrame) {
      options.onFrame(0, `${options.outDir}/frame-000000.png`);
    }
    return { frames: [{ frame: 0, path: `${options.outDir}/frame-000000.png` }] };
  };
  const encode = async (options: EncodeVideoOptions, _runner?: EncodeRunner): Promise<void> => {
    encodeCall = options;
    encodeRunnerPassed = _runner === pipelineEncodeRunner;
  };
  try {
    await renderVideo({
      ...pipelineConfig,
      audioPath: pipelineAudioPath,
      ffmpegPath: pipelineFfmpegPath ?? undefined,
      framePattern: pipelineFramePattern ?? pipelineConfig.framePattern,
      startFrame: pipelineStartFrame,
      endFrame: pipelineEndFrame,
      deviceScaleFactor: pipelineScale,
      inputProps: Object.keys(pipelineInputProps).length ? pipelineInputProps : undefined,
      onFrame: pipelineFrameCallbackEnabled
        ? (frame: number, path: string) => {
            pipelineFrameCallbackCount += 1;
            pipelineFrameCallbackLast = { frame, path };
          }
        : undefined,
      renderFrames,
      encode,
      encodeRunner: pipelineEncodeRunner ?? undefined,
    });
  } catch (error) {
    pipelineError = error instanceof Error ? error.message : String(error);
  }
});

Then("the pipeline should render frames to {string}", (dir: string) => {
  assert.ok(renderCall);
  assert.equal(renderCall?.outDir, dir);
});

Then("the pipeline should encode to {string}", (outPath: string) => {
  assert.ok(encodeCall);
  assert.equal(encodeCall?.outputPath, outPath);
});

Then("the pipeline should encode audio {string}", (audioPath: string) => {
  assert.ok(encodeCall);
  assert.equal(encodeCall?.audioPath, audioPath);
});

Then("the pipeline should encode with ffmpeg {string}", (ffmpegPath: string) => {
  assert.ok(encodeCall);
  assert.equal(encodeCall?.ffmpegPath, ffmpegPath);
});

Then("the pipeline should render with pattern {string}", (pattern: string) => {
  assert.ok(renderCall);
  assert.equal(renderCall?.framePattern, pattern);
});

Then("the pipeline should render frames {int} to {int}", (start: number, end: number) => {
  assert.ok(renderCall);
  assert.equal(renderCall?.startFrame, start);
  assert.equal(renderCall?.endFrame, end);
});

Then("the pipeline should render with scale {int}", (scale: number) => {
  assert.ok(renderCall);
  assert.equal(renderCall?.deviceScaleFactor, scale);
});

Then("the pipeline should pass the encode runner", () => {
  assert.equal(encodeRunnerPassed, true);
});

Then("the pipeline should render input prop {string} {string}", (key: string, value: string) => {
  assert.ok(renderCall);
  const props = renderCall?.inputProps as Record<string, unknown> | undefined;
  assert.equal(props?.[key], value);
});

Then("the pipeline should report a frame callback for frame {int}", (frame: number) => {
  assert.equal(pipelineFrameCallbackCount, 1);
  assert.equal(pipelineFrameCallbackLast?.frame, frame);
});

Then("the pipeline should encode fps {int}", (fps: number) => {
  assert.ok(encodeCall);
  assert.equal(encodeCall?.fps, fps);
});

Then("the pipeline should fail with {string}", (message: string) => {
  assert.ok(pipelineError);
  assert.ok(pipelineError?.includes(message));
});
