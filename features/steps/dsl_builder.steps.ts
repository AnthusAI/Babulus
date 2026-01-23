import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { defineVideo } from "../../src/dsl/builder.js";
import { defineDefaults } from "../../src/dsl/builder.js";
import type {
  AudioClipSpec,
  AudioTrackSpec,
  CompositionDefaults,
  CueSpec,
  PauseSpec,
  VideoFileSpec,
} from "../../src/dsl/types.js";

let compositionName = "";
let sceneName = "";
let cueName = "";
let cueText = "";
let includeDefaults = false;
let compositionDefaults: CompositionDefaults | undefined;
let compositionMetaOverrides: CompositionDefaults["meta"] | undefined;
let compositionVoiceOverrides: CompositionDefaults["voiceover"] | undefined;
let includePause = false;
let pauseSeconds = 0;
let includeGaussianPause = false;
let gaussianPauseMean = 0;
let gaussianPauseStd = 0;
let includeSfx = false;
let sfxId = "";
let includeMusic = false;
let musicId = "";
let musicOffsetSeconds = 0;
let includeVoicePause = false;
let voicePauseSeconds = 0;
let includeVoiceTrim = false;
let voiceTrimSeconds = 0;
let includeBullets = false;
let cueBullets: string[] = [];
let cueProvider: string | undefined;
let videoSpec: VideoFileSpec | undefined;

const resetState = () => {
  includeDefaults = false;
  compositionDefaults = undefined;
  compositionMetaOverrides = undefined;
  compositionVoiceOverrides = undefined;
  includePause = false;
  pauseSeconds = 0;
  includeGaussianPause = false;
  gaussianPauseMean = 0;
  gaussianPauseStd = 0;
  includeSfx = false;
  sfxId = "";
  includeMusic = false;
  musicId = "";
  musicOffsetSeconds = 0;
  includeVoicePause = false;
  voicePauseSeconds = 0;
  includeVoiceTrim = false;
  voiceTrimSeconds = 0;
  includeBullets = false;
  cueBullets = [];
  cueProvider = undefined;
};

Given("a video with a composition named {string}", (name: string) => {
  resetState();
  compositionName = name;
});

Given(
  "the composition has a scene named {string} with a cue {string} saying {string}",
  (scene: string, cue: string, text: string) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
  },
);

Given(
  "the composition has a scene named {string} with a {float} second pause and a cue {string} saying {string}",
  (scene: string, seconds: number, cue: string, text: string) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    includePause = true;
    pauseSeconds = seconds;
  },
);

Given(
  "the composition has a scene named {string} with a cue {string} saying {string} and an sfx clip {string}",
  (scene: string, cue: string, text: string, clipId: string) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    includeSfx = true;
    sfxId = clipId;
  },
);

Given(
  "the composition has a scene named {string} with a gaussian pause of {float} seconds and std {float} and a cue {string} saying {string}",
  (scene: string, mean: number, std: number, cue: string, text: string) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    includeGaussianPause = true;
    gaussianPauseMean = mean;
    gaussianPauseStd = std;
  },
);

Given(
  "the composition has a scene named {string} with a cue {string} saying {string} and a {float} second voice pause",
  (scene: string, cue: string, text: string, seconds: number) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    includeVoicePause = true;
    voicePauseSeconds = seconds;
  },
);

Given(
  "the composition has a scene named {string} with a cue {string} saying {string} and a music clip {string} starting at {float} seconds",
  (scene: string, cue: string, text: string, clipId: string, offset: number) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    includeMusic = true;
    musicId = clipId;
    musicOffsetSeconds = offset;
  },
);

Given(
  "the defaults include meta fps {int} width {int} height {int} and voiceover provider {string} voice {string}",
  (fps: number, width: number, height: number, provider: string, voice: string) => {
    includeDefaults = true;
    compositionDefaults = defineDefaults({
      meta: { fps, width, height },
      voiceover: { provider, voice },
    });
  },
);

Given("the composition overrides width {int} and voice {string}", (width: number, voice: string) => {
  compositionMetaOverrides = { width };
  compositionVoiceOverrides = { voice };
});

Given(
  "the composition has a scene named {string} with a cue {string} saying {string} and bullets:",
  (scene: string, cue: string, text: string, table: { raw: () => string[][] }) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    includeBullets = true;
    cueBullets = table.raw().slice(1).map((row) => row[0]).filter(Boolean);
  },
);

Given(
  "the composition has a scene named {string} with a cue {string} saying {string} trimmed by {float} seconds",
  (scene: string, cue: string, text: string, seconds: number) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    includeVoiceTrim = true;
    voiceTrimSeconds = seconds;
  },
);

Given(
  "the composition has a scene named {string} with a cue {string} saying {string} using provider {string}",
  (scene: string, cue: string, text: string, provider: string) => {
    sceneName = scene;
    cueName = cue;
    cueText = text;
    cueProvider = provider;
  },
);

