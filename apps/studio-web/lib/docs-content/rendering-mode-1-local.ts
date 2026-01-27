import { marked } from "marked";
import type { DocsEntry } from "@/lib/docs-registry";

const content = `
# Mode 1: Local Rendering

Run video rendering directly on your machine without Docker. Best for development, testing, and quick iterations.

## Overview

Local rendering executes the render process natively on your host operating system. No containers, no virtualization - just Node.js running Playwright and ffmpeg directly.

**Ideal for:**
- Development and debugging
- Quick test renders
- Iterating on visual styles
- Small batch renders (1-10 videos)

**Not ideal for:**
- Production deployments
- Rendering on machines without dependencies
- Reproducible builds across different systems

## Prerequisites

You need these installed on your machine:

### 1. Node.js 20+
\`\`\`bash
node --version  # Should show v20.x.x or higher
\`\`\`

### 2. ffmpeg
\`\`\`bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
\`\`\`

Verify installation:
\`\`\`bash
ffmpeg -version
\`\`\`

### 3. Playwright & Chromium
Installed automatically with project dependencies:
\`\`\`bash
npm install
npx playwright install chromium --with-deps
\`\`\`

## Quick Start

### Step 1: Generate Your Video

First, create a video composition:

\`\`\`bash
cd test-projects/my-video
npx babulus generate my-video.babulus.ts
\`\`\`

This creates:
- \`src/videos/my-video/my-video.script.json\`
- \`src/videos/my-video/my-video.timeline.json\`
- \`public/babulus/my-video.wav\`

### Step 2: Render Locally

Create a render script:

\`\`\`typescript
// test-local-render.ts
import { readFileSync } from 'fs';
import { renderVideoFromScript } from './packages/renderer/src/video-render.js';

async function renderVideo() {
  const videoName = 'my-video';

  // Load generated assets
  const script = JSON.parse(readFileSync(\`src/videos/\${videoName}/\${videoName}.script.json\`, 'utf8'));
  const timeline = JSON.parse(readFileSync(\`src/videos/\${videoName}/\${videoName}.timeline.json\`, 'utf8'));
  const audioPath = \`public/babulus/\${videoName}.wav\`;

  // Render configuration
  const result = await renderVideoFromScript({
    script,
    timeline,
    audioPath,
    outputPath: \`public/babulus/\${videoName}.mp4\`,
    framesDir: \`.babulus/temp/frames/\${videoName}\`,
    title: 'My Video',
  });

  console.log(\`✓ Rendered: \${result.outputPath}\`);
  console.log(\`  Duration: \${result.durationSec}s\`);
  console.log(\`  Size: \${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB\`);
}

renderVideo().catch(console.error);
\`\`\`

Run it:

\`\`\`bash
npx tsx test-local-render.ts
\`\`\`

### Step 3: Find Your Video

Your rendered MP4 will be at:
\`\`\`
public/babulus/my-video.mp4
\`\`\`

## Configuration Options

The \`renderVideoFromScript\` function accepts these options:

\`\`\`typescript
{
  // Required
  script: VideoScript,           // Parsed script.json
  timeline: Timeline,             // Parsed timeline.json
  audioPath: string,              // Path to audio WAV file
  outputPath: string,             // Where to save MP4

  // Optional
  framesDir?: string,             // Where to store frame PNGs (default: .babulus/temp/frames)
  title?: string,                 // Video title for metadata
  fps?: number,                   // Frames per second (default: 30)
  width?: number,                 // Video width in pixels (default: 1920)
  height?: number,                // Video height in pixels (default: 1080)
  videoBitrate?: string,          // ffmpeg bitrate (default: '5000k')
  audioBitrate?: string,          // ffmpeg audio bitrate (default: '192k')
  keepFrames?: boolean,           // Don't delete frame PNGs after encode (default: false)
}
\`\`\`

## Advanced Usage

### Custom Resolution

Render in different aspect ratios:

\`\`\`typescript
// 16:9 HD
await renderVideoFromScript({
  ...config,
  width: 1920,
  height: 1080,
});

// 9:16 vertical (mobile)
await renderVideoFromScript({
  ...config,
  width: 1080,
  height: 1920,
});

// 1:1 square (Instagram)
await renderVideoFromScript({
  ...config,
  width: 1080,
  height: 1080,
});
\`\`\`

### Quality Settings

Adjust encoding quality:

\`\`\`typescript
// High quality (larger file)
await renderVideoFromScript({
  ...config,
  videoBitrate: '8000k',
  audioBitrate: '320k',
});

// Low quality (smaller file)
await renderVideoFromScript({
  ...config,
  videoBitrate: '2000k',
  audioBitrate: '128k',
});
\`\`\`

### Batch Rendering

Render multiple videos:

\`\`\`typescript
const videos = ['intro', 'main-content', 'outro'];

for (const videoName of videos) {
  console.log(\`Rendering \${videoName}...\`);
  await renderVideoFromScript({
    script: JSON.parse(readFileSync(\`src/videos/\${videoName}/\${videoName}.script.json\`, 'utf8')),
    timeline: JSON.parse(readFileSync(\`src/videos/\${videoName}/\${videoName}.timeline.json\`, 'utf8')),
    audioPath: \`public/babulus/\${videoName}.wav\`,
    outputPath: \`public/babulus/\${videoName}.mp4\`,
    framesDir: \`.babulus/temp/frames/\${videoName}\`,
  });
}
\`\`\`

## Performance Tips

### Use SSD Storage
Frame capture involves heavy I/O. Store \`framesDir\` on SSD for 2-3x speedup.

### Allocate More RAM
Playwright + ffmpeg can use significant memory:
- 8GB minimum
- 16GB recommended
- 32GB+ for parallel renders

### Close Other Applications
Rendering is CPU-intensive. Close browser tabs, IDEs, and other heavy apps.

### Use Faster CPUs
Rendering speed scales nearly linearly with CPU cores:
- 4 cores: ~3 minutes for 60s video
- 8 cores: ~90 seconds for 60s video
- 16 cores: ~45 seconds for 60s video

## Troubleshooting

### Error: "Cannot find module './packages/renderer/src/video-render.js'"
**Solution:** Run from repository root directory:
\`\`\`bash
cd /path/to/Babulus
npx tsx test-local-render.ts
\`\`\`

### Error: "ffmpeg: command not found"
**Solution:** Install ffmpeg:
\`\`\`bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install ffmpeg
\`\`\`

### Error: "Playwright browser not found"
**Solution:** Install Chromium:
\`\`\`bash
npx playwright install chromium --with-deps
\`\`\`

### Slow Rendering
**Check CPU usage:**
\`\`\`bash
# macOS
top -l 1 | grep "CPU usage"

# Linux
top -bn1 | grep "Cpu(s)"
\`\`\`

If CPU usage is low, you might have throttling enabled. Check Activity Monitor (macOS) or System Monitor (Linux).

### Out of Memory
If rendering fails with "JavaScript heap out of memory":
\`\`\`bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsx test-local-render.ts
\`\`\`

## Pros & Cons

### Advantages
✅ Fast iteration cycle
✅ No Docker overhead
✅ Easy to debug with breakpoints
✅ Runs anywhere Node.js runs
✅ Full access to local filesystem

### Disadvantages
❌ Requires installing dependencies locally
❌ Not isolated from host system
❌ Inconsistent behavior across different machines
❌ Not suitable for production at scale

## Next Steps

- [Mode 2: Container Rendering](/docs/rendering/container) - Test with Docker
- [Mode 3: Cloud Rendering](/docs/rendering/cloud) - Deploy to AWS
- [Performance Tuning](/docs/rendering/performance) - Optimize speed
`;

export const renderingMode1Doc: DocsEntry = {
  slug: ["rendering", "local"],
  title: "Local Rendering",
  description: "Render videos directly on your machine for fast development iteration",
  category: "Rendering",
  html: marked.parse(content, { async: false }) as string,
};
