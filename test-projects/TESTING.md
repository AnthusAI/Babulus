# Babulus Testing Guide

This document describes how to test Babulus in both local and cloud modes to ensure feature parity.

## Test Project Structure

Each test project should have this structure:

```
project-name/
├── project-name.babulus.ts    # DSL video script
├── assets/                     # Media assets
│   ├── images/
│   ├── audio/
│   └── video/
├── generated/                  # Local generation outputs
│   ├── frames/                # Rendered frames
│   ├── script.json           # Generated script
│   ├── timeline.json         # Generated timeline
│   └── output.mp4            # Final video
└── README.md                  # Project-specific docs
```

## Local Testing Workflow

### 1. Generate Script and Timeline

```bash
# Generate from DSL
npm run babulus generate test-projects/introduction-video/introduction.babulus.ts \
  --project-dir test-projects/introduction-video

# This creates:
# - src/videos/introduction-to-babulus/introduction-to-babulus.script.json
# - src/videos/introduction-to-babulus/introduction-to-babulus.timeline.json
# - public/babulus/introduction-to-babulus.wav
# - .babulus/out/introduction-to-babulus/env/development/...
```

### 2. Render Video

```bash
# Render storyboard video from script
npm run render:storyboard -- \
  --script src/videos/introduction-to-babulus/introduction-to-babulus.script.json \
  --timeline src/videos/introduction-to-babulus/introduction-to-babulus.timeline.json \
  --audio public/babulus/introduction-to-babulus.wav \
  --frames test-projects/introduction-video/generated/frames \
  --out test-projects/introduction-video/generated/introduction.mp4

# This creates:
# - test-projects/introduction-video/generated/frames/*.png
# - test-projects/introduction-video/generated/introduction.mp4
```

### 3. Verify Outputs

Check the generated files:

```bash
# View script structure
cat src/videos/introduction-to-babulus/introduction-to-babulus.script.json | jq '.scenes[] | {id, title}'

# Check video metadata
ffprobe -v quiet -print_format json -show_format -show_streams \
  test-projects/introduction-video/generated/introduction.mp4

# Play video
open test-projects/introduction-video/generated/introduction.mp4
```

## Cloud Testing Workflow

### 1. Upload Project via Studio UI

1. Navigate to Studio at http://localhost:3000 (or deployed URL)
2. Create or select an Organization
3. Create a new Project
4. Upload the `.babulus.ts` file via the UI
5. Upload assets to the `assets/` directory

### 2. Create Video Record

1. In the Project view, create a new Video
2. Link it to the uploaded `.babulus.ts` file
3. Set video title and metadata

### 3. Trigger Generation Job

1. Click "Generate" in the video editor
2. Monitor job progress in the Jobs panel
3. Check job logs for any errors

### 4. Verify Cloud Outputs

The cloud worker should create:
- `ProjectFile` with `fileType: 'video'` for script.json
- `ProjectFile` with `fileType: 'utility'` for timeline.json
- `GenerationRun` record with status 'succeeded'
- Audio files in S3 at appropriate paths

### 5. Compare Local vs Cloud

Download the cloud-generated files and compare:

```bash
# Download from S3 (via Studio UI or CLI)
# Compare script.json
diff -u \
  src/videos/introduction-to-babulus/introduction-to-babulus.script.json \
  downloads/cloud-script.json

# Compare timeline.json
diff -u \
  src/videos/introduction-to-babulus/introduction-to-babulus.timeline.json \
  downloads/cloud-timeline.json

# Compare audio (by listening)
```

## Expected Results

Both local and cloud should produce:

### Script JSON
- Proper scene structure with IDs and titles
- Accurate cue timing (startSec, endSec)
- Correct total duration
- Matching metadata (fps, width, height)

### Timeline JSON
- Frame-accurate timeline items
- Correct number of tracks
- Proper audio/visual synchronization
- Matching total frame count

### Audio Files
- WAV format (for local)
- Properly concatenated voiceover segments
- Correct duration matching script
- Clear audio quality

### Video Output (Local Only Currently)
- MP4 format
- Correct resolution (1280x720)
- Correct FPS (30)
- Audio synced with visual timeline
- Proper scene transitions

## Automated Testing

Run BDD tests to validate DSL parsing and generation:

```bash
# Run all tests
npm run bdd

# Run specific feature
npm run bdd:raw -- features/resolve-composition.feature

# Watch mode for development
npm run bdd:watch
```

## Debugging

### Local Generation Issues

```bash
# Enable verbose logging
DEBUG=* npm run babulus generate test-projects/introduction-video/introduction.babulus.ts

# Check TTS provider status
cat .babulus/out/introduction-to-babulus/env/development/usage-summary.json | jq
```

### Cloud Generation Issues

1. Check CloudWatch logs for the generation worker Lambda
2. Verify S3 bucket permissions
3. Check DynamoDB records for Video/GenerationRun/Job
4. Review job events in the Studio UI

### Rendering Issues

```bash
# Check if ffmpeg is installed
which ffmpeg

# Verify frame output
ls -la test-projects/introduction-video/generated/frames/

# Test ffmpeg manually
ffmpeg -i test-projects/introduction-video/generated/frames/frame-%06d.png \
  -i public/babulus/introduction-to-babulus.wav \
  -c:v libx264 -c:a aac \
  test.mp4
```

## Performance Benchmarks

Track generation and rendering performance:

| Metric | Local | Cloud | Target |
|--------|-------|-------|--------|
| DSL Parse Time | ~50ms | ~100ms | <200ms |
| TTS Generation (60s video) | ~2s | ~5s | <10s |
| Script Generation | ~100ms | ~200ms | <500ms |
| Frame Rendering (1800 frames) | ~180s | N/A | <300s |
| Video Encoding | ~30s | N/A | <60s |
| Total (Generate + Render) | ~212s | ~5s | <370s |

## CI/CD Integration

Automated tests run on:
- Every commit (BDD tests)
- Every PR (full integration tests)
- Nightly (performance benchmarks)

```bash
# Run CI test suite locally
npm run bdd
npm run lint
```

## Test Matrix

Ensure coverage across:

### Video Types
- ✅ Simple narration (introduction-video)
- ⏸️ With background music
- ⏸️ With sound effects
- ⏸️ With visual components
- ⏸️ Multi-composition

### DSL Features
- ✅ Scenes and cues
- ✅ Voice synthesis (dry-run)
- ⏸️ Voice synthesis (real TTS)
- ⏸️ Pauses and beats
- ⏸️ Audio clips (sfx, music)
- ⏸️ Visual markup
- ⏸️ Asset references

### Platforms
- ✅ macOS (local)
- ⏸️ Linux (local)
- ⏸️ AWS Lambda (cloud)
- ⏸️ Docker (containerized)

## Next Steps

1. ✅ Validate local generation pipeline
2. ⏸️ Complete local rendering pipeline
3. ⏸️ Upload test project to cloud
4. ⏸️ Trigger cloud generation
5. ⏸️ Compare local vs cloud outputs
6. ⏸️ Document any discrepancies
7. ⏸️ Fix cloud-specific issues
8. ⏸️ Ensure 100% parity
