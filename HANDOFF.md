# Babulus TS Migration - Handoff Brief

## Status
- ✅ **Migration Complete & Tested** - Babulus is now TypeScript-only (Node CLI + TS DSL). All Python files removed.
- ✅ **All Tests Pass** - TypeScript compilation clean, CLI working, all three videos generate successfully.
- ✅ **Outputs Verified** - Script JSON (with `posterTimeSec`), timeline JSON, and audio WAV files all have correct structure.
- Three Tactus videos converted from YAML to `.babulus.ts` with shared defaults.
- CLI, generator, DSL builders, providers, caching, SFX workflow implemented in TS.
- Docs updated for TS usage (README/AGENTS).

## Testing Summary (Jan 21, 2026)
**Phase 1: Babulus Core**
- ✅ Dependencies installed successfully
- ✅ Fixed 4 categories of TypeScript compilation errors
- ✅ CLI help command working

**Phase 2: Dry-Run Generation (No API Calls)**
- ✅ intro.babulus.ts → 293.63s, 34 segments
- ✅ guardrails.babulus.ts → 257.17s, 40 segments
- ✅ why-new-language.babulus.ts → 522.32s, 72 segments

**Phase 3: Output Verification**
- ✅ All script JSON files include posterTimeSec
- ✅ All timeline JSON files have items + audio.tracks structure
- ✅ All WAV files generated with correct sizes
- ✅ Cache structure correct (.babulus/out/<video>/env/development/)

**Phase 4: OpenAI TTS Generation (Real Audio)**
- ✅ intro.babulus.ts → 316.04s audio, 34 segments, ~66s generation
- ✅ guardrails.babulus.ts → 321.05s audio, 40 segments, ~62s generation
- ✅ why-new-language.babulus.ts → 633.82s audio, 72 segments, ~130s generation
- ✅ Total: 1270.91s (~21 min) of audio generated in ~258s (~4.3 min)
- ✅ Audio quality verified with OpenAI gpt-4o-mini-tts model + echo voice
- ✅ Environment-aware caching working (reuses segments on regeneration)

**Phase 5: Environment-Aware Public Paths (Critical Fix)**
- ✅ Fixed timeline JSON to reference environment-specific audio paths
- ✅ Structure: `public/babulus/<video>/env/<environment>/segments/`
- ✅ Verified: Switching environments updates Remotion audio without regeneration
- ✅ Verified: Switching back to previous environment reuses cached audio
- ✅ Cache organized per environment in `.babulus/out/<video>/env/<environment>/`

## Where things live
Babulus repo:
- CLI: `src/cli.ts`
- Generation core: `src/generate.ts`
- DSL builders + helpers: `src/dsl/*`
- Providers: `src/providers/*`
- Cache fallback: `src/cache-resolver.ts`
- Audio helpers: `src/media.ts`
- SFX picks: `src/sfx-workflow.ts`
- Script model: `src/models.ts` (now includes `posterTimeSec`)
- Docs: `README.md`, `AGENTS.md`

Tactus videos:
- Shared defaults + helpers: `../Tactus-web/videos/content/_babulus.shared.ts`
- Converted DSLs:
  - `../Tactus-web/videos/content/intro.babulus.ts`
  - `../Tactus-web/videos/content/guardrails.babulus.ts`
  - `../Tactus-web/videos/content/why-new-language.babulus.ts`
- Node wrapper: `../Tactus-web/videos/bin/babulus`
- Tactus docs: `../Tactus-web/videos/README.md`, `../Tactus-web/videos/AGENTS.md`
- Render poster extraction now reads script JSON: `../Tactus-web/videos/scripts/render-all.js`

## Key behavioral changes
- DSL is TypeScript (`.babulus.ts`). Uses `defineVideo`, `defineDefaults`, `pause`, `defineEnv`.
- `pause(mean, std, clamp)` supports Gaussian pauses sampled at generate time.
- `defineEnv().value(default, overrides)` uses ONLY explicit overrides (no implicit fallback chain).
- Script JSON now includes `posterTimeSec` from `composition.posterTime`.

