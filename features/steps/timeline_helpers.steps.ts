import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  getActiveClips,
  buildTimelineLayout,
  summarizeTimeline,
  type ActiveClip,
  type TimelineClipLayout,
  type TimelineData,
  type TimelineSummary,
} from "../../packages/shared/src/timeline.js";

let timeline: TimelineData | null = null;
let summary: TimelineSummary | null = null;
let active: ActiveClip[] = [];
let layout: Array<{ id: string | null; kind: string | null; clips: TimelineClipLayout[] }> = [];

Given("a sample timeline with tracks and clips", () => {
  timeline = {
    audio: {
      tracks: [
        {
          id: "music",
          kind: "music",
          clips: [
            { id: "bed", kind: "music", startSec: 0, durationSec: 10 },
            { id: "swell", kind: "music", startSec: 10, durationSec: 2 },
          ],
        },
        {
          id: "sfx",
          kind: "sfx",
          clips: [{ id: "hit", kind: "sfx", startSec: 4, durationSec: 1 }],
        },
      ],
    },
  };
});

When("I summarize the timeline", () => {
  summary = summarizeTimeline(timeline);
});

When("I find active clips at {float} seconds", (seconds: number) => {
  active = getActiveClips(timeline, seconds);
});

When("I build the timeline layout for duration {float}", (duration: number) => {
  layout = buildTimelineLayout(timeline, duration);
});

Then(
  "the timeline summary should be track count {int} clip count {int} duration {int}",
  (trackCount: number, clipCount: number, durationSec: number) => {
    assert.ok(summary);
    assert.equal(summary.trackCount, trackCount);
    assert.equal(summary.clipCount, clipCount);
    assert.equal(Math.round(summary.durationSec), durationSec);
  },
);

Then("active clips should include {string}", (value: string) => {
  const keys = active.map((entry) => `${entry.trackId ?? entry.trackKind ?? "track"}:${entry.clip.id ?? entry.clip.kind ?? "clip"}`);
  assert.ok(keys.includes(value), `Expected active clips to include ${value}, got ${keys.join(", ")}`);
});

Then("active clips should not include {string}", (value: string) => {
  const keys = active.map((entry) => `${entry.trackId ?? entry.trackKind ?? "track"}:${entry.clip.id ?? entry.clip.kind ?? "clip"}`);
  assert.ok(!keys.includes(value), `Expected active clips not to include ${value}, got ${keys.join(", ")}`);
});

Then(
  "the layout should include clip {string} left {float} width {float}",
  (value: string, expectedLeft: number, expectedWidth: number) => {
    const [trackKey, clipKey] = value.split(":");
    let match: TimelineClipLayout | null = null;
    for (const track of layout) {
      if (track.id !== trackKey && track.kind !== trackKey) {
        continue;
      }
      match = track.clips.find((clip) => clip.id === clipKey || clip.kind === clipKey) ?? null;
      if (match) {
        break;
      }
    }
    assert.ok(match, `Expected to find clip ${value}`);
    const left = Number(match?.leftPct.toFixed(2));
    const width = Number(match?.widthPct.toFixed(2));
    assert.ok(Math.abs(left - expectedLeft) <= 0.2, `Expected left ${expectedLeft} got ${left}`);
    assert.ok(Math.abs(width - expectedWidth) <= 0.2, `Expected width ${expectedWidth} got ${width}`);
  },
);
