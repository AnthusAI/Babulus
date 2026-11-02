import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { generateComposition, type GeneratedArtifact } from "../../src/generate.js";
import { computeSha256 } from "../../src/baseline.js";
import type { CompositionSpec } from "../../src/dsl/types.js";
import type { Config } from "../../src/config.js";

let workspace = "";
let envName = "test";
let previousEnv: string | undefined;
let composition: CompositionSpec;
let config: Config = {};
let outDir = "";
let scriptOut = "";
let timelineOut = "";
let dslPath = "";
let results: GeneratedArtifact[] = [];

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-generate-"));
  previousEnv = process.env.BABULUS_ENV;
  envName = "test";
  process.env.BABULUS_ENV = envName;
  results = [];
});

After(() => {
  if (previousEnv === undefined) {
    delete process.env.BABULUS_ENV;
  } else {
    process.env.BABULUS_ENV = previousEnv;
  }
  rmSync(workspace, { recursive: true, force: true });
});

Given("a dry-run composition with audio plan", () => {
  composition = {
    id: "demo",
    meta: { fps: 30, width: 1280, height: 720 },
    voiceover: {
      provider: "dry-run",
      sampleRateHz: 44100,
      pauseBetweenItems: 0,
    },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        markup: { goal: "hook" },
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello world" }],
            bullets: [],
            markup: { approval: "required" },
          },
        ],
      },
    ],
    audioPlan: {
      sfxProvider: "dry-run",
      musicProvider: "dry-run",
      tracks: [
        {
          id: "sfx",
          kind: "sfx",
          clips: [
            {
              id: "click",
              kind: "sfx",
              start: { kind: "cue", cue: { cueId: "cue-1" } },
              prompt: "click",
              variants: 2,
              pick: 1,
            },
          ],
        },
        {
          id: "music",
          kind: "music",
          clips: [
            {
              id: "bed",
              kind: "music",
              start: { kind: "absolute", sec: 0 },
              prompt: "calm bed",
              durationSeconds: 2,
              variants: 1,
              pick: 0,
            },
          ],
        },
      ],
    },
  };
  config = {};
  outDir = join(workspace, ".babulus", "out", composition.id);
  scriptOut = join(workspace, "script.json");
  timelineOut = join(workspace, "timeline.json");
  dslPath = join(workspace, "content", `${composition.id}.babulus.xml`);
});

Given("a dry-run composition with file clip fade out", () => {
  composition = {
    id: "file-clip",
    meta: { fps: 30, width: 1280, height: 720 },
    voiceover: {
      provider: "dry-run",
      sampleRateHz: 44100,
      pauseBetweenItems: 0,
    },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello world" }],
            bullets: [],
          },
        ],
      },
    ],
    audioPlan: {
      tracks: [
        {
          id: "bg",
          kind: "file",
          clips: [
            {
              id: "bed",
              kind: "file",
              start: { kind: "absolute", sec: 0 },
              src: "bed.wav",
              volume: 0.8,
              fadeOut: { volume: 0, beforeEndSeconds: 0.5, fadeDurationSeconds: 0.5 },
            },
          ],
        },
      ],
    },
  };
  config = {};
  outDir = join(workspace, ".babulus", "out", composition.id);
  scriptOut = join(workspace, "script.json");
  timelineOut = join(workspace, "timeline.json");
  dslPath = join(workspace, "content", `${composition.id}.babulus.xml`);
});

When("I generate the composition", async () => {
  const result = await generateComposition({
    composition,
    dslPath,
    scriptOut,
    timelineOut,
    outDir,
    config,
    audioOut: null,
    verboseLogs: false,
  });
  results.push(result);
});

When("I generate the composition again", async () => {
  const result = await generateComposition({
    composition,
    dslPath,
    scriptOut,
    timelineOut,
    outDir,
    config,
    audioOut: null,
    verboseLogs: false,
  });
  results.push(result);
});

Then("the script should include the cue text {string}", (text: string) => {
  assert.ok(existsSync(scriptOut));
  const script = readJson<{ scenes: Array<{ cues: Array<{ text: string; startSec: number; endSec: number }> }> }>(scriptOut);
  assert.equal(script.scenes.length, 1);
  assert.equal(script.scenes[0].cues.length, 1);
  assert.equal(script.scenes[0].cues[0].text, text);
  assert.ok(script.scenes[0].cues[0].endSec > script.scenes[0].cues[0].startSec);
});

