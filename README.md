# Babulus (Voiceover → Video Timing)

Babulus compiles a narration-first DSL into a **timed script JSON**. Remotion uses that JSON as the source of truth for **scene/cue timing** by converting seconds → frames at runtime.

## The One-Sentence Mental Model

Your `.babulus.yml` defines **IDs + times**, Babulus outputs JSON with `startSec/endSec`, and your Remotion code does two explicit mappings:

- `scene.id` → which React scene component to render
- `cue.id` → which element/animation to start/show at that time

That’s “the connection”.

## Data Shape (JSON)

`script.json` contains:

- `scenes[]`: `{ id, title, startSec, endSec, cues[] }`
- `cues[]`: `{ id, label, startSec, endSec, text, bullets? }`

## The DSL (YAML)

A `.babulus.yml` file is a YAML document with a top-level `scenes:` list.

```yaml
audio:
  # Optional: default provider for `kind: sfx` clips.
  sfx_provider: elevenlabs

scenes:
  - id: intro
    title: "Intro"
    time: "0s-8s"
    cues:
      - id: hook
        label: "Hook"
        time: "0s-3s"
        voice: "In this video, we'll build an agent."
      - id: bullets
        label: "Bullets"
        time: "3s-8s"
        voice: "We'll cover three things."
        bullets:
          - "Tools"
          - "Memory"
          - "Errors"
      - id: whoosh-demo
        label: "Transition"
        voice: "Now let's transition."
        audio:
          - kind: sfx
            id: whoosh
            at: "+0.0s"    # relative to this cue's start time
            volume: 25%    # accepts 0..1, 0..100, or "80%"
            prompt: "Fast cinematic whoosh transition, clean, no voice"
            duration_seconds: 3
            variants: 8
            pick: 2
```

### Time formats

`time` may be either:

- A range string: `"12.5s-18.3s"`
- A relative range string inside a timed scene: `"+0.5s-+1.2s"` (adds the scene’s `startSec`)

If you omit `id` for a scene/cue, Babulus derives one from `title`/`label` (slugified). It’s optional, but for real projects you usually want explicit IDs so you can rename titles/labels without breaking the Remotion mapping.

## Installation

**Requirements**: Python 3.11 or newer

Install for local development (from a clone of this repo):

```bash
python -m pip install -e . -U
```

Or install from requirements.txt in a project:

```bash
pip install -r requirements.txt  # where requirements.txt lists babulus>=0.1.0
```

You can then run either `babulus ...` (recommended) or `python -m babulus ...`.

## CLI Commands

### Project Directory (Root Workflow)

If your Babulus project lives in a subdirectory (e.g., `videos/`) but you want to run commands from the project root (e.g., via `package.json` scripts), use the `--project-dir` argument. This ensures config files, content paths, and outputs are resolved correctly relative to that subdirectory.

```bash
# Run from root, targeting the 'videos' subdirectory
babulus generate videos/content --project-dir videos
```

This is equivalent to `cd videos && babulus generate content`.

### Manual timing compile

```bash
babulus compile \
  path/to/video.babulus.yml \
  --out path/to/script.json \
  --pretty
```

Transcript-driven alignment is supported if you pass `--transcript path/to/words.json`, where the JSON contains:

```json
{ "words": [{ "word": "Hello", "start": 0.0, "end": 0.2 }] }
```

### Audio-driven generation (the "real" pipeline)

This mode is for when you want cue timing to come from the actual generated audio (plus explicit pauses), rather than hard-coded `time:` ranges.

```bash
# Generate a specific video
babulus generate content/intro.babulus.yml

# Generate all videos in a directory
babulus generate content/

# Auto-discover (if exactly one DSL in ./content/)
babulus generate
```

Defaults (derived from the DSL filename `<video>.babulus.yml`):

- `script-out`: `src/videos/<video>/<video>.script.json`
- `timeline-out`: `src/videos/<video>/<video>.timeline.json`
- `audio-out`: `public/babulus/<video>.wav`
- `out-dir`: `.babulus/out/<video>`

