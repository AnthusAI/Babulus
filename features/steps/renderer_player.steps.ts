import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { act } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { Player, useRenderContext, type VideoConfig } from "../../packages/renderer/src/index.js";

type RafState = {
  callbacks: Map<number, (time: number) => void>;
  nextId: number;
  time: number;
};

let config: VideoConfig;
let initialFrame = 0;
let autoplay = false;
let loop = false;
let renderResult: ReturnType<typeof render> | null = null;
let rafState: RafState | null = null;
let originalRaf: typeof globalThis.requestAnimationFrame | undefined;
let originalCancel: typeof globalThis.cancelAnimationFrame | undefined;

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

const installRaf = () => {
  originalRaf = globalThis.requestAnimationFrame;
  originalCancel = globalThis.cancelAnimationFrame;
  rafState = { callbacks: new Map(), nextId: 1, time: 0 };
  globalThis.requestAnimationFrame = (cb: (time: number) => void): number => {
    if (!rafState) {
      return 0;
    }
    const id = rafState.nextId++;
    rafState.callbacks.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id: number): void => {
    rafState?.callbacks.delete(id);
  };
};

const uninstallRaf = () => {
  globalThis.requestAnimationFrame = originalRaf ?? globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancel ?? globalThis.cancelAnimationFrame;
  rafState = null;
};

const advanceTime = async (deltaMs: number) => {
  if (!rafState) {
    return;
  }
  rafState.time += deltaMs;
  const callbacks = Array.from(rafState.callbacks.values());
  rafState.callbacks.clear();
  await act(async () => {
    for (const cb of callbacks) {
      cb(rafState.time);
    }
  });
};

Before(() => {
  ensureDom();
  installRaf();
  autoplay = false;
  loop = false;
  initialFrame = 0;
  renderResult = null;
});

After(() => {
  cleanup();
  uninstallRaf();
});

Given(
  "a player config fps {int} width {int} height {int} duration {int} starting at frame {int}",
  (fps: number, width: number, height: number, duration: number, frame: number) => {
    config = { fps, width, height, durationFrames: duration };
    initialFrame = frame;
  },
);

Given("autoplay is enabled", () => {
  autoplay = true;
});

Given("looping is enabled", () => {
  loop = true;
});

When("I render the player", async () => {
  renderResult = render(
    React.createElement(Player, {
      component: FrameProbe,
      config,
      initialFrame,
      autoplay,
      loop,
    }),
  );
  await advanceTime(0);
});

When("I seek to frame {int}", async (frame: number) => {
  const slider = renderResult?.getByRole("slider") ?? null;
  if (!slider) {
    throw new Error("Player not rendered");
  }
  await act(async () => {
    (slider as unknown as { value: string }).value = String(frame);
    fireEvent.input(slider, { target: { value: String(frame) } });
    fireEvent.change(slider, { target: { value: String(frame) } });
  });
});

When("I advance time by {int} ms", async (ms: number) => {
  await advanceTime(ms);
});

Then("the frame probe should read {string}", (value: string) => {
  const probe = renderResult?.getByTestId("frame-probe");
  if (!probe) {
    throw new Error("Player not rendered");
  }
  assert.equal(probe.textContent, value);
});

Then("the player should be paused", () => {
  const button = renderResult?.getByRole("button");
  if (!button) {
    throw new Error("Player not rendered");
  }
  assert.equal(button.textContent, "Play");
});
