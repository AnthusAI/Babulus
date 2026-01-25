# Babulus Language Design — Current State (Alpha)

**Status:** Alpha. This document captures the language as it exists and how it is used today.

---

## Purpose

Babulus is a TypeScript DSL that describes video structure, narration, and audio timing. It is the canonical source for generation and rendering.

---

## Canonical Source

- Canonical file type: `.babulus.ts`
- Lives in project folders: `org/{orgId}/projects/{projectId}/*.babulus.ts`
- Also stored as raw source text in `StoryboardVersion` records for version history.
- Generated artifacts (script/timeline/audio) are derived outputs and not edited directly.

## Project Organization

Projects are folders (S3 for web, local filesystem for desktop) containing:
- `video-001.babulus.ts` - Video composition files (shown in UI)
- `_helpers.babulus.ts` - Utility code (hidden from video list, can be imported)
- `assets/logo.png` - User-uploaded assets (images, audio, video)

---

## Core Concepts (as used today)

### Composition
Defines the overall video configuration:
- fps, width, height
- duration (derived from scenes/cues or explicit)

### Scenes and Cues
- A video is a sequence of scenes.
- Scenes contain cues (narration blocks, timings).
- Cues determine the timing and narration text.

### Audio
- Voice cues generate narration audio.
- Additional audio clips can be attached and mixed via timeline artifacts.

---

## Determinism & Rendering

- Preview and render outputs are expected to be deterministic given:
  - DSL source
  - assets
  - toolchain versions
- In alpha, preview is generated from artifacts produced by generation runs.

---

## Current Usage in Studio

- Editor panel holds DSL source text (Monaco).
- Preview uses `script.json` from the most recent successful generation run.
- If no run exists, the preview falls back to placeholder script data.

## Imports and Code Reuse

Files starting with `_` are utility modules that can be imported by video compositions:

```typescript
// _helpers.babulus.ts
export function fadeTransition(duration: number) {
  // ... transition logic
}

// video-001.babulus.ts
import { fadeTransition } from './_helpers.babulus.ts';

export default composition('my-video', () => {
  // Use fadeTransition...
});
```

## Asset References

Videos reference assets stored in the same project folder:

```typescript
scene('intro', () => {
  background('./assets/logo.png');
  audio('./assets/music.wav');
});
```

At execution time (client preview or server generation), these paths resolve to:
- **Web**: Pre-signed S3 URLs via `getUrl('org/{orgId}/projects/{projectId}/assets/logo.png')`
- **Desktop**: Local filesystem paths relative to project folder

---

## Known Gaps (Alpha)

- No sandboxed resolver for `.babulus.ts` in the web app.
- No AST validation of DSL in the UI (planned).
- Live preview from editor source is not wired yet.
- Import resolution for `_helpers.babulus.ts` style includes not implemented.
- Asset path resolution from `./assets/*` references not built.
- File listing API to discover project files (videos, utilities, assets) not created.

---

## Execution Model

Babulus code runs in two contexts with the same source:

**Client-side (Preview)**
- Fetch `.babulus.ts` from S3 (or local disk)
- Parse and evaluate to show structure/timing
- Use existing generated artifacts (audio) for playback
- Quick iteration on composition without regenerating audio
- Resolve asset references to pre-signed URLs

**Server-side (Generation/Render)**
- Fetch same `.babulus.ts` from S3 (or local disk)
- Execute in Node.js environment (Lambda/ECS or local agent)
- Generate audio (TTS, music, effects) as needed
- Produce final render artifacts
- Upload outputs back to S3 or local `.generated/` folder

## Next Steps (Beta-oriented)

- Implement safe, deterministic DSL resolution in a controlled environment.
- Add static validation with helpful errors (file/line/column).
- Build import resolution for `_*.babulus.ts` utility modules.
- Implement asset path resolution for `./assets/*` references.
- Create project filesystem abstraction (S3 + local) with unified API.
- Enable client-side preview for lightweight composition changes.

