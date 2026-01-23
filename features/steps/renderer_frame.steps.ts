import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import React from "react";
import { After, Given, Then, When } from "@cucumber/cucumber";
import {
  renderFrameToFile,
  renderFrameToHtml,
  renderFrameToPng,
  renderFramesToHtml,
  renderFramesToPng,
  useRenderContext,
  type VideoConfig,
} from "../../packages/renderer/src/index.js";

let config: VideoConfig;
let htmlOutput = "";
let htmlPath = "";
let workspace = "";
let pngPath = "";
let pngBuffer: Buffer | null = null;
let lastViewport: { width: number; height: number; deviceScaleFactor?: number } | null = null;
let frameScale = 1;
let sequenceDir = "";
let sequenceFrames: Array<{ frame: number; path: string }> = [];
let sequencePattern = "frame-%06d.png";
let sequenceScale = 1;
let htmlSequenceDir = "";
let htmlSequenceFrames: Array<{ frame: number; path: string }> = [];
let pngSequenceCallbacks: Array<{ frame: number; path: string }> = [];
let htmlSequenceCallbacks: Array<{ frame: number; path: string }> = [];
let trackPngCallbacks = false;
let trackHtmlCallbacks = false;
let autoCloseEnabled = false;
let browserClosed = false;

const FrameProbe = () => {
  const ctx = useRenderContext();
  return React.createElement(
    "div",
    { "data-testid": "frame-probe" },
    `frame=${ctx.frame} fps=${ctx.fps} timeMs=${ctx.timeMs}`,
  );
};

Given(
  "a render config fps {int} width {int} height {int} duration {int}",
  (fps: number, width: number, height: number, duration: number) => {
    config = { fps, width, height, durationFrames: duration };
  },
);

Given("the frame scale is {int}", (scale: number) => {
  frameScale = scale;
});

Given("the sequence pattern is {string}", (pattern: string) => {
  sequencePattern = pattern;
});

Given("the sequence scale is {int}", (scale: number) => {
  sequenceScale = scale;
});

Given("the browser auto close is enabled", () => {
  autoCloseEnabled = true;
});

Given("PNG sequence callbacks are tracked", () => {
  trackPngCallbacks = true;
  pngSequenceCallbacks = [];
});

Given("HTML sequence callbacks are tracked", () => {
  trackHtmlCallbacks = true;
  htmlSequenceCallbacks = [];
});

When("I render frame {int} to HTML", (frame: number) => {
  htmlOutput = renderFrameToHtml({ component: FrameProbe, config, frame });
});

When("I render frame {int} to an HTML file", (frame: number) => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-render-"));
  htmlPath = join(workspace, "frame.html");
  htmlOutput = renderFrameToFile({ component: FrameProbe, config, frame, outPath: htmlPath });
});

When("I render frame {int} to a PNG file", async (frame: number) => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-render-"));
  pngPath = join(workspace, "frame.png");
  const fakePage = {
    setViewport: async (viewport: { width: number; height: number; deviceScaleFactor?: number }) => {
      lastViewport = viewport;
    },
    setContent: async (_html: string) => {
      return;
    },
    screenshot: async () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    close: async () => {
      return;
    },
  };
  const fakeBrowser = {
    newPage: async () => fakePage,
    close: async () => {
      browserClosed = true;
      return;
    },
  };
  pngBuffer = await renderFrameToPng({
    component: FrameProbe,
    config,
    frame,
    outPath: pngPath,
    deviceScaleFactor: frameScale,
    browser: fakeBrowser,
    autoClose: autoCloseEnabled,
  });
});

When("I render frames {int} through {int} to a PNG sequence", async (start: number, end: number) => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-render-"));
  sequenceDir = join(workspace, "frames");
  const fakePage = {
    setViewport: async (viewport: { width: number; height: number; deviceScaleFactor?: number }) => {
      lastViewport = viewport;
    },
    setContent: async (_html: string) => {
      return;
    },
    screenshot: async () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    close: async () => {
      return;
    },
  };
  const fakeBrowser = {
    newPage: async () => fakePage,
    close: async () => {
      browserClosed = true;
      return;
    },
  };
  const result = await renderFramesToPng({
    component: FrameProbe,
    config,
    startFrame: start,
    endFrame: end,
    outDir: sequenceDir,
    framePattern: sequencePattern,
    deviceScaleFactor: sequenceScale,
    browser: fakeBrowser,
    autoClose: autoCloseEnabled,
    onFrame: trackPngCallbacks
      ? (frameNumber: number, path: string) => {
          pngSequenceCallbacks.push({ frame: frameNumber, path });
        }
      : undefined,
  });
  sequenceFrames = result.frames;
});

