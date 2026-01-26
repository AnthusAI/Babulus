# Babulus (TypeScript DSL for Remotion Audio + Timing)

Babulus turns a `.babulus.ts` file into timing JSON + generated audio for Remotion. It is a thin, narration-first layer that also handles TTS/SFX/music generation with environment-aware caching.

## Quick Start

Requirements:
- Node.js 18+
- `ffmpeg` + `ffprobe` on PATH
- Playwright (for PNG/MP4 rendering helpers)

Install (from a project that uses Babulus):

```bash
npm install -D babulus
```

Local dev (from this repo):

```bash
npm install
npm run babulus -- --help
```

Generate:

```bash
babulus generate content/intro.babulus.ts
```

## Documentation

Branded documentation lives in the Studio Web app:

- Web docs (local dev): `apps/studio-web` at `/docs`
- Source of truth (HTML): `apps/studio-web/lib/docs-content`
- Docs landing page route: `apps/studio-web/app/(public)/docs/page.tsx`
- “What is Babulus?”: `/docs/introduction` (source: `apps/studio-web/lib/docs-content/introduction.ts`)
- Technical overview: `/docs/technical` (source: `apps/studio-web/lib/docs-content/technical.ts`)
- Roadmap: `/docs/roadmap` (source: `apps/studio-web/lib/docs-content/roadmap.ts`)

## The DSL (TypeScript)

A `.babulus.ts` file exports a composition (or multiple). Because it is TypeScript, you can use imperative code, imports, and async setup.

```ts
import { defineVideo, defineDefaults, defineEnv, pause } from "babulus/dsl";

const env = defineEnv();

const defaults = defineDefaults({
  voiceover: {
    provider: env.value("openai", { production: "elevenlabs", aws: "aws", azure: "azure" }),
    model: env.value("gpt-4o-mini-tts", { production: "eleven_v3" }),
    voice: env.value("echo", { production: "iE8bC87uXfqLphg7Abzw" }),
    sampleRateHz: env.value(24000, { aws: 16000, production: 44100 }),
    leadInSeconds: 0.25,
    trimEndSeconds: 0,
    pauseBetweenItems: pause(0.18, 0.07, { min: 0.06, max: 0.5 }),
  },
  audioProviders: {
    sfx: env.value("dry-run", { production: "elevenlabs" }),
    music: env.value("dry-run", { production: "elevenlabs" }),
  },
});

export default defineVideo((video) => {
  video.composition("intro", (comp) => {
    comp.use(defaults);
    comp.posterTime(48);

    comp.scene("A New Kind of Computer Program", { id: "paradigm" }, (scene) => {
      scene.music("bed", {
        prompt: "Warm ambient background music, energetic percussion, deep bass, no vocals",
        playThrough: true,
        volume: 0.7,
        fadeTo: { volume: 0.12, afterSeconds: 6, fadeDurationSeconds: 3 },
        fadeOut: { volume: 0.7, beforeEndSeconds: 5, fadeDurationSeconds: 3 },
      });

      scene.cue("Paradigm", { id: "paradigm" }, (cue) => {
        cue.voice((voice) => {
          voice.pause(0.6);
          voice.say("Since the dawn of computing...");
          voice.pause(0.35);
          voice.say("But tool-using agents flip the script.");
        });
      });
    });
  });
});
```

### Randomized pauses (Gaussian)

`pause()` supports fixed or Gaussian durations (seconds):

- `pause(0.4)` -> fixed 0.4s pause
- `pause(0.4, 0.1, { min: 0.1, max: 0.8 })` -> Gaussian with mean/std, optional clamp

Gaussian pauses are sampled at **generate time**. If you do not set `voiceover.seed`, each run produces fresh timings.

## CLI

```bash
# Generate audio + timing JSON
babulus generate content/intro.babulus.ts

# Watch mode
babulus generate --watch content/

# Force regeneration
babulus generate --fresh content/intro.babulus.ts

# Clean (dry run)
babulus clean
babulus clean --yes

# Execute a worker job (local execution plane)
babulus worker run --job job.json --result result.json
```

## Renderer helpers (storyboard previews)

These commands render storyboard frames or MP4 previews from the generated `script.json`/`timeline.json`. PNG/MP4 output uses Playwright + ffmpeg. Frame rendering defaults to a small parallel worker pool; pass `--workers 1` to disable parallelization. Use `--ffmpeg-arg` to forward custom ffmpeg options when you need to tune encoding.

```bash
# Verify toolchain versions
npm run render:toolchain -- --require-ffmpeg --require-playwright

# Render storyboard HTML frames (no Playwright required)
npm run render:storyboard:frames -- --script src/videos/intro/intro.script.json --frames out/intro-html

# Render storyboard PNG frames (Playwright required)
npm run render:storyboard:png -- --script src/videos/intro/intro.script.json --frames out/intro-png --start 0 --end 60

# Render storyboard MP4 (Playwright + ffmpeg required)
npm run render:storyboard -- --script src/videos/intro/intro.script.json --frames out/intro-frames --out out/intro.mp4

# Parallelize frame rendering (default is auto; set 1 to disable)
npm run render:storyboard -- --script src/videos/intro/intro.script.json --frames out/intro-frames --out out/intro.mp4 --workers 4

# Pass custom ffmpeg arguments (repeat --ffmpeg-arg for each token)
npm run render:storyboard -- --script src/videos/intro/intro.script.json --frames out/intro-frames --out out/intro.mp4 --ffmpeg-arg -preset --ffmpeg-arg ultrafast
```

If Playwright is missing, install Chromium once:

```bash
npx playwright install chromium
```

Default outputs (for `content/<video>.babulus.ts`):

- `script`: `src/videos/<video>/<video>.script.json`
- `timeline`: `src/videos/<video>/<video>.timeline.json`
- `audio`: `public/babulus/<video>.wav`
- `cache`: `.babulus/out/<video>/env/<environment>/`

## Environment-Aware Caching

Babulus caches per-environment to avoid burning API quotas. Cache layout:

```
.babulus/out/<video>/env/<environment>/
```

Environments: `development`, `aws`, `azure`, `production`, `static`

Fallback chain: `development -> aws -> azure -> production -> static`

```bash
BABULUS_ENV=development babulus generate content/intro.babulus.ts
BABULUS_ENV=production babulus generate content/intro.babulus.ts
```

## Config

API keys live in `.babulus/config.yml`:

```yaml
providers:
  openai:
    api_key: "..."
  elevenlabs:
    api_key: "..."
  aws_polly:
    region: "us-east-1"
  azure_speech:
    api_key: "..."
    region: "..."
```

## Distribution

This repo builds a Node-based CLI package. The generated JSON/audio are the build artifacts you commit or ship with your Remotion project.
