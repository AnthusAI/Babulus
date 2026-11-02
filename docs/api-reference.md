# Babulus DSL API Reference

Legacy API documentation for the Babulus TypeScript DSL. The current authoring surface is XML (`.babulus.xml`).

## Table of Contents

- [Top-Level Functions](#top-level-functions)
- [Video Builder](#video-builder)
- [Scene Builder](#scene-builder)
- [Layer Builder](#layer-builder)
- [Cue Builder](#cue-builder)
- [Voice Builder](#voice-builder)
- [Type Definitions](#type-definitions)

---

## Top-Level Functions

### `defineVideo()`

Define a video composition.

#### Signature 1: Simplified API (Recommended)

```typescript
function defineVideo(
  title: string,
  config: DefineVideoConfig,
  fn: (builder: CompositionBuilder) => void
): VideoFileSpec | Promise<VideoFileSpec>
```

**Parameters:**
- `title` - Video title
- `config` - Video configuration object
  - `fps?: number` - Frames per second (default: 30)
  - `width?: number` - Video width in pixels (default: 1280)
  - `height?: number` - Video height in pixels (default: 720)
  - `durationSeconds?: number` - Total duration hint
- `fn` - Builder function that receives CompositionBuilder

**Example:**
```typescript
export default defineVideo(
  "My Video",
  { fps: 30, width: 1280, height: 720 },
  (video) => {
    video.scene("Scene 1", (scene) => {
      // ...
    });
  }
);
```

#### Signature 2: Simplified Without Config

```typescript
function defineVideo(
  title: string,
  fn: (builder: CompositionBuilder) => void
): VideoFileSpec | Promise<VideoFileSpec>
```

**Example:**
```typescript
export default defineVideo("My Video", (video) => {
  video.scene("Scene 1", (scene) => {
    // ...
  });
});
```

#### Signature 3: Legacy API

```typescript
function defineVideo(
  fn: (builder: VideoBuilder) => void
): VideoFileSpec | Promise<VideoFileSpec>
```

**Example:**
```typescript
export default defineVideo((video) => {
  video.composition("My Video", (comp) => {
    comp.meta({ fps: 30, width: 1280, height: 720 });
    comp.scene("Scene 1", (scene) => {
      // ...
    });
  });
});
```

---

### `defineDefaults()`

Define default configuration for compositions.

```typescript
function defineDefaults(defaults: CompositionDefaults): CompositionDefaults
```

**Parameters:**
- `defaults.voiceover?: VoiceoverConfig` - Default voiceover settings
- `defaults.audioProviders?: { sfx?: string, music?: string }` - Default audio providers
- `defaults.meta?: CompositionMeta` - Default video metadata

**Example:**
```typescript
const defaults = defineDefaults({
  voiceover: {
    provider: "openai",
    voice: "echo",
    leadInSeconds: 0.5
  },
  audioProviders: {
    sfx: "elevenlabs",
    music: "elevenlabs"
  }
});

export default defineVideo("My Video", (video) => {
  video.use(defaults);  // Apply defaults
  // ...
});
```

---

### `pause()`

Create a pause specification.

#### Fixed Pause

```typescript
function pause(seconds: number): PauseSpec
```

**Example:**
```typescript
voice.pause(0.4);  // 0.4 second pause
```

#### Gaussian Pause

```typescript
function pause(
  mean: number,
  std: number,
  clamp?: { min?: number, max?: number }
): PauseSpec
```

**Parameters:**
- `mean` - Mean duration in seconds
- `std` - Standard deviation in seconds
- `clamp` - Optional clamping bounds

**Example:**
```typescript
voice.pause(0.4, 0.1, { min: 0.2, max: 0.8 });
// Gaussian distribution: mean=0.4s, std=0.1s, clamped to [0.2, 0.8]
```

---

## Video Builder

### `.scene()`

Add a scene to the video.

```typescript
scene(
  name: string,
  optsOrFn?: Partial<SceneSpec> | ((s: SceneBuilder) => void),
  fnMaybe?: (s: SceneBuilder) => void
): SceneSpec
```

**Parameters:**
- `name` - Scene name
- `optsOrFn` - Optional scene options or builder function
- `fnMaybe` - Builder function if options provided

**Example:**
```typescript
video.scene("Introduction", (scene) => {
  scene.cue("greeting", (cue) => {
    cue.voice((v) => v.say("Hello"));
  });
});

// With options
video.scene("Introduction", { id: "intro" }, (scene) => {
  // ...
});
```

---

### `.voiceover()`

Configure voiceover settings.

```typescript
voiceover(config: VoiceoverConfig): void
```

**VoiceoverConfig:**
- `provider?: string` - TTS provider ("openai", "elevenlabs", "aws", "azure", "dry-run")
- `voice?: string` - Voice ID
- `model?: string` - Model ID
- `leadInSeconds?: number` - Silence before first word (default: 0.5)
- `trimEndSeconds?: number` - Trim from end of each segment
- `pauseBetweenItems?: PauseSpec | number` - Pause between cues
- `seed?: number` - Random seed for reproducible Gaussian pauses
- `pronunciations?: PronunciationLexemeSpec[]` - Custom pronunciations

**Example:**
```typescript
video.voiceover({
  provider: "openai",
  voice: "echo",
  model: "gpt-4o-mini-tts",
  leadInSeconds: 0.5,
  pauseBetweenItems: pause(0.3, 0.1)
});
```

---

### `.audioProviders()`

Configure audio providers for SFX and music.

```typescript
audioProviders(providers: {
  sfx?: string | null,
  music?: string | null
}): void
```

**Example:**
```typescript
video.audioProviders({
  sfx: "elevenlabs",
  music: "elevenlabs"
});
```

---

### `.use()`

Apply default configuration.

```typescript
use(defaults: CompositionDefaults): void
```

**Example:**
```typescript
const defaults = defineDefaults({ /* ... */ });
video.use(defaults);
```

---

## Scene Builder

### `.cue()`

Add a cue (narration segment) to the scene.

```typescript
cue(
  name: string,
  optsOrFn?: Partial<CueSpec> | ((c: CueBuilder) => void),
  fnMaybe?: (c: CueBuilder) => void
): CueSpec
```

**Example:**
```typescript
scene.cue("introduction", (cue) => {
  cue.voice((v) => {
    v.say("Welcome to Babulus");
    v.pause(0.3);
    v.say("Let's get started!");
  });
});
```

---

### `.pause()`

Add a pause between scene items.

```typescript
pause(seconds: number): void
pause(mean: number, std: number, clamp?: { min?: number, max?: number }): void
```

**Example:**
```typescript
scene.cue("first", (cue) => { /* ... */ });
scene.pause(0.5);  // 0.5 second pause
scene.cue("second", (cue) => { /* ... */ });
```

---

### `.music()`

Add background music to the scene.

```typescript
music(id: string, opts: {
  at?: number,              // Start offset in seconds (default: 0)
  volume?: number,          // Volume 0-1 (default: 1)
  fadeTo?: VolumeFadeToSpec,
  fadeOut?: VolumeFadeOutSpec,
  sourceId?: string,        // Pre-generated audio asset
  playThrough?: boolean,    // Continue beyond scene end
  prompt?: string,          // Generation prompt
  durationSeconds?: number,
  variants?: number,        // Generate N variants
  pick?: number,            // Pick variant N
  modelId?: string,
  forceInstrumental?: boolean
}): void
```

**Example:**
```typescript
scene.music("background", {
  prompt: "Upbeat electronic music",
  volume: 0.7,
  fadeTo: { volume: 0.3, afterSeconds: 5, fadeDurationSeconds: 2 },
  fadeOut: { volume: 0.7, beforeEndSeconds: 3, fadeDurationSeconds: 2 }
});
```

---

### `.sfx()`

Add sound effects to the scene.

```typescript
sfx(id: string, opts: {
  at?: number,         // Start offset in seconds (default: 0)
  volume?: number,     // Volume 0-1 (default: 1)
  fadeTo?: VolumeFadeToSpec,
  fadeOut?: VolumeFadeOutSpec,
  sourceId?: string,   // Pre-generated audio asset
  prompt?: string,     // Generation prompt
  durationSeconds?: number,
  variants?: number,
  pick?: number,
  modelId?: string
}): void
```

**Example:**
```typescript
scene.sfx("whoosh", {
  at: 2.5,
  prompt: "Whoosh sound effect",
  volume: 0.8
});
```

---

### `.styles()`

Set scene-level styles (cascade to layers/components).

```typescript
styles(styles: VisualStyles): void
```

**VisualStyles:**
- `background?: string` - CSS background
- `color?: string` - Text color
- `opacity?: number` - Opacity 0-1
- `fontFamily?: string` - Font family
- `fontSize?: number` - Font size in pixels
- `fontWeight?: number | string` - Font weight
- `textAlign?: "left" | "center" | "right"` - Text alignment

**Example:**
```typescript
scene.styles({
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  fontFamily: "Arial, sans-serif",
  color: "#ffffff",
  fontSize: 24
});
```

---

### `.markup()`

Set scene-level semantic markup (cascade to layers/components).

```typescript
markup(markup: SemanticMarkup): void
```

**Example:**
```typescript
scene.markup({
  language: "en",
  category: "tutorial",
  campaign: "product-launch"
});
```

---

### `.layer()`

Create a layer to group components.

```typescript
layer(
  id: string,
  opts: {
    styles?: VisualStyles,
    markup?: SemanticMarkup,
    timing?: { startSec?: number, endSec?: number },
    visible?: boolean,
    zIndex?: number
  },
  fn: (layer: LayerBuilder) => void
): void
```

**Example:**
```typescript
scene.layer("content", {
  zIndex: 10,
  timing: { startSec: 0, endSec: 5 },
  styles: { opacity: 0.9 }
}, (layer) => {
  layer.title({ text: "Hello" });
});
```

---

### Shorthand Component Methods

Add components directly to the scene (backward compat).

#### `.title()`

```typescript
title(props: Record<string, unknown>): void
```

#### `.subtitle()`

```typescript
subtitle(props: Record<string, unknown>): void
```

#### `.rectangle()`

```typescript
rectangle(props: Record<string, unknown>): void
```

#### `.progressBar()`

```typescript
progressBar(props?: Record<string, unknown>): void
```

**Example:**
```typescript
scene.title({ text: "Hello", fontSize: 48 });
scene.subtitle({ text: "World", fontSize: 24 });
scene.progressBar({ position: "bottom" });
```

---

## Layer Builder

### `.component()`

Add a custom component to the layer.

```typescript
component(
  id: string,
  type: string | React.ComponentType<any>,
  props?: Record<string, unknown>,
  options?: {
    markup?: SemanticMarkup,
    styles?: VisualStyles,
    zIndex?: number,
    visible?: boolean,
    timing?: { startSec?: number, endSec?: number }
  }
): this
```

**Example:**
```typescript
layer.component(
  "hero-title",
  "Title",
  { text: "Welcome", fontSize: 56 },
  {
    markup: { role: "heading", ariaLevel: 1 },
    styles: { color: "#ffffff" },
    timing: { startSec: 0, endSec: 3 }
  }
);
```

---

### `.rectangle()`

Add a rectangle component to the layer.

```typescript
rectangle(props: Record<string, unknown>): this
```

**Props:**
- `color?: string` - Solid color
- `gradient?: string` - CSS gradient
- `x?: number` - X position (default: 0)
- `y?: number` - Y position (default: 0)
- `width?: number` - Width in pixels (default: 1280)
- `height?: number` - Height in pixels (default: 720)
- `borderRadius?: number` - Border radius (default: 0)
- `opacity?: number` - Opacity 0-1

**Example:**
```typescript
layer.rectangle({
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  width: 1280,
  height: 720
});
```

---

### `.title()`

Add a title component to the layer.

```typescript
title(props: Record<string, unknown>): this
```

**Props:**
- `text?: string` - Text content
- `binding?: string` - Data binding ("scene.title", "scene.id")
- `fontSize?: number` - Font size (default: 48)
- `fontWeight?: number | string` - Font weight (default: 700)
- `color?: string` - Text color (default: "#ffffff")
- `textAlign?: "left" | "center" | "right"` - Alignment (default: "left")
- `position?: { x: number, y: number }` - Position (default: { x: 48, y: 48 })

**Example:**
```typescript
layer.title({
  text: "Welcome to Babulus",
  fontSize: 64,
  fontWeight: 700,
  color: "#ffffff",
  textAlign: "center",
  position: { x: 640, y: 300 }
});
```

---

### `.subtitle()`

Add a subtitle component to the layer.

```typescript
subtitle(props: Record<string, unknown>): this
```

**Props:**
- `text?: string` - Text content (overrides binding)
- `binding?: string` - Data binding ("cue.text", "cue.label", "cue.id")
- `fontSize?: number` - Font size (default: 20)
- `fontWeight?: number | string` - Font weight (default: 400)
- `color?: string` - Text color (default: "#cbd5f5")
- `textAlign?: "left" | "center" | "right"` - Alignment (default: "left")
- `position?: { x: number, y: number }` - Position (default: { x: 48, y: 120 })

**Example:**
```typescript
layer.subtitle({
  text: "Create videos with code",
  fontSize: 24,
  color: "#e0e7ff",
  textAlign: "center",
  position: { x: 640, y: 380 }
});
```

---

### `.progressBar()`

Add a progress bar component to the layer.

```typescript
progressBar(props?: Record<string, unknown>): this
```

**Props:**
- `position?: "top" | "bottom"` - Position (default: "bottom")
- `height?: number` - Height in pixels (default: 8)
- `color?: string` - Bar color (default: gradient)
- `backgroundColor?: string` - Track color (default: rgba gray)

**Example:**
```typescript
layer.progressBar({
  position: "bottom",
  height: 10,
  color: "#00ff00"
});
```

---

## Cue Builder

### `.voice()`

Add voice segments to the cue.

```typescript
voice(fn: (v: VoiceBuilder) => void): void
```

**Example:**
```typescript
cue.voice((v) => {
  v.say("Hello world");
  v.pause(0.3);
  v.say("Welcome to Babulus");
});
```

---

### `.bullets()`

Add bullet points to the cue (for display).

```typescript
bullets(items: string[]): void
```

**Example:**
```typescript
cue.bullets([
  "First point",
  "Second point",
  "Third point"
]);
```

---

### `.markup()`

Add semantic markup to the cue.

```typescript
markup(markup: SemanticMarkup): void
```

**Example:**
```typescript
cue.markup({
  importance: "high",
  trackingId: "intro-cue"
});
```

---

## Voice Builder

### `.say()`

Add a text segment to be synthesized.

```typescript
say(text: string, opts?: { trimEndSeconds?: number }): void
```

**Example:**
```typescript
voice.say("Hello world");
voice.say("This is Babulus", { trimEndSeconds: 0.1 });
```

---

### `.pause()`

Add a pause between voice segments.

```typescript
pause(seconds: number): void
pause(mean: number, std: number, clamp?: { min?: number, max?: number }): void
```

**Example:**
```typescript
voice.say("First sentence");
voice.pause(0.5);  // Fixed 0.5s pause
voice.say("Second sentence");
voice.pause(0.4, 0.1, { min: 0.2, max: 0.8 });  // Gaussian pause
voice.say("Third sentence");
```

---

## Type Definitions

### CompositionSpec

```typescript
type CompositionSpec = {
  id: string;
  title?: string | null;
  meta?: CompositionMeta;
  posterTime?: number | null;
  voiceover?: VoiceoverConfig;
  audioProviders?: { sfx?: string | null; music?: string | null };
  scenes: SceneSpec[];
  audioPlan?: AudioPlan;
};
```

### SceneSpec

```typescript
type SceneSpec = {
  id: string;
  title: string;
  time?: TimeRange;
  items: Array<CueSpec | PauseSpec>;
  markup?: SemanticMarkup;
  styles?: VisualStyles;
  layers?: LayerSpec[];
  components?: ComponentSpec[];
};
```

### LayerSpec

```typescript
type LayerSpec = {
  id: string;
  styles?: VisualStyles;
  markup?: SemanticMarkup;
  timing?: { startSec?: number; endSec?: number };
  visible?: boolean;
  zIndex?: number;
  components: ComponentSpec[];
};
```

### ComponentSpec

```typescript
type ComponentSpec = {
  id: string;
  type: string | React.ComponentType<any>;
  props?: Record<string, unknown>;
  bindings?: ComponentBindings;
  styles?: VisualStyles;
  markup?: SemanticMarkup;
  zIndex?: number;
  visible?: boolean;
  timing?: { startSec?: number; endSec?: number };
};
```

### VisualStyles

```typescript
type VisualStyles = {
  background?: string;
  color?: string;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  textAlign?: "left" | "center" | "right";
};
```

### SemanticMarkup

```typescript
type SemanticMarkup = Record<string, MarkupValue>;

type MarkupValue =
  | string
  | number
  | boolean
  | null
  | MarkupValue[]
  | { [key: string]: MarkupValue };
```

### CueSpec

```typescript
type CueSpec = {
  kind: "cue";
  id: string;
  label: string;
  segments: VoiceSegmentSpec[];
  bullets: string[];
  markup?: SemanticMarkup;
  time?: TimeRange;
  provider?: string | null;
};
```

### VoiceSegmentSpec

```typescript
type VoiceSegmentSpec =
  | { kind: "text"; text: string; trimEndSec?: number | null }
  | { kind: "pause"; pause: PauseSpec };
```

### PauseSpec

```typescript
type PauseSpec =
  | { kind: "pause"; mode: "fixed"; seconds: number }
  | { kind: "pause"; mode: "gaussian"; mean: number; std: number; min?: number; max?: number };
```

---

## See Also

- [Component System Guide](./component-system.md) - Comprehensive guide with examples
- [Cascading Markup](./cascading-markup.md) - Semantic markup documentation
- [Main README](../README.md) - Quick start and CLI reference
