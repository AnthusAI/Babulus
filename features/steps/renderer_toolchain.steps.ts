import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import {
  detectRendererToolchain,
  type RendererToolchainOptions,
  type RendererToolchainStatus,
  type PlaywrightPackageInfo,
} from "../../packages/renderer/src/toolchain.js";

let options: RendererToolchainOptions;
let status: RendererToolchainStatus | null = null;

Before(() => {
  options = {};
  status = null;
});

Given("toolchain expects ffmpeg {string}", (version: string) => {
  options.expectedFfmpegVersion = version;
});

Given("toolchain expects playwright {string}", (version: string) => {
  options.expectedPlaywrightVersion = version;
});

Given("toolchain requires ffmpeg", () => {
  options.requireFfmpeg = true;
});

Given("toolchain requires playwright", () => {
  options.requirePlaywright = true;
});

Given("toolchain ffmpeg output {string}", (output: string) => {
  options.runFfmpeg = async () => ({
    stdout: output,
    stderr: "",
    code: 0,
  });
});

Given("toolchain ffmpeg error {string}", (code: string) => {
  const error = new Error("ffmpeg spawn failed") as NodeJS.ErrnoException;
  error.code = code;
  options.runFfmpeg = async () => ({
    stdout: "",
    stderr: "",
    code: null,
    error,
  });
});

Given("toolchain playwright package {string} version {string}", (name: string, version: string) => {
  options.resolvePlaywright = () => ({ name: name as PlaywrightPackageInfo["name"], version });
});

Given("toolchain playwright is missing", () => {
  options.resolvePlaywright = () => null;
});

When("I detect renderer toolchain", async () => {
  status = await detectRendererToolchain(options);
});

Then("the renderer toolchain should be ok", () => {
  assert.ok(status?.ok);
});

Then("the renderer toolchain should not be ok", () => {
  assert.equal(status?.ok, false);
});

Then("the renderer toolchain ffmpeg version should be {string}", (version: string) => {
  assert.equal(status?.ffmpeg.version, version);
});

Then("the renderer toolchain playwright version should be {string}", (version: string) => {
  assert.equal(status?.playwright.version, version);
});

Then("the renderer toolchain issues should include {string}", (snippet: string) => {
  assert.ok(status?.issues.some((issue) => issue.includes(snippet)));
});