Idempotence / caching:

- By default, `generate` reuses cached audio segments when the inputs are unchanged (so changing one word only regenerates the affected clip).
- Use `--fresh` to force regeneration of everything.

### Environment-Aware Caching

Babulus caches audio per-environment to avoid burning through API quotas when switching environments or iterating on DSL changes. Cache structure:

```
.babulus/out/<video>/
└── env/
    ├── development/     # Cheap/fast providers (OpenAI, dry-run)
    ├── aws/             # AWS Polly
    ├── azure/           # Azure Speech
    ├── production/      # High-quality providers (Eleven Labs)
    └── static/          # Pre-generated reusable assets
```

Set the environment via `BABULUS_ENV`:

```bash
# Development mode (cheap/fast iteration)
BABULUS_ENV=development babulus generate content/intro.babulus.yml

# Production mode (high quality)
BABULUS_ENV=production babulus generate content/intro.babulus.yml
```

**Fallback chain**: When generating, Babulus searches `development → aws → azure → production → static` for matching cached audio. This lets you reuse expensive production audio during development iterations.

**Key benefits**:
- Switching environments doesn't force regeneration
- Watch mode only regenerates changed segments (79x faster on cache hits)
- 70%+ cost savings in typical iteration workflows
- Each video/environment maintains independent cache

**Example workflow**:
```bash
# Generate with cheap provider for fast iteration
BABULUS_ENV=development babulus generate --watch content/intro.babulus.yml

# Edit DSL - watch mode regenerates only changed segments

# Final production pass with high-quality provider
BABULUS_ENV=production babulus generate content/intro.babulus.yml
```

### Watch mode

Regenerate automatically when you edit the DSL (and `./.babulus/config.yml` if present):

```bash
# Watch a single video
babulus generate --watch content/intro.babulus.yml

# Watch all videos in a directory
babulus generate --watch content/
```

**Watch mode features**:
- Monitors DSL files, config files, and SFX selections
- Clear logging shows exactly what changed and what was regenerated
- Shows file sizes after regeneration to verify success
- Only regenerates changed segments (uses cache for unchanged content)
- Environment-aware (respects `BABULUS_ENV`)

**Example output**:
```
CHANGE DETECTED
  Changed: content/intro.babulus.yml
  → Will regenerate 1 video(s):
      • intro

Starting regeneration...
[12:43:17] intro: tts: cache scene=paradigm cue=paradigm seg=2
[12:43:17] intro: tts: synth scene=paradigm cue=paradigm seg=4 -> ...
...

REGENERATION COMPLETE (1.23s)
  intro:
    Script:   src/videos/intro/intro.script.json [45.2KB]
    Timeline: src/videos/intro/intro.timeline.json [23.1KB]
    Audio:    public/babulus/intro.wav [11.1MB]
```

### Clean

Remove generated artifacts. **Environment-aware**: only cleans the current environment by default.

Dry-run (prints what would be deleted):

```bash
babulus clean
```

Actually delete:

```bash
babulus clean --yes
```

**Selective cleaning**:

```bash
# Clean only voice/TTS segments in development
BABULUS_ENV=development babulus clean --only-voice --yes

# Clean only SFX in production
babulus clean --env production --only-sfx --yes

# Clean only music
babulus clean --only-music --yes

# Clean multiple types
babulus clean --only-voice --only-music --yes

# Clean specific environment
babulus clean --env production --yes
```

Babulus loads API credentials from config in this order (unless `BABULUS_PATH` is set):

1. `./.babulus/config.yml`
2. `~/.babulus/config.yml`

If `BABULUS_PATH` is set, it will use:

- `$BABULUS_PATH` if it points to a file
- `$BABULUS_PATH/config.yml` if it points to a directory

Example `config.yml` shape:

