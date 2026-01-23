import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { generateComposition } from "../../src/generate.js";
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
let errorMessage: string | null = null;

Before(() => {
  workspace = mkdtempSync(join(tmpdir(), "babulus-generate-error-"));
  previousEnv = process.env.BABULUS_ENV;
  envName = "test";
  process.env.BABULUS_ENV = envName;
  errorMessage = null;
});

After(() => {
  if (previousEnv === undefined) {
    delete process.env.BABULUS_ENV;
  } else {
    process.env.BABULUS_ENV = previousEnv;
  }
  rmSync(workspace, { recursive: true, force: true });
});

const initPaths = (id: string) => {
  outDir = join(workspace, ".babulus", "out", id);
  scriptOut = join(workspace, "script.json");
  timelineOut = join(workspace, "timeline.json");
  dslPath = join(workspace, "content", `${id}.babulus.ts`);
  config = {};
};

Given("a dry-run composition with lead-in and scene time", () => {
  composition = {
    id: "lead-in",
    voiceover: { provider: "dry-run", leadInSeconds: 1 },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        time: { start: 0, end: 1 },
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
    ],
  };
  initPaths(composition.id);
});

Given("a dry-run composition with duplicate cue ids", () => {
  composition = {
    id: "dup-cue",
    voiceover: { provider: "dry-run" },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "dup",
            label: "Cue A",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
      {
        id: "scene-2",
        title: "Scene 2",
        items: [
          {
            kind: "cue",
            id: "dup",
            label: "Cue B",
            segments: [{ kind: "text", text: "World" }],
            bullets: [],
          },
        ],
      },
    ],
  };
  initPaths(composition.id);
});

Given("a dry-run composition with an audio clip referencing a missing cue", () => {
  composition = {
    id: "missing-cue",
    voiceover: { provider: "dry-run", pauseBetweenItems: 0 },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
    ],
    audioPlan: {
      sfxProvider: "dry-run",
      tracks: [
        {
          id: "sfx",
          kind: "sfx",
          clips: [
            {
              id: "whoosh",
              kind: "sfx",
              start: { kind: "cue", cue: { cueId: "missing" } },
              prompt: "whoosh",
            },
          ],
        },
      ],
    },
  };
  initPaths(composition.id);
});

Given("a dry-run composition with an out-of-range sfx pick", () => {
  composition = {
    id: "bad-sfx-pick",
    voiceover: { provider: "dry-run", pauseBetweenItems: 0 },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
    ],
    audioPlan: {
      sfxProvider: "dry-run",
      tracks: [
        {
          id: "sfx",
          kind: "sfx",
          clips: [
            {
              id: "whoosh",
              kind: "sfx",
              start: { kind: "cue", cue: { cueId: "cue-1" } },
              prompt: "whoosh",
              variants: 1,
              pick: 2,
            },
          ],
        },
      ],
    },
  };
  initPaths(composition.id);
});

Given("a dry-run composition with overlapping scene times", () => {
  composition = {
    id: "overlap-scenes",
    voiceover: { provider: "dry-run" },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        time: { start: 0, end: 2 },
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
      {
        id: "scene-2",
        title: "Scene 2",
        time: { start: 1, end: 3 },
        items: [
          {
            kind: "cue",
            id: "cue-2",
            label: "Cue 2",
            segments: [{ kind: "text", text: "World" }],
            bullets: [],
          },
        ],
      },
    ],
  };
  initPaths(composition.id);
});

Given("a dry-run composition with no cues", () => {
  composition = {
    id: "no-cues",
    voiceover: { provider: "dry-run" },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "pause",
            mode: "fixed",
            seconds: 0.5,
          },
        ],
      },
    ],
  };
  initPaths(composition.id);
});

Given("a dry-run composition with an audio clip referencing a missing scene", () => {
  composition = {
    id: "missing-scene",
    voiceover: { provider: "dry-run", pauseBetweenItems: 0 },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
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
              start: { kind: "scene", scene: { sceneId: "missing" } },
              src: "bed.wav",
            },
          ],
        },
      ],
    },
  };
  initPaths(composition.id);
});

Given("a dry-run composition with a music clip outside scenes", () => {
  composition = {
    id: "music-no-scene",
    voiceover: { provider: "dry-run", pauseBetweenItems: 0 },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
    ],
    audioPlan: {
      musicProvider: "dry-run",
      tracks: [
        {
          id: "music",
          kind: "music",
          clips: [
            {
              id: "bed",
              kind: "music",
              start: { kind: "absolute", sec: 999 },
              prompt: "ambient",
            },
          ],
        },
      ],
    },
  };
  initPaths(composition.id);
});

Given("a dry-run composition with non-positive music duration", () => {
  composition = {
    id: "music-zero",
    voiceover: { provider: "dry-run", pauseBetweenItems: 0 },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
    ],
    audioPlan: {
      musicProvider: "dry-run",
      tracks: [
        {
          id: "music",
          kind: "music",
          clips: [
            {
              id: "bed",
              kind: "music",
              start: { kind: "absolute", sec: 0 },
              prompt: "ambient",
              durationSeconds: 0,
            },
          ],
        },
      ],
    },
  };
  initPaths(composition.id);
});

Given("a dry-run composition with an out-of-range music pick", () => {
  composition = {
    id: "music-pick",
    voiceover: { provider: "dry-run", pauseBetweenItems: 0 },
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        items: [
          {
            kind: "cue",
            id: "cue-1",
            label: "Cue 1",
            segments: [{ kind: "text", text: "Hello" }],
            bullets: [],
          },
        ],
      },
    ],
    audioPlan: {
      musicProvider: "dry-run",
      tracks: [
        {
          id: "music",
          kind: "music",
          clips: [
            {
              id: "bed",
              kind: "music",
              start: { kind: "absolute", sec: 0 },
              prompt: "ambient",
              durationSeconds: 2,
              variants: 1,
              pick: 3,
            },
          ],
        },
      ],
    },
  };
  initPaths(composition.id);
});

When("I attempt to generate the composition", async () => {
  try {
    await generateComposition({
      composition,
      dslPath,
      scriptOut,
      timelineOut,
      outDir,
      config,
      audioOut: null,
      verboseLogs: false,
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

Then("the generation error should include {string}", (snippet: string) => {
  assert.ok(errorMessage);
  assert.ok(errorMessage?.includes(snippet));
});
