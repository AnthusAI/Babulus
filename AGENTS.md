# Babulus - AI-Powered Voiceover Generator for Remotion

## What this is

Python 3.11+ CLI tool that compiles `.babulus.yml` DSL → JSON scripts for Remotion videos. Generates TTS audio, SFX, music via OpenAI/ElevenLabs/AWS/Azure APIs with environment-aware caching.

## How to run

```bash
# Install
pip install -e .  # requires Python 3.11+

# Generate audio + timing JSON
babulus generate content/<video>.babulus.yml

# Watch mode (auto-regenerate on DSL changes)
babulus generate --watch content/<video>.babulus.yml

# Watch all videos in content/ directory
babulus generate --watch content/

# Environment-specific generation
BABULUS_ENV=development babulus generate content/<video>.babulus.yml
BABULUS_ENV=production babulus generate content/<video>.babulus.yml
```

## Key files

- `babulus/cli.py` - CLI entry point
- `babulus/voiceover_generate.py` - Core generation logic, TTS/SFX/music synthesis
- `babulus/voiceover_dsl.py` - DSL parsing, environment resolution
- `babulus/cache_resolver.py` - Environment-aware cache fallback
- `babulus/sfx_workflow.py` - SFX variant selection/archiving
- `.babulus/config.yml` - API keys (ElevenLabs, OpenAI, AWS, Azure)

## Inputs/Outputs

**Inputs**:
- DSL: `content/<video>.babulus.yml` (scenes, cues, narration, audio clips)
- Config: `.babulus/config.yml` (API credentials)

**Outputs**:
- Script JSON: `src/videos/<video>/<video>.script.json` (timing data for Remotion)
- Timeline JSON: `src/videos/<video>/<video>.timeline.json` (audio tracks)
- Audio: `public/babulus/<video>.wav` (concatenated voiceover)
- Cache: `.babulus/out/<video>/env/<environment>/` (TTS segments, SFX, music)

## Environment-aware caching

Cache structure: `.babulus/out/<video>/env/<environment>/`

Environments: `development`, `aws`, `azure`, `production`, `static`

Fallback chain: development → aws → azure → production → static

**Why**: Prevents burning through API quotas when switching environments or making DSL edits. Only regenerates changed segments.

**Performance**: 79x faster on cache hits, 70%+ cost savings in typical workflows.

## Common tasks

```bash
# Watch mode (all videos)
BABULUS_ENV=development babulus generate --watch content/

# Force regenerate everything
babulus generate --fresh content/intro.babulus.yml

# Audition SFX variants
babulus sfx next --clip whoosh --variants 8
babulus sfx prev --clip whoosh --variants 8
babulus sfx set --clip whoosh --pick 3

# Clean generated files (environment-aware)
babulus clean --yes                          # Current env only
babulus clean --env production --yes          # Specific env
babulus clean --only-voice --yes             # Only voice
babulus clean --only-sfx --only-music --yes  # Multiple types
```

## Project structure

```
babulus/
├── cli.py                    # CLI commands
├── voiceover_generate.py     # Core generation (TTS/SFX/music)
├── voiceover_dsl.py          # DSL parsing
├── cache_resolver.py         # Environment fallback
├── sfx_workflow.py           # SFX variant management
├── static_assets.py          # Static asset support
├── audio_*.py                # Audio DSL parsing
├── providers/                # TTS provider integrations
│   ├── elevenlabs.py
│   ├── openai_tts.py
│   ├── aws_polly.py
│   └── azure_speech.py
└── errors.py                 # Exception types
```

## Testing locally

From a project using Babulus:

```bash
# Setup
conda create -n babulus python=3.12 -y
conda activate babulus
cd /path/to/Babulus
pip install -e .

# Test
cd /path/to/project/videos
BABULUS_ENV=development babulus generate content/intro.babulus.yml

# Verify cache hit
BABULUS_ENV=development babulus generate content/intro.babulus.yml
# Should show "tts: cache" for all segments, <1s generation time
```

## Important notes

- **Breaking change**: Old cache structure (`.babulus/out/<video>/segments/`) no longer used. New structure is `.babulus/out/<video>/env/<environment>/segments/`
- Cache keys include full provider context (voice, model, settings) - this is correct and necessary
- Fallback reuses audio only when provider settings match (same voice/model)
- Manifest format unchanged (still version 1)
- Each video has independent cache per environment
