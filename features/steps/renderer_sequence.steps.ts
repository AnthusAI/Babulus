import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { cleanup, render } from "@testing-library/react";
import React from "react";
import {
  RendererProvider,
  Sequence,
  useRenderContext,
  type VideoConfig,
} from "../../packages/renderer/src/index.js";

let config: VideoConfig;
let frame = 0;
let sequenceFrom = 0;
let sequenceDuration: number | null = null;
let renderResult: ReturnType<typeof render> | null = null;

const ensureDom = () => {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return;
  }
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  globalThis.navigator = dom.window.navigator;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
};

const FrameProbe = () => {
  const ctx = useRenderContext();
  return React.createElement(
    "div",
    { "data-testid": "frame-probe" },
    `frame=${ctx.frame} fps=${ctx.fps} timeMs=${ctx.timeMs}`,
  );
};

Before(() => {
  ensureDom();
  renderResult = null;
  frame = 0;
  sequenceFrom = 0;
  sequenceDuration = null;
});

After(() => {
  cleanup();
});

Given(
  "a render context fps {int} width {int} height {int} duration {int} at frame {int}",
  (fps: number, width: number, height: number, duration: number, atFrame: number) => {
    config = { fps, width, height, durationFrames: duration };
    frame = atFrame;
  },
);

Given("a sequence from {int} duration {int}", (from: number, duration: number) => {
  sequenceFrom = from;
  sequenceDuration = duration;
});

When("I render the sequence", () => {
  renderResult = render(
    React.createElement(
      RendererProvider,
      { frame, config },
      React.createElement(
        Sequence,
        { from: sequenceFrom, durationInFrames: sequenceDuration ?? undefined },
        React.createElement(FrameProbe, null),
      ),
    ),
  );
});

Then("the sequence probe should read {string}", (value: string) => {
  const probe = renderResult?.queryByTestId("frame-probe");
  assert.ok(probe);
  assert.equal(probe.textContent, value);
});

Then("the sequence should be hidden", () => {
  const probe = renderResult?.queryByTestId("frame-probe");
  assert.equal(probe, null);
});