```yaml
providers:
  elevenlabs:
    api_key: "..."
    voice_id: "..."
    model_id: "eleven_turbo_v2_5"  # Optional: TTS model selection
  openai:
    api_key: "..."
    model: "tts-1"                  # Optional: TTS model selection
    voice: "alloy"                  # Optional: voice selection
  azure_speech:
    api_key: "..."
    region: "eastus"
    voice: "en-US-JennyNeural"      # Optional: voice selection
  aws_polly:
    region: "us-east-1"
    voice_id: "Joanna"              # Optional: voice selection
    engine: "neural"                # Optional: standard or neural
```

## Model and Voice Configuration

Babulus supports **three-level configuration** for TTS models and voices:

1. **Built-in defaults** (in provider class definitions)
2. **Global config** (`.babulus/config.yml` or `~/.babulus/config.yml`)
3. **Per-video overrides** (in `.babulus.yml` DSL files)

### Per-Video Model and Voice Override

You can override the model and voice for individual videos in your `.babulus.yml`:

```yaml
voiceover:
  provider: elevenlabs
  model: "eleven_turbo_v2_5"      # Override model per video
  voice: "EXAVITQu4vr4xnSDxMaL"   # Override voice per video
```

### Environment-Based Model and Voice Switching

Combine provider switching with model and voice overrides for different environments:

```yaml
voiceover:
  provider:
    development: openai           # Fast, cheap for iteration
    production: elevenlabs        # High quality for final render
  model:
    development: "tts-1"          # OpenAI standard model
    production: "eleven_turbo_v2_5"  # ElevenLabs turbo tier
  voice:
    development: "alloy"          # OpenAI voice
    production: "lxYfHSkYm1EzQzGhdbfc"  # ElevenLabs voice ID
```

Set the environment via `BABULUS_ENV`:

```bash
# Development mode (cheap/fast iteration)
BABULUS_ENV=development babulus generate content/intro.babulus.yml

# Production mode (high quality)
BABULUS_ENV=production babulus generate content/intro.babulus.yml
```

### Available Models and Voices by Provider

#### ElevenLabs

**Models (set via `model_id` in config or `model` in DSL):**

ElevenLabs offers multiple model tiers. Commonly used models include:
- `eleven_v3` - Latest v3 model (premium quality, best for production)
- `eleven_multilingual_v2` - Multilingual support, premium quality
- `eleven_turbo_v2_5` - Turbo tier (faster, good balance)
- `eleven_turbo_v2` - Older turbo tier
- `eleven_flash_v2_5` - Flash tier (fastest generation)
- `eleven_monolingual_v1` - English-only premium model

