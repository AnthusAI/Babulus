# Introduction Video Test Project

This test project is used to validate both local and cloud execution paths for Babulus video generation.

## Structure

```
introduction-video/
├── introduction.babulus.xml  # Main video DSL script
├── assets/                  # Media assets (images, audio, video)
├── generated/               # Generated outputs (script.json, timeline.json, audio files)
└── README.md               # This file
```

## Testing Local Execution

Test the CLI commands locally with this project:

```bash
# Generate script and timeline from DSL
npm run babulus generate test-projects/introduction-video/introduction.babulus.xml --project-dir test-projects/introduction-video

# Render video frames
npm run babulus render test-projects/introduction-video/introduction.babulus.xml --project-dir test-projects/introduction-video
```

## Testing Cloud Execution

1. Upload this project to a cloud Project via the Studio UI
2. Create a Video record pointing to `introduction.babulus.xml`
3. Trigger a generation job via the UI
4. Monitor job progress in the Jobs panel
5. Compare outputs with local execution

## Expected Outputs

After successful generation:
- `generated/script.json` - Parsed and timed script
- `generated/timeline.json` - Frame-by-frame timeline
- `generated/audio/` - Generated voiceover audio files
- `generated/frames/` - Rendered video frames (from render command)
- `generated/output.mp4` - Final rendered video

## Assets

Place test assets in the `assets/` directory:
- Images: `.jpg`, `.png`, `.webp`
- Audio: `.mp3`, `.wav`, `.aac`
- Video clips: `.mp4`, `.webm`

Reference assets in the DSL using relative paths: `./assets/filename.ext`