Then("the script meta should include width {int} height {int} fps {int}", (width: number, height: number, fps: number) => {
  assert.ok(existsSync(scriptOut));
  const script = readJson<{ meta?: { width?: number; height?: number; fps?: number }; fps?: number }>(scriptOut);
  assert.equal(script.meta?.width, width);
  assert.equal(script.meta?.height, height);
  assert.equal(script.meta?.fps ?? script.fps, fps);
});

Then("the timeline should include tts and audio tracks", () => {
  assert.ok(existsSync(timelineOut));
  const timeline = readJson<{ items: Array<{ type: string }>; audio: { tracks: Array<{ id: string; clips: unknown[] }> } }>(
    timelineOut,
  );
  const ttsItems = timeline.items.filter((item) => item.type === "tts");
  assert.equal(ttsItems.length, 1);
  assert.equal(timeline.audio.tracks.length, 2);
  const sfxTrack = timeline.audio.tracks.find((track) => track.id === "sfx");
  const musicTrack = timeline.audio.tracks.find((track) => track.id === "music");
  assert.ok(sfxTrack);
  assert.ok(musicTrack);
});

Then("the usage breakdown should include {string}", (kind: string) => {
  const detailedPath = join(outDir, "env", envName, "usage-summary-detailed.json");
  assert.ok(existsSync(detailedPath));
  const detailed = readJson<{ byKind: Record<string, unknown> }>(detailedPath);
  assert.ok(detailed.byKind[kind]);
});

Then("the manifest should include segments, sfx, and music", () => {
  const manifestPath = join(outDir, "env", envName, "manifest.json");
  assert.ok(existsSync(manifestPath));
  const manifest = readJson<{ segments: Record<string, unknown>; sfx: Record<string, unknown>; music: Record<string, unknown> }>(
    manifestPath,
  );
  assert.ok(Object.keys(manifest.segments ?? {}).length > 0);
  assert.ok(Object.keys(manifest.sfx ?? {}).length > 0);
  assert.ok(Object.keys(manifest.music ?? {}).length > 0);
});

Then("the script should include scene markup {string} {string}", (key: string, value: string) => {
  assert.ok(existsSync(scriptOut));
  const script = readJson<{ scenes: Array<{ markup?: Record<string, unknown> }> }>(scriptOut);
  assert.equal(script.scenes[0].markup?.[key], value);
});

Then("the script should include cue markup {string} {string}", (key: string, value: string) => {
  assert.ok(existsSync(scriptOut));
  const script = readJson<{ scenes: Array<{ cues: Array<{ markup?: Record<string, unknown> }> }> }>(scriptOut);
  assert.equal(script.scenes[0].cues[0].markup?.[key], value);
});

Then("the run metadata should include script and timeline artifacts", () => {
  const runsDir = join(outDir, "env", envName, "runs");
  const latestPath = join(runsDir, "latest.json");
  assert.ok(existsSync(latestPath));
  const latest = readJson<{ runId: string; runPath: string }>(latestPath);
  assert.ok(latest.runId);
  assert.ok(latest.runPath);
  const runPath = join(outDir, "env", envName, latest.runPath);
  assert.ok(existsSync(runPath));
  const run = readJson<{ artifacts: Array<{ kind: string; path: string; sha256: string }> }>(runPath);
  const script = run.artifacts.find((artifact) => artifact.kind === "script");
  const timeline = run.artifacts.find((artifact) => artifact.kind === "timeline");
  assert.ok(script?.path);
  assert.ok(timeline?.path);
  const runDir = dirname(runPath);
  const scriptPath = join(runDir, script!.path);
  const timelinePath = join(runDir, timeline!.path);
  assert.ok(existsSync(scriptPath));
  assert.ok(existsSync(timelinePath));
  assert.equal(script!.sha256, computeSha256(scriptPath));
  assert.equal(timeline!.sha256, computeSha256(timelinePath));
});

Then("the generation result should include run metadata", () => {
  const latest = results[0];
  assert.ok(latest?.runId);
  assert.ok(latest?.runPath);
  assert.ok(String(latest?.runPath).includes("run.json"));
});

Then("the first generation should synthesize", () => {
  assert.equal(results[0]?.didSynthesize, true);
});

Then("the second generation should use cache", () => {
  assert.equal(results[1]?.didSynthesize, false);
});

Then("the timeline should include a file clip with envelope", () => {
  assert.ok(existsSync(timelineOut));
  const timeline = readJson<{ audio: { tracks: Array<{ clips: Array<{ kind: string; volumeEnvelope?: unknown }> }> } }>(
    timelineOut,
  );
  const clips = timeline.audio.tracks.flatMap((track) => track.clips ?? []);
  const fileClip = clips.find((clip) => clip.kind === "file");
  assert.ok(fileClip);
  assert.ok(fileClip?.volumeEnvelope);
});
