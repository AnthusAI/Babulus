import { marked } from "marked";
import type { DocsEntry } from "@/lib/docs-registry";

const content = `
# Cloud Rendering

Cloud rendering is not available. Babulus renders video on your own computer.

## What to do instead

1. Install the rendering tools once: Node.js, the Babulus toolchain's packages, Chromium and ffmpeg. \`babulus video check\` tells you what is missing and how to fix it.
2. Start a worker: \`babulus worker\`.
3. Submit the video: \`babulus video submit --script script.json --timeline timeline.json\`.

A submitted video waits until a worker on your computer claims it. \`babulus video status <hash>\` shows the job and, while it waits, why. When the worker finishes, \`babulus video get <hash> --out video.mp4\` downloads the MP4.

Every video command takes \`--json\` for scripts and agents.

## Why there is no cloud option

Local renders cost nothing, so a video never starts paid compute. A capped cloud fallback for video may come later; until then a video job simply waits for a local worker.

## Next Steps

- [Local Rendering](/docs/rendering/local) - Render on your machine
- [Rendering Overview](/docs/rendering/overview) - How rendering works
`;

export const renderingMode3Doc: DocsEntry = {
  slug: ["rendering", "cloud"],
  title: "Cloud Rendering (not available)",
  description: "Video renders run on your own computer; there is no cloud rendering",
  category: "Rendering",
  html: marked.parse(content, { async: false }) as string,
};
