# Rendering Modes Status

This document tracks the status of the three rendering modes for Babulus video generation.

## Mode 1: Local (No Container) ✅ WORKING

**Status:** Fully functional  
**Test Command:** `npx tsx test-local-render.ts [options]`

### Features Working:
- Full video rendering at 30fps
- Preview mode (2s at 15fps by default)
- Scene-based rendering (`--scene <id>` or `--scene <index>`)
- Audio synchronization (pauses now represented as silence)
- Custom offset, duration, and FPS parameters

### Example Usage:
```bash
# Full render (6+ minutes)
npx tsx test-local-render.ts

# Preview mode - first 2 seconds
npx tsx test-local-render.ts --preview

# Preview from middle of video
npx tsx test-local-render.ts --preview --offset 15 --duration 2

# Render specific scene
npx tsx test-local-render.ts --scene cta
npx tsx test-local-render.ts --scene 8
```

### How It Works:
- Runs directly on your machine using Node.js
- Uses Puppeteer to render frames in Chromium
- Uses ffmpeg to encode video with audio
- Loads Tactus-web intro video assets from mounted directory

---

## Mode 2: Local Container ✅ WORKING

**Status:** Fully functional  
**Docker Image:** `babulus-render-worker:latest`

### Build Image:
```bash
docker build -t babulus-render-worker:latest -f Dockerfile .
```

### Test Command:
```bash
docker run --rm \
  -v "$(pwd):/workspace-src:ro" \
  -v "/path/to/Tactus-web/videos:/tactus-web:ro" \
  -w /app \
  babulus-render-worker:latest \
  sh -c "cp /workspace-src/test-container-local.ts . && npx tsx test-container-local.ts --preview"
```

### Key Points:
- Container has its own `node_modules` with Linux binaries
- Host workspace mounted read-only to `/workspace-src`
- Tactus-web assets mounted read-only to `/tactus-web`
- Working directory is `/app` (container's code)
- Output saved to container's filesystem (can be copied out or volumes adjusted)

### Known Issues:
- Must avoid using host's `node_modules` (esbuild platform mismatch)
- Test script currently uses `introduction-to-babulus` video (can be updated to use Tactus intro)

---

## Mode 3: AWS ECS Fargate ⚠️ NOT YET TESTED

**Status:** Infrastructure deployed, needs fixes  
**Entry Point:** Lambda trigger → ECS Fargate tasks

### Required Fixes (from plan):
1. **Lambda bundling:** Handler not properly compiled with esbuild
2. **AMPLIFY_OUTPUTS:** Environment variable empty in ECS task definition
3. **Two-deployment requirement:** First deploy creates `amplify_outputs.json`, second deploy populates it in ECS

### Infrastructure Files:
- `apps/studio-web/amplify/backend.ts` - CDK infrastructure (lines 200-376)
- `apps/studio-web/amplify/functions/render-trigger/handler.ts` - Lambda trigger
- `src/worker-ecs.ts` - ECS worker entrypoint
- `scripts/build-render-worker.sh` - Docker build/push script

### Next Steps:
1. Fix Lambda handler bundling in `backend.ts`
2. Read `amplify_outputs.json` at CDK synthesis time
3. Deploy infrastructure with fixes
4. Build and push Docker image
5. Redeploy to populate AMPLIFY_OUTPUTS
6. Test end-to-end cloud rendering

---

## Summary

| Mode | Status | Speed | Use Case |
|------|--------|-------|----------|
| Mode 1 | ✅ Working | Fast iteration | Local development, testing |
| Mode 2 | ✅ Working | Medium | Testing containerized workflow |
| Mode 3 | ⚠️ Needs fixes | Production scale | Cloud rendering at scale |

---

## Recent Fixes Applied

### Audio Synchronization (All Modes)
- **Problem:** Audio file only contained TTS segments, missing pauses
- **Result:** Audio ended at 373s while video timeline was 388s
- **Fix:** Generate silence WAV files for all pause types
- **Files:** `src/generate.ts`, `packages/renderer/src/encode.ts`, `packages/renderer/src/pipeline.ts`

### Scene Rendering (Mode 1)
- **Feature:** Render individual scenes for faster iteration
- **Usage:** `--scene cta` or `--scene 8`
- **Benefit:** 6-second render instead of 6+ minute full render

### Preview Mode Audio Offset (All Modes)
- **Problem:** When rendering from offset, audio played from start
- **Fix:** Add `-ss` flag before audio input in ffmpeg
- **Result:** Audio synchronized with video frames in preview mode

---

Last Updated: 2026-02-01
