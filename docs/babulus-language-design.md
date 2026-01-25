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

## Complete Example

Here's a realistic Babulus composition showing a product demo video:

```typescript
// product-demo.babulus.ts
import { composition, scene, cue, voice, background, audio, layer, text } from '@babulus/dsl';

// Configure the overall composition
export default composition('product-demo', {
  width: 1920,
  height: 1080,
  fps: 30,
}, () => {
  // Configure narration voice for entire video
  voice({
    provider: 'elevenlabs',
    voiceId: 'rachel',
    stability: 0.5,
    similarityBoost: 0.75,
  });

  // Scene 1: Introduction
  scene('intro', () => {
    // Add background image from project assets
    background('./assets/product-hero.jpg');

    // Add subtle background music
    audio('./assets/ambient-music.mp3', {
      volume: 0.3,
      fadeIn: 1.0,
    });

    // First narration cue - timing derived from audio generation
    cue('welcome', {
      narration: "Welcome to the future of video creation. With Babulus, you can describe your entire video in code.",
    });

    // Second cue in same scene
    cue('power', {
      narration: "No more clicking through timelines. Just write TypeScript and let AI handle the rest.",
      // Optional: explicit duration if not using TTS
      // duration: 4.5,
    });

    // Add animated text overlay
    layer('title-text', {
      startTime: 0.5,
      duration: 3.0,
    }, () => {
      text('Babulus Studio', {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#ffffff',
        position: { x: 960, y: 540 },
        animation: 'fadeIn',
      });
    });
  });

  // Scene 2: Feature showcase
  scene('features', () => {
    background('./assets/feature-grid.png');

    cue('feature-1', {
      narration: "Define scenes and cues. Each scene represents a visual segment, and cues control the narration timing.",
    });

    // Multiple cues create sequential narration in same scene
    cue('feature-2', {
      narration: "Add your own assets - images, audio, video clips. Reference them with simple relative paths.",
    });

    cue('feature-3', {
      narration: "Everything is version controlled. Your video is just TypeScript code in your git repository.",
    });

    // Add icon overlays with precise timing
    layer('icon-1', {
      startTime: 1.0,
      duration: 2.0,
    }, () => {
      background('./assets/icon-scenes.png', {
        position: { x: 480, y: 540 },
        scale: 0.5,
      });
    });

    layer('icon-2', {
      startTime: 6.0,
      duration: 2.0,
    }, () => {
      background('./assets/icon-assets.png', {
        position: { x: 960, y: 540 },
        scale: 0.5,
      });
    });

    layer('icon-3', {
      startTime: 11.0,
      duration: 2.0,
    }, () => {
      background('./assets/icon-git.png', {
        position: { x: 1440, y: 540 },
        scale: 0.5,
      });
    });
  });

  // Scene 3: Demo
  scene('demo', () => {
    background('./assets/editor-screenshot.png');

    cue('show-code', {
      narration: "Here's what the code looks like. Clean, readable, and fully type-safe.",
    });

    cue('generate', {
      narration: "Click generate, and Babulus handles text-to-speech, timing, and rendering. Your video is ready in minutes.",
    });

    // Add video clip overlay showing actual generation
    layer('demo-video', {
      startTime: 4.0,
      duration: 6.0,
    }, () => {
      video('./assets/generation-demo.mp4', {
        position: { x: 960, y: 540 },
        scale: 0.8,
      });
    });
  });

  // Scene 4: Call to action
  scene('cta', () => {
    background('./assets/cta-background.jpg');

    // Fade out background music
    audio('./assets/ambient-music.mp3', {
      volume: 0.1,
      fadeOut: 2.0,
    });

    cue('closing', {
      narration: "Ready to transform your video workflow? Get started with Babulus Studio today.",
    });

    layer('cta-button', {
      startTime: 1.0,
      duration: 5.0,
    }, () => {
      text('Start Creating', {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 40, y: 20 },
        borderRadius: 8,
        position: { x: 960, y: 700 },
        animation: 'pulse',
      });
    });
  });
});
```

### Key Concepts Demonstrated

**Composition Configuration**
- Width, height, and frame rate define the video canvas
- Voice settings apply to all narration cues in the video

**Scene Organization**
- Each scene is a logical segment with its own background and timing
- Scenes automatically chain together based on their cue durations

**Narration Cues**
- Cues generate TTS audio and define narration timing
- Duration is automatically calculated from generated audio
- Cues within a scene play sequentially

**Asset Management**
- Background images: `background('./assets/image.jpg')`
- Audio clips: `audio('./assets/music.mp3')` with volume and fade controls
- Video clips: `video('./assets/clip.mp4')` with positioning and scaling

**Layers for Composition**
- Layers add overlays with precise start time and duration
- Can contain text, images, or video clips
- Multiple layers enable complex compositions

**Type Safety**
- All DSL functions are fully typed TypeScript
- IDE autocomplete and type checking catch errors before generation
- Compile-time validation ensures valid composition structure

This example generates a ~60 second product demo video with:
- 4 distinct scenes
- 9 narration cues (~5-8 seconds each)
- Multiple visual layers (icons, text, demo video)
- Background music with fade in/out
- Animated text overlays

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

