# Babulus (XML DSL for Remotion Audio + Timing)

Babulus turns a `.babulus.xml` file into timing JSON + generated audio for Remotion. It is a thin, narration-first layer that also handles TTS/SFX/music generation with environment-aware caching.

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
babulus generate content/intro.babulus.xml
```

## Documentation

Branded documentation lives in the Studio Web app:

- Web docs (local dev): `apps/studio-web` at `/docs`
- Source of truth (HTML): `apps/studio-web/lib/docs-content`
- Docs landing page route: `apps/studio-web/app/(public)/docs/page.tsx`
- “What is Babulus?”: `/docs/introduction` (source: `apps/studio-web/lib/docs-content/introduction.ts`)
- Technical overview: `/docs/technical` (source: `apps/studio-web/lib/docs-content/technical.ts`)
- Roadmap: `/docs/roadmap` (source: `apps/studio-web/lib/docs-content/roadmap.ts`)

## The DSL (XML)

A `.babulus.xml` file declares a composition (or multiple). It is a declarative tree of scenes, cues, and components.

```xml
<videoml id="intro" title="Intro" fps="30" width="1920" height="1080">
  <voiceover provider="openai" voice="echo" />

  <scene id="paradigm" title="A New Kind of Computer Program">
    <music
      prompt="Warm ambient background music, energetic percussion, deep bass, no vocals"
      playThrough="true"
      volume="0.7"
      fadeTo='{"volume":0.12,"afterSeconds":6,"fadeDurationSeconds":3}'
      fadeOut='{"volume":0.7,"beforeEndSeconds":5,"fadeDurationSeconds":3}'
    />
    <cue id="paradigm-vo">
      <voice>Since the dawn of computing...</voice>
      <pause seconds="0.35s" />
      <voice>But tool-using agents flip the script.</voice>
    </cue>
  </scene>
</videoml>
```

### Pauses

Use `<pause>` inside a `<cue>` to insert silence between narration segments:

- `<pause seconds="0.4s" />`
- `<pause seconds="600ms" />`

Pause timing is resolved at generate time alongside other cue timing.

## CLI

```bash
# Generate audio + timing JSON
babulus generate content/intro.babulus.xml

# Watch mode
babulus generate --watch content/

# Force regeneration
babulus generate --fresh content/intro.babulus.xml

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

Default outputs (for `content/<video>.babulus.xml`):

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
BABULUS_ENV=development babulus generate content/intro.babulus.xml
BABULUS_ENV=production babulus generate content/intro.babulus.xml
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
