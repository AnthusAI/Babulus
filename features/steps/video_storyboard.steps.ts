import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import { getActiveCue, getActiveScene, type ScriptData, type ScriptScene, type ScriptCue } from "../../packages/shared/src/video.js";

let script: ScriptData | null = null;
let activeScene: ScriptScene | null = null;
let activeCue: ScriptCue | null = null;

Before(() => {
  script = null;
  activeScene = null;
  activeCue = null;
});

Given("a script with scenes:", (table: { raw: () => string[][] }) => {
  const rows = table.raw();
  const [_header, ...data] = rows;
  const scenes: ScriptScene[] = data.map((row) => ({
    id: row[0],
    title: row[0],
    startSec: Number(row[1]),
    endSec: Number(row[2]),
    cues: [],
  }));
  script = { scenes };
});

Given("scene {string} has cues:", (sceneId: string, table: { raw: () => string[][] }) => {
  const rows = table.raw();
  const [_header, ...data] = rows;
  const cues: ScriptCue[] = data.map((row) => ({
    id: row[0],
    label: row[0],
    startSec: Number(row[1]),
    endSec: Number(row[2]),
  }));
  if (!script) {
    script = { scenes: [] };
  }
  const scenes = script.scenes ?? [];
  const target = scenes.find((scene) => scene.id === sceneId);
  if (!target) {
    scenes.push({ id: sceneId, title: sceneId, startSec: 0, endSec: 0, cues });
  } else {
    target.cues = cues;
  }
  script = { ...script, scenes };
});

When("I find the active scene at {float} seconds", (timeSec: number) => {
  activeScene = getActiveScene(script, timeSec);
});

When("I find the active cue at {float} seconds", (timeSec: number) => {
  activeCue = getActiveCue(script, timeSec);
});

Then("the active scene should be {string}", (sceneId: string) => {
  assert.equal(activeScene?.id, sceneId);
});

Then("the active cue should be {string}", (cueId: string) => {
  assert.equal(activeCue?.id, cueId);
});

Then("there should be no active scene", () => {
  assert.equal(activeScene, null);
});

Then("there should be no active cue", () => {
  assert.equal(activeCue, null);
});
