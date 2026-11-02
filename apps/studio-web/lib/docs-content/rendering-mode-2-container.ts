import { marked } from "marked";
import type { DocsEntry } from "@/lib/docs-registry";

const content = `
# Container Rendering

Container rendering has been retired. The Docker image existed to run the cloud render worker, and there is no cloud render worker any more.

Render on your computer instead. The same rendering engine (Playwright and ffmpeg) runs there, and a local worker picks up videos you submit.

## Next Steps

- [Local Rendering](/docs/rendering/local) - Render on your machine
- [Cloud Rendering](/docs/rendering/cloud) - Why there is no cloud option
`;

export const renderingMode2Doc: DocsEntry = {
  slug: ["rendering", "container"],
  title: "Container Rendering (retired)",
  description: "Container rendering was retired with the cloud render worker",
  category: "Rendering",
  html: marked.parse(content, { async: false }) as string,
};