When("I render frames {int} through {int} to an HTML sequence", (start: number, end: number) => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-render-"));
  htmlSequenceDir = join(workspace, "html");
  const result = renderFramesToHtml({
    component: FrameProbe,
    config,
    startFrame: start,
    endFrame: end,
    outDir: htmlSequenceDir,
    onFrame: trackHtmlCallbacks
      ? (frameNumber: number, path: string) => {
          htmlSequenceCallbacks.push({ frame: frameNumber, path });
        }
      : undefined,
  });
  htmlSequenceFrames = result.frames;
});

Then("the HTML should include {string}", (snippet: string) => {
  assert.ok(htmlOutput.includes(snippet));
});

Then("the HTML file should include {string}", (snippet: string) => {
  const content = readFileSync(htmlPath, "utf8");
  assert.ok(content.includes(snippet));
});

Then("the PNG file should include the PNG header", () => {
  const content = readFileSync(pngPath);
  assert.ok(content.length >= 8);
  assert.deepEqual(content.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  assert.ok(pngBuffer);
});

Then("the render viewport should be {int}x{int}", (width: number, height: number) => {
  assert.ok(lastViewport);
  assert.equal(lastViewport?.width, width);
  assert.equal(lastViewport?.height, height);
});

Then("the render scale should be {int}", (scale: number) => {
  assert.ok(lastViewport);
  assert.equal(lastViewport?.deviceScaleFactor, scale);
});

Then("the browser should be closed", () => {
  assert.equal(browserClosed, true);
});

Then("the PNG sequence should include {int} files", (count: number) => {
  assert.equal(sequenceFrames.length, count);
  for (const frame of sequenceFrames) {
    const content = readFileSync(frame.path);
    assert.ok(content.length >= 8);
  }
});

Then("the PNG sequence should include {string}", (fileName: string) => {
  assert.ok(sequenceFrames.some((frame) => frame.path.endsWith(fileName)));
});

Then("the HTML sequence should include {int} files", (count: number) => {
  assert.equal(htmlSequenceFrames.length, count);
  for (const frame of htmlSequenceFrames) {
    const content = readFileSync(frame.path, "utf8");
    assert.ok(content.includes("<!doctype html>"));
  }
});

Then("the HTML sequence should include {string}", (fileName: string) => {
  assert.ok(htmlSequenceFrames.some((frame) => frame.path.endsWith(fileName)));
});

Then("the PNG frame callbacks should be called {int} times", (count: number) => {
  assert.equal(pngSequenceCallbacks.length, count);
});

Then("the PNG frame callbacks should include frame {int}", (frame: number) => {
  assert.ok(pngSequenceCallbacks.some((entry) => entry.frame === frame));
});

Then("the HTML frame callbacks should be called {int} times", (count: number) => {
  assert.equal(htmlSequenceCallbacks.length, count);
});

Then("the HTML frame callbacks should include frame {int}", (frame: number) => {
  assert.ok(htmlSequenceCallbacks.some((entry) => entry.frame === frame));
});

After(() => {
  if (workspace) {
    rmSync(workspace, { recursive: true, force: true });
  }
  workspace = "";
  htmlPath = "";
  pngPath = "";
  pngBuffer = null;
  lastViewport = null;
  frameScale = 1;
  sequenceDir = "";
  sequenceFrames = [];
  sequencePattern = "frame-%06d.png";
  sequenceScale = 1;
  htmlSequenceDir = "";
  htmlSequenceFrames = [];
  pngSequenceCallbacks = [];
  htmlSequenceCallbacks = [];
  trackPngCallbacks = false;
  trackHtmlCallbacks = false;
  autoCloseEnabled = false;
  browserClosed = false;
});
