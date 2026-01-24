import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { buildFfmpegArgs, encodeVideo, type EncodeVideoOptions, type EncodeRunner } from "../../packages/renderer/src/index.js";

let encodeConfig: EncodeVideoOptions;
let args: string[] = [];
let runnerCalls: Array<{ command: string; args: string[] }> = [];
let encodeError: string | null = null;

Given(
  "an encode config fps {int} frames dir {string} output {string}",
  (fps: number, framesDir: string, outputPath: string) => {
    encodeConfig = {
      fps,
      framesDir,
      outputPath,
      framePattern: "frame-%06d.png",
      ffmpegPath: "ffmpeg",
    };
    args = [];
    runnerCalls = [];
    encodeError = null;
  },
);

Given("an encode audio path {string}", (audioPath: string) => {
  encodeConfig.audioPath = audioPath;
});

Given("no frame pattern is set", () => {
  delete encodeConfig.framePattern;
});

Given("the frame pattern is {string}", (pattern: string) => {
  encodeConfig.framePattern = pattern;
});

Given("the encode ffmpeg path is {string}", (path: string) => {
  encodeConfig.ffmpegPath = path;
});

When("I build ffmpeg args", () => {
  args = buildFfmpegArgs(encodeConfig);
});

When("I encode with a fake runner", async () => {
  const runner: EncodeRunner = async (command, callArgs) => {
    runnerCalls.push({ command, args: callArgs });
    return { code: 0 };
  };
  await encodeVideo(encodeConfig, runner);
});

When("I encode with a failing runner", async () => {
  const runner: EncodeRunner = async (command, callArgs) => {
    runnerCalls.push({ command, args: callArgs });
    return { code: 1 };
  };
  try {
    await encodeVideo(encodeConfig, runner);
  } catch (error) {
    encodeError = error instanceof Error ? error.message : String(error);
  }
});

When("I encode with a null runner", async () => {
  const runner: EncodeRunner = async (command, callArgs) => {
    runnerCalls.push({ command, args: callArgs });
    return { code: null };
  };
  try {
    await encodeVideo(encodeConfig, runner);
  } catch (error) {
    encodeError = error instanceof Error ? error.message : String(error);
  }
});

When("I encode with a missing ffmpeg runner", async () => {
  const runner: EncodeRunner = async (command, callArgs) => {
    runnerCalls.push({ command, args: callArgs });
    const error = new Error("spawn failed") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    throw error;
  };
  try {
    await encodeVideo(encodeConfig, runner);
  } catch (error) {
    encodeError = error instanceof Error ? error.message : String(error);
  }
});

Then("the args should include {string}", (value: string) => {
  assert.ok(args.includes(value));
});

Then("the args should not include {string}", (value: string) => {
  assert.ok(!args.includes(value));
});

Then("the runner should be called with {string}", (command: string) => {
  assert.equal(runnerCalls.length, 1);
  assert.equal(runnerCalls[0]?.command, command);
});

Then("the encode should fail", () => {
  assert.ok(encodeError);
});

Then("the encode error should include {string}", (value: string) => {
  assert.ok(encodeError?.includes(value));
});