**Note:** Model availability and names may change. Check [ElevenLabs documentation](https://elevenlabs.io/docs) for the most current list.

**Voices:** Use any voice ID from your ElevenLabs account (set via `voice_id` in config or `voice` in DSL)

**Recommendation:**
- **Development:** Use a faster/cheaper model or switch to OpenAI for rapid iteration
- **Production:** Use `eleven_v3` or `eleven_multilingual_v2` for highest quality

#### OpenAI TTS

**Models (set via `model` in config or DSL):**
- `tts-1` - Standard quality, faster, cheaper (~$0.015/1K chars)
- `tts-1-hd` - Higher quality, slower, more expensive (~$0.030/1K chars)
- `gpt-4o-mini-tts` - Mini model

**Voices (set via `voice` in config or DSL):**
- `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`, `marin`

#### AWS Polly

**Engine (set via `engine` in config, no DSL override):**
- `standard` - Standard voices, cheaper
- `neural` - Neural voices, better quality

**Voices (set via `voice_id` in config or `voice` in DSL):**
- `Joanna`, `Matthew`, `Ivy`, `Justin`, `Kendra`, `Kimberly`, `Salli`, etc.
- See [AWS Polly voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html) for full list

**Note:** AWS Polly doesn't have a separate model parameter. The engine choice (standard/neural) and voice selection determine the capabilities.

#### Azure Speech

**Voices (set via `voice` in config or DSL):**
- Voice names include the tier in the suffix:
  - `*-Neural` = Neural voices (premium quality)
  - `*-Standard` = Standard voices (lower quality)
- Examples: `en-US-JennyNeural`, `en-US-GuyNeural`, `en-GB-SoniaNeural`
- See [Azure voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts) for full list

**Note:** Azure doesn't have a separate model parameter. The voice name determines both the voice personality and quality tier.

### Configuration Best Practices

1. **Set global defaults** in `.babulus/config.yml` for your most commonly used model/voice
2. **Use environment-based switching** to save costs during development
3. **Override per-video** when specific content needs a different model or voice
4. **Start with turbo** (ElevenLabs) or `tts-1` (OpenAI) for development, then upgrade for production if needed

### Providers (TTS)

Set `voiceover.provider` in your `.babulus.yml` to one of:

- `dry-run` (silent WAVs with estimated durations)
- `elevenlabs` (TTS via ElevenLabs; segments are stored as MP3 and concatenated to your requested `--audio-out`)
- `openai` (TTS via OpenAI, writes WAV)
- `aws-polly` (TTS via AWS Polly, writes WAV by wrapping PCM)
- `azure-speech` (TTS via Azure Cognitive Services Speech, writes WAV)

Credentials/config live in `./.babulus/config.yml` or `~/.babulus/config.yml`:

- ElevenLabs: `providers.elevenlabs.api_key`, plus `providers.elevenlabs.voice_id` for TTS
- OpenAI: `providers.openai.api_key`
- Azure: `providers.azure_speech.api_key` + `providers.azure_speech.region`
- AWS Polly: uses the standard AWS credential chain (env vars like `AWS_ACCESS_KEY_ID`, `~/.aws/credentials`, SSO, etc.). Region/voice go in `providers.aws_polly`.

### ElevenLabs pronunciation dictionaries

To fix pronunciation of project-specific words (like “Tactus”), you have two options:

#### Option A: Define lexemes in the DSL (recommended)

Put lexemes directly in the DSL, and Babulus will **transparently create/update** an ElevenLabs pronunciation dictionary in your workspace and attach it to every TTS request:

```yaml
voiceover:
  provider: elevenlabs
  pronunciation_dictionary:
    name: tactus
  pronunciations:
    - lexeme:
        grapheme: "Tactus"
        alias: "tack-tus"
```

Notes:

- The cloud dictionary is cached/tracked in `.babulus/out/<video>/manifest.json` so it only updates when lexemes change.
- Babulus prepends the auto-managed dictionary to any explicitly listed dictionaries (max 3 total).

#### Option B: Reference an existing dictionary ID

Add a pronunciation dictionary in ElevenLabs yourself and reference it from the DSL:

```yaml
voiceover:
  provider: elevenlabs
  pronunciation_dictionaries:
    - id: "pd_your_dictionary_id"
      version_id: null
```

This maps to ElevenLabs `pronunciation_dictionary_locators` on each TTS request (max 3 per request).

## Pauses & Segments (Voiceover Authoring)

In `generate` mode, cue timing is computed from audio segment durations. You can also insert explicit pauses.

### Delaying the *start* of a cue’s narration

If you want the *voice to start later* (while the scene is already on screen), put `pause_seconds` on the `voice:` mapping (or make the first `segments[]` item a pause).

```yaml
scenes:
  - id: problem
    title: "Problem"
    cues:
      - id: problem
        label: "Problem"
        voice:
          pause_seconds: 2
          segments:
            - voice: "This line will start 2 seconds after the cue begins."
```

Important: `voice.segments` runs in order. A `pause_seconds` segment *after* a `voice` segment is a pause *after speaking*, not a delay before it.

You can also delay *an individual voice segment* by putting `pause_seconds` on that segment:

```yaml
voice:
  segments:
    - voice: "First sentence."
    - voice: "Second sentence after a beat."
      pause_seconds: 0.5
```

### Per-cue segments

Instead of a single `voice:` field, a cue can use `segments:` to split narration into smaller chunks and insert pauses:

```yaml
scenes:
  - title: "Example"
    cues:
      - id: hook
        label: "Hook"
        voice:
          segments:
            - voice: "Tool-using agents are useful."
            - pause_seconds: 0.25
            - voice: "And dangerous."
              trim_end_sec: 0.12
```

### Trimming breaths / tails

Some TTS voices add a little breath or tail at the end of a segment. You can trim that off:

```yaml
voiceover:
  trim_end_seconds: 0.12
```

Or override per segment with `trim_end_sec` (legacy key) or `trim_end_seconds` (preferred).

### Default pause between cues (with optional jitter)

You can set a default pause between cue items, optionally randomized (deterministically via `seed`):

```yaml
voiceover:
  seed: 1337
  pause_between_items_seconds: 0.1
  pause_between_items_gaussian:
    mean_seconds: 0.12
    std_seconds: 0.05
    min_seconds: 0.02
    max_seconds: 0.35
```

## Multi-Track Audio (SFX / Music / Files)

Declare audio clips *next to the cue or scene where they should play*.

```yaml
audio:
  sfx_provider: elevenlabs
  music_provider: elevenlabs
  library:
    whoosh:
      kind: sfx
      prompt: "Quick whoosh transition"
      duration_seconds: 3
      variants: 5

scenes:
  - id: problem
    title: "Problem"
    cues:
      - id: problem
        label: "Problem"
        voice: "..."
        audio:
          - use: whoosh
            at: "+0.0s"     # relative to this cue's start
            volume: 35%
            pick: 2         # per-use: choose variant

  - id: intro
    title: "Intro"
    # Optional: scene-level audio (relative to scene start)
    audio:
      # Generated background music (default duration: this scene’s duration)
      - kind: music
        id: bed
        prompt: "Warm ambient background music, minimal percussion, no vocals"
        volume: 20%
        # play_through: true     # extend to end of video
        # duration_seconds: 30   # override default duration
      # Or, reference an existing file under `public/`:
      - kind: file
        id: bed-file
        src: "music/bed.mp3"
        volume: 20%
    cues:
      - id: hook
        label: "Hook"
        voice: "..."
```

Key ideas:

- `audio:` under a cue defaults to playing at the cue start; use `at: "+0.2s"` to offset.
- Use `audio.library` + `use:` to reuse the same generated clip in multiple places (with independent `pick`, `volume`, `pause_seconds`).
- Use explicit anchors if needed: `at: "cue:<cueId>+0.2s"` or `at: "scene:<sceneId>+0.2s"`.
- SFX supports `variants` + `pick` for auditioning options.
- Music clips default to the current scene duration; set `play_through: true` to extend to the end of the video.
- Any clip can fade its volume over time using `fade_to` / `fade_out` (default `fade_duration_seconds: 2`).
- `src` for `kind: file` should be a path under Remotion’s `public/` directory (so `staticFile(src)` works).
- `volume` accepts either `0..1` (Remotion gain) or `0..100` / `"80%"` (percent).

Volume fades example (clip-local seconds):

```yaml
audio:
  music_provider: elevenlabs

scenes:
  - id: title
    title: "Title"
    audio:
      - kind: music
        id: bed
        prompt: "Ambient background music, no vocals"
        volume: 92%
        fade_to:
          volume: 50%
          after_seconds: 4
          # fade_duration_seconds: 4   # optional (default 2)
        fade_out:
          volume: 92%
          before_end_seconds: 4
          # fade_duration_seconds: 4   # optional (default 2)
```

What Babulus generates:

- `--timeline-out` JSON includes `audio.tracks[].clips[]` with computed `startSec`.
- For SFX variants, Babulus caches all candidates under `--out-dir` and (when `--audio-out` points into `public/`) stages the chosen SFX into `public/babulus/sfx/<clipId>.wav` and writes `src: "babulus/sfx/<clipId>.wav"` into the timeline so Remotion can play it.
- For narration, when `--audio-out` points into `public/`, Babulus also stages each generated TTS segment under `public/babulus/<video>/segments/` and emits them as separate `kind: file` clips (so you can see each utterance as its own audio item in Remotion).

ElevenLabs SFX integration:

- Set `audio.sfx_provider: elevenlabs` in your `.babulus.yml` (or set `audio.default_sfx_provider` in `./.babulus/config.yml`), and use `kind: sfx` clips with `variants` + `pick`.
- Babulus caches variants under `--out-dir` and stages the chosen file under `public/babulus/sfx/` so Remotion can play it.

### Auditioning SFX variants (workflow)

SFX clips can generate multiple `variants`. Babulus keeps all variants cached under `.babulus/out/<video>/sfx/`.

To audition different variants without editing the DSL, use the selection file under `.babulus/out/<video>/selections.json` via the CLI:

```bash
bash bin/babulus sfx next --clip whoosh --variants 8
bash bin/babulus sfx prev --clip whoosh --variants 8
bash bin/babulus sfx set --clip whoosh --pick 3
```

With `bash bin/babulus generate --watch`, changing the pick will trigger a re-generate so Remotion updates the staged `public/babulus/sfx/<clipId>.*` file.

If you’re not using `--watch`, you can also apply the change immediately:

```bash
bash bin/babulus sfx next --clip whoosh --variants 8 --apply
```

Archiving options you don’t want to see right now:

```bash
bash bin/babulus sfx archive --clip whoosh --keep-pick
bash bin/babulus sfx restore --clip whoosh
bash bin/babulus sfx clear --clip whoosh
```

## Remotion: The Two Mappings

### 1) `scene.id` → React scene component

You render a `Sequence` per scene using `scene.startSec/endSec`, then route by `scene.id`:

```tsx
import { Sequence, useVideoConfig } from "remotion";
import scriptJson from "./script.json";

const secondsToFrames = (sec: number, fps: number) => Math.round(sec * fps);

const SceneRouter: React.FC<{ scene: any }> = ({ scene }) => {
  switch (scene.id) {
    case "intro":
      return <IntroScene scene={scene} />;
    default:
      return null;
  }
};

export const MyVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {scriptJson.scenes.map((scene) => {
        const from = secondsToFrames(scene.startSec, fps);
        const to = secondsToFrames(scene.endSec, fps);
        return (
          <Sequence key={scene.id} from={from} durationInFrames={to - from}>
            <SceneRouter scene={scene} />
          </Sequence>
        );
      })}
    </>
  );
};
```

### 2) `cue.id` → element/animation timing

Inside a scene component, find the cue you care about and convert `cue.startSec` to a frame.

```tsx
const cue = scene.cues.find((c) => c.id === "hook"); // <- from the DSL
if (!cue) return null;
const cueStartFrame = secondsToFrames(cue.startSec, fps);
```

## Audio (Typical)

If you generate a voiceover audio file, play it at the top-level:

```tsx
import { Audio, staticFile } from "remotion";

<Audio src={staticFile("voiceover.mp3")} />;
```

Your script’s `startSec/endSec` should reference absolute seconds from the start of that audio track.

### Audio cueing in Remotion (layered tracks)

Babulus `generate` writes an additional `timeline.json` which includes `audio.tracks[]` events (SFX/music/file clips).

In this repo, you can render them using `src/babulus/AudioTimeline.tsx` (it creates `<Sequence><Audio/></Sequence>` per clip).

## Concrete Example (This Repo)

- DSL (project-owned): `content/intro.babulus.yml`
- Compiled JSON (generated): `src/videos/intro/intro.script.json`
- Scene mapping (`scene.id` → React): `src/videos/intro/IntroVideo.tsx`
- Cue timing usage (Solution cards): `src/videos/intro/IntroVideo.tsx`

Note: the YAML snippet above uses `intro/hook` as simple examples. In the actual Intro video DSL, the scene IDs are `title`, `problem`, `solution`, `code`, `cta`.
