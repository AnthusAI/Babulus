import { marked } from "marked";
import type { DocsEntry } from "@/lib/docs-registry";

const content = `
# Video Rendering

After your video script and timeline have been generated, the next step is **rendering** - transforming your composition into a final MP4 video file.

## Generation vs. Rendering

It's important to understand the distinction between these two phases:

### Generation
- **What it creates:** Script, timeline, and audio assets
- **AI-powered:** Uses LLMs to write content, structure scenes, and synthesize speech
- **Output:** JSON files (script.json, timeline.json) and audio file (WAV)
- **Speed:** Fast (typically 10-30 seconds)
- **Cost:** API calls to AI services

### Rendering
- **What it creates:** Final MP4 video file
- **Deterministic process:** Captures browser frames and encodes video
- **Output:** MP4 file ready for playback
- **Speed:** Slower (1-5 minutes depending on video length)
- **Cost:** Compute resources (CPU + RAM)

**Think of it this way:** Generation is the creative phase where AI writes your video. Rendering is the production phase where that design gets turned into pixels.

## Why Separate Generation and Rendering?

This separation provides several benefits:

1. **Iteration without regeneration** - Tweak styles, timing, or layout without calling AI APIs again
2. **Multiple formats from one generation** - Render different aspect ratios or quality levels
3. **Cost efficiency** - Regenerate only when content changes, not for visual updates
4. **Parallel processing** - Generate many videos quickly, render them later in batch

## Rendering Modes

Babulus renders video on your own computer, with Playwright and ffmpeg. A local worker (\`babulus worker\`) picks up videos you submit with \`babulus video submit\`, so a render costs nothing and never starts cloud compute. Cloud rendering is not available.

## What Happens During Rendering?

The rendering process follows these steps:

1. **Load composition** - Read script.json and timeline.json
2. **Launch browser** - Start headless Chromium with Playwright
3. **Render frames** - Capture video frames at your target FPS (typically 30fps)
   - Navigate through timeline
   - Apply animations and transitions
   - Capture each frame as PNG
4. **Encode video** - Use ffmpeg to:
   - Combine PNG frames into video stream
   - Merge audio track
   - Encode as H.264 MP4
5. **Save output** - Write final MP4 file

For a 60-second video at 30fps, this means capturing 1,800 individual frames and encoding them into a single video file.

## Performance Characteristics

**Local rendering:**
- 60-second video: ~2-3 minutes
- Dependent on your machine's CPU/RAM
- No network latency

## Next Steps

- [Local Rendering](/docs/rendering/local) - Start here
- [Cloud Rendering](/docs/rendering/cloud) - Why there is no cloud option

## Technical Details

Want to understand what's happening under the hood?

- Video encoding: H.264, bitrates, quality settings (see Quality Settings in [Mode 1: Local Rendering](/docs/rendering/local))
- Frame capture: how Playwright captures browser output (see "What Happens During Rendering" above)
- Performance tuning: see "Performance Characteristics" above and Performance Tips in [Mode 1: Local Rendering](/docs/rendering/local)
`;

export const renderingOverviewDoc: DocsEntry = {
  slug: ["rendering", "overview"],
  title: "Rendering Overview",
  description: "How Babulus turns generated compositions into final MP4 videos",
  category: "Overview",
  html: marked.parse(content, { async: false }) as string,
};