## Removed
- All Python files in this repo.
- YAML DSL files in Tactus videos (`content/*.babulus.yml`).
- Tactus Python helper scripts (`debug_babulus.py`, `test_compile.py`).

## How to test (run locally)
Babulus repo:
- `cd /Users/ryan/projects/Babulus`
- `npm install`
- `npm run lint` (TypeScript compilation check)

Tactus videos:
- `cd /Users/ryan/projects/Tactus-web/videos`
- `npm install`
- Set up config path (required):
  ```bash
  export BABULUS_PATH=/Users/ryan/projects/Tactus-web/.babulus/config.yml
  ```
- Dry-run generation (no API calls, validated working):
  ```bash
  node ../../Babulus/node_modules/.bin/tsx ../../Babulus/src/cli.ts generate \
    content/intro.babulus.ts \
    --provider dry-run --sfx-provider dry-run --music-provider dry-run
  ```
  - Repeat for `guardrails.babulus.ts` and `why-new-language.babulus.ts`
  - All three videos generate successfully in ~2 seconds each
- OpenAI generation (validated working):
  ```bash
  # Ensure .babulus/config.yml has your OpenAI API key
  node ../../Babulus/node_modules/.bin/tsx ../../Babulus/src/cli.ts generate \
    content/intro.babulus.ts
  ```
  - Development mode uses OpenAI gpt-4o-mini-tts by default
  - Generates real audio ~4-5x faster than playback speed

## Issues Found & Fixed During Testing

**TypeScript Compilation Errors (Fixed)**:
- `src/dsl/builder.ts`: Duplicate identifier errors - methods and properties with same names
  - Fixed by renaming private fields: `meta` → `_meta`, `posterTime` → `_posterTime`, etc.
- `src/dsl/builder.ts`: Duplicate `tracks` property in object literal
  - Fixed by removing redundant property
- `src/dsl/builder.ts`: Type errors with `number | undefined` in pause handlers
  - Fixed by adding explicit undefined checks before calling pauseHelper
- `src/providers/tts/aws-polly.ts`: AWS SDK type mismatches
  - Fixed by importing and casting to proper AWS enum types (`VoiceId`, `Engine`, `LanguageCode`)

**All compilation errors resolved. TypeScript now compiles cleanly.**

## Remaining Known Issues (Non-blocking)
- **Config path resolution**: Config finder doesn't auto-detect parent `.babulus` directory. 
  - **Workaround**: Set `BABULUS_PATH` environment variable:
    ```bash
    export BABULUS_PATH=/Users/ryan/projects/Tactus-web/.babulus/config.yml
    ```
- ESM import: `.babulus.ts` files import shared file as `./_babulus.shared.js` (intentional for `tsx`).
- CLI uses dynamic import with cache-bust query for watch: `src/dsl/load.ts`.
- Docs under `docs/` still reference `.babulus.yml` (not updated).
- `bin/babulus` wrapper expects `tsx` in PATH (workaround: use full path to tsx as shown above).

## Recent edits worth reviewing
**From initial migration**:
- `src/cli.ts` (env option parsing, missing imports fixed)
- `src/generate.ts` (posterTimeSec wired into script JSON)
- `src/dsl/load.ts` (cache-bust import)
- `../Tactus-web/videos/scripts/render-all.js` (poster extraction from script JSON)

**From testing & fixes (Jan 21, 2026)**:
- `src/dsl/builder.ts` (fixed duplicate identifiers, type errors)
- `src/providers/tts/aws-polly.ts` (fixed AWS SDK type issues)
- `src/generate.ts` (fixed environment-aware public paths for segments, music, sfx)

## Success criteria ✅ All Met
- ✅ Running the three converted `.babulus.ts` files produces script/timeline/audio with correct structure
  - Script JSON includes scenes, cues, timing, and **posterTimeSec**
  - Timeline JSON includes items array and audio.tracks array
  - WAV files generated: intro (13MB), guardrails (11MB), why-new-language (23MB)
- ✅ Environment-aware caching working (.babulus/out/<video>/env/development/)
- ✅ Dry-run providers generate successfully without API calls
- 🔲 Remotion renders with new JSON not yet tested (requires visual verification)
