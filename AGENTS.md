# Babulus - TypeScript DSL for Remotion Audio + Timing

## CRITICAL PROTOCOL: GIT COMMITS
**NEVER** commit changes without explicit user approval.
- Always show the user what you have done and ask for confirmation before running `git commit`.
- If the user asks you to "do X", implementing X is your job. Committing X is a separate step that requires separate approval.
- Exception: If the user explicitly says "fix X and commit", you may commit. Otherwise, assume you are in a "review pending" state.

## What this is

Node/TypeScript CLI tool that compiles `.babulus.ts` DSL files into JSON timing for Remotion, plus generated TTS/SFX/music with environment-aware caching.

## How to run

```bash
# Install (from this repo)
npm install

# Generate audio + timing JSON
npm run babulus -- generate content/<video>.babulus.ts

# Watch mode (auto-regenerate on DSL changes)
npm run babulus -- generate --watch content/<video>.babulus.ts

# Watch all videos in content/ directory
npm run babulus -- generate --watch content/

# Environment-specific generation
BABULUS_ENV=development npm run babulus -- generate content/<video>.babulus.ts
BABULUS_ENV=production npm run babulus -- generate content/<video>.babulus.ts
```

## Key files

- `src/cli.ts` - CLI entry point
- `src/generate.ts` - Core generation logic (TTS/SFX/music)
- `src/dsl/builder.ts` - DSL builders (composition/scene/cue/voice)
- `src/dsl/load.ts` - DSL loader (dynamic import)
- `src/cache-resolver.ts` - Environment-aware cache fallback
- `src/sfx-workflow.ts` - SFX variant selection/archiving
- `.babulus/config.yml` - API keys (ElevenLabs, OpenAI, AWS, Azure)

## Inputs/Outputs

**Inputs**:
- DSL: `content/<video>.babulus.ts` (scenes, cues, narration, audio clips)
- Config: `.babulus/config.yml` (API credentials)

**Outputs**:
- Script JSON: `src/videos/<video>/<video>.script.json` (timing data for Remotion)
- Timeline JSON: `src/videos/<video>/<video>.timeline.json` (audio tracks)
- Audio: `public/babulus/<video>.wav` (concatenated voiceover)
- Cache: `.babulus/out/<video>/env/<environment>/` (TTS segments, SFX, music)

## Environment-aware caching

Cache structure: `.babulus/out/<video>/env/<environment>/`

Environments: `development`, `aws`, `azure`, `production`, `static`

Fallback chain: development -> aws -> azure -> production -> static

**Why**: Prevents burning through API quotas when switching environments or making DSL edits. Only regenerates changed segments.

## Common tasks

```bash
# Watch mode (all videos)
BABULUS_ENV=development npm run babulus -- generate --watch content/

# Force regenerate everything
npm run babulus -- generate --fresh content/intro.babulus.ts

# Audition SFX variants
npm run babulus -- sfx next --clip whoosh --variants 8
npm run babulus -- sfx prev --clip whoosh --variants 8
npm run babulus -- sfx set --clip whoosh --pick 3

# Clean generated files (environment-aware)
npm run babulus -- clean --yes                          # Current env only
npm run babulus -- clean --env production --yes         # Specific env
npm run babulus -- clean --only-voice --yes            # Only voice
npm run babulus -- clean --only-sfx --only-music --yes # Multiple types
```