When("the video spec is built", async () => {
  const result = defineVideo((video) => {
    const compositionOptions: CompositionDefaults = {};
    if (compositionMetaOverrides) {
      compositionOptions.meta = compositionMetaOverrides;
    }
    if (compositionVoiceOverrides) {
      compositionOptions.voiceover = compositionVoiceOverrides;
    }
    const compositionBuilder = (composition: { use: (defaults: CompositionDefaults) => void; scene: any }) => {
      if (includeDefaults && compositionDefaults) {
        composition.use(compositionDefaults);
      }
      composition.scene(sceneName, (scene) => {
        if (includeGaussianPause) {
          scene.pause(gaussianPauseMean, gaussianPauseStd);
        } else if (includePause) {
          scene.pause(pauseSeconds);
        }
        const cueBuilder = (cue: {
          voice: (fn: (voice: { say: (text: string, opts?: { trimEndSeconds?: number }) => void; pause: (seconds: number) => void }) => void) => void;
          bullets: (items: string[]) => void;
        }) => {
          cue.voice((voice) => {
            if (includeVoiceTrim) {
              voice.say(cueText, { trimEndSeconds: voiceTrimSeconds });
            } else {
              voice.say(cueText);
            }
            if (includeVoicePause) {
              voice.pause(voicePauseSeconds);
            }
          });
          if (includeBullets) {
            cue.bullets(cueBullets);
          }
        };
        if (cueProvider) {
          scene.cue(cueName, { provider: cueProvider }, cueBuilder);
        } else {
          scene.cue(cueName, cueBuilder);
        }
        if (includeSfx) {
          scene.sfx(sfxId, {});
        }
        if (includeMusic) {
          scene.music(musicId, { at: musicOffsetSeconds });
        }
      });
    };
    if (Object.keys(compositionOptions).length > 0) {
      video.composition(compositionName, compositionOptions, compositionBuilder);
    } else {
      video.composition(compositionName, compositionBuilder);
    }
  });
  videoSpec = await Promise.resolve(result);
});

Then("the composition id should be {string}", (id: string) => {
  assert.equal(videoSpec?.compositions[0]?.id, id);
});

Then("the scene id should be {string}", (id: string) => {
  assert.equal(videoSpec?.compositions[0]?.scenes[0]?.id, id);
});

Then("the cue id should be {string}", (id: string) => {
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0];
  const cue = item as CueSpec;
  assert.equal(cue.id, id);
});

Then("the cue text should be {string}", (text: string) => {
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as CueSpec;
  const segment = item.segments[0];
  if (segment?.kind !== "text") {
    throw new Error("Expected first segment to be text.");
  }
  assert.equal(segment.text, text);
});

Then("the cue label should be {string}", (label: string) => {
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as CueSpec;
  assert.equal(item.label, label);
});

Then("the first scene item should be a fixed pause of {float} seconds", (seconds: number) => {
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as PauseSpec;
  assert.equal(item.kind, "pause");
  assert.equal(item.mode, "fixed");
  assert.equal(item.seconds, seconds);
});

Then(
  "the first scene item should be a gaussian pause with mean {float} and std {float}",
  (mean: number, std: number) => {
    const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as PauseSpec;
    assert.equal(item.kind, "pause");
    assert.equal(item.mode, "gaussian");
    assert.equal(item.mean, mean);
    assert.equal(item.std, std);
  },
);

Then("the first audio track should be {string}", (kind: string) => {
  const track = videoSpec?.compositions[0]?.audioPlan?.tracks[0] as AudioTrackSpec;
  assert.equal(track.kind, kind);
});

Then("the first audio clip id should be {string}", (id: string) => {
  const track = videoSpec?.compositions[0]?.audioPlan?.tracks[0] as AudioTrackSpec;
  const clip = track.clips[0] as AudioClipSpec;
  assert.equal(clip.id, id);
});

Then("the audio clip should start at scene offset {float}", (offset: number) => {
  const track = videoSpec?.compositions[0]?.audioPlan?.tracks[0] as AudioTrackSpec;
  const clip = track.clips[0] as AudioClipSpec;
  if (clip.start.kind !== "scene") {
    throw new Error("Expected audio clip to start at scene.");
  }
  assert.equal(clip.start.scene.offsetSec ?? 0, offset);
});

Then("the second voice segment should be a fixed pause of {float} seconds", (seconds: number) => {
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as CueSpec;
  const segment = item.segments[1];
  if (!segment || segment.kind !== "pause") {
    throw new Error("Expected second segment to be a pause.");
  }
  assert.equal(segment.pause.mode, "fixed");
  assert.equal(segment.pause.seconds, seconds);
});

Then("the first voice segment should have trim end seconds {float}", (seconds: number) => {
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as CueSpec;
  const segment = item.segments[0];
  if (!segment || segment.kind !== "text") {
    throw new Error("Expected first segment to be text.");
  }
  assert.equal(segment.trimEndSec ?? null, seconds);
});

Then("the cue provider should be {string}", (provider: string) => {
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as CueSpec;
  assert.equal(item.provider, provider);
});

Then("the cue bullets should be:", (table: { raw: () => string[][] }) => {
  const expected = table.raw().slice(1).map((row) => row[0]).filter(Boolean);
  const item = videoSpec?.compositions[0]?.scenes[0]?.items[0] as CueSpec;
  assert.deepEqual(item.bullets, expected);
});

Then("the composition meta fps should be {int}", (fps: number) => {
  const meta = videoSpec?.compositions[0]?.meta;
  assert.equal(meta?.fps, fps);
});

Then("the composition meta width should be {int}", (width: number) => {
  const meta = videoSpec?.compositions[0]?.meta;
  assert.equal(meta?.width, width);
});

Then("the composition meta height should be {int}", (height: number) => {
  const meta = videoSpec?.compositions[0]?.meta;
  assert.equal(meta?.height, height);
});

Then("the composition voiceover provider should be {string}", (provider: string) => {
  const voiceover = videoSpec?.compositions[0]?.voiceover;
  assert.equal(voiceover?.provider, provider);
});

Then("the composition voiceover voice should be {string}", (voice: string) => {
  const voiceover = videoSpec?.compositions[0]?.voiceover;
  assert.equal(voiceover?.voice, voice);
});
