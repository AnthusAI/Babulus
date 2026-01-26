# Component System Guide

Babulus uses a component-based architecture for building visual layouts in your videos. This guide covers the complete system including layers, components, styles, and semantic markup.

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Defining Videos](#defining-videos)
4. [Scenes and Layers](#scenes-and-layers)
5. [Components](#components)
6. [Cascading Styles](#cascading-styles)
7. [Cascading Markup](#cascading-markup)
8. [Built-in Components](#built-in-components)
9. [Component Timing and Visibility](#component-timing-and-visibility)
10. [Complete Examples](#complete-examples)

---

## Overview

The Babulus component system provides:

- **Blank slate scenes** - Black background by default, no magic elements
- **Explicit component composition** - Add only what you need
- **Layer-based organization** - Group components with shared styles and timing
- **Cascading styles** - CSS-like inheritance (scene → layer → component)
- **Cascading markup** - Semantic metadata that flows down the hierarchy
- **Built-in component library** - Title, Subtitle, ProgressBar, Rectangle
- **Extensible** - Add your own custom React components

---

## Core Concepts

### Hierarchy

```
Video
  └─ Scene (defines visual space)
       ├─ Scene-level styles (cascade to all below)
       ├─ Scene-level markup (cascade to all below)
       ├─ Layer (groups related components)
       │    ├─ Layer-level styles (cascade to components)
       │    ├─ Layer-level markup (cascade to components)
       │    └─ Components (visual elements)
       │         ├─ Component-level styles
       │         └─ Component-level markup
       └─ Standalone components (backward compat)
```

### Design Principles

1. **Explicit over implicit** - All visual elements must be explicitly added
2. **Composition over configuration** - Build complex layouts from simple components
3. **Cascade over duplication** - Define once at scene/layer, inherit below
4. **Layers for grouping** - Use z-index for depth, timing for show/hide

---

## Defining Videos

### New Simplified API (Recommended)

```typescript
import { defineVideo } from "babulus/dsl";

export default defineVideo(
  "My Video Title",
  { fps: 30, width: 1280, height: 720, durationSeconds: 15 },
  (video) => {
    video.voiceover({ provider: "dry-run" });

    video.scene("Scene 1", (scene) => {
      // Add components, layers, styles
    });
  }
);
```

**What changed:**
- ✅ `video.meta()` consolidated into second parameter
- ✅ Removed "composition" layer (was unnecessary nesting)
- ✅ Cleaner, more intuitive API

### Legacy API (Still Supported)

```typescript
export default defineVideo((video) => {
  video.composition("My Video Title", (comp) => {
    comp.meta({ fps: 30, width: 1280, height: 720 });
    comp.scene("Scene 1", (scene) => { /* ... */ });
  });
});
```

---

## Scenes and Layers

### Basic Scene

```typescript
video.scene("Introduction", (scene) => {
  // By default: black background, no components

  scene.cue("greeting", (cue) => {
    cue.voice((v) => v.say("Hello world"));
  });
});
```

### Scene with Styles

```typescript
video.scene("Styled Scene", (scene) => {
  scene.styles({
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#ffffff",
    opacity: 1.0
  });

  // Styles cascade to all layers and components
});
```

### Scene with Layers

```typescript
video.scene("Layered Scene", (scene) => {
  // Background layer (behind everything)
  scene.layer("background", { zIndex: -10 }, (layer) => {
    layer.rectangle({
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      width: 1280,
      height: 720
    });
  });

  // Content layer (main content)
  scene.layer("content", { zIndex: 10 }, (layer) => {
    layer.title({
      text: "Welcome",
      fontSize: 56,
      position: { x: 640, y: 300 }
    });
  });

  // UI layer (always on top)
  scene.layer("ui", { zIndex: 100 }, (layer) => {
    layer.progressBar({ position: "bottom" });
  });
});
```

### Layer with Timing

```typescript
scene.layer("title-card", {
  timing: {
    startSec: 0,
    endSec: 3  // Show for first 3 seconds only
  },
  zIndex: 50
}, (layer) => {
  layer.title({ text: "Coming Soon..." });
});
```

---

## Components

### Adding Components to Layers

```typescript
layer.component(
  "unique-id",           // Component ID (unique within scene)
  "Title",               // Component type (from registry)
  { text: "Hello" },     // Props
  {                      // Options (optional)
    styles: { color: "#ff0000" },
    markup: { role: "heading" },
    zIndex: 10,
    visible: true,
    timing: { startSec: 1, endSec: 5 }
  }
);
```

### Shorthand Component Methods

```typescript
// These are convenience methods that call component() internally
layer.title({ text: "Hello", fontSize: 48 });
layer.subtitle({ text: "World", fontSize: 24 });
layer.rectangle({ color: "#ff0000", width: 200, height: 100 });
layer.progressBar({ position: "bottom", height: 8 });
```

### Adding Components Directly to Scene (Backward Compat)

```typescript
scene.title({ text: "Hello" });
scene.subtitle({ text: "World" });
scene.progressBar();
```

**Note**: Components added directly to scene are rendered in the order added. Use layers for better z-index control.

---

## Cascading Styles

Styles flow from scene → layer → component, similar to CSS inheritance.

### Available Style Properties

```typescript
type VisualStyles = {
  // Color & appearance
  background?: string;      // CSS background (color, gradient, image)
  color?: string;           // Text color
  opacity?: number;         // 0-1 (multiplies down cascade)

  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  textAlign?: "left" | "center" | "right";

  // Future: transforms, filters, etc.
};
```

### Cascade Rules

1. **Properties override** - Child value replaces parent value
2. **Opacity multiplies** - Child opacity × parent opacity
3. **Explicit wins** - Component > Layer > Scene

### Example: Opacity Multiplication

```typescript
scene.styles({ opacity: 0.8 });  // Scene: 80%

scene.layer("content", {
  styles: { opacity: 0.5 }       // Layer: 50% → Effective: 40% (0.8 × 0.5)
}, (layer) => {
  layer.rectangle({
    color: "#ff0000",
    opacity: 0.5                 // Component: 50% → Effective: 20% (0.8 × 0.5 × 0.5)
  });
});
```

### Example: Property Inheritance

```typescript
scene.styles({
  fontFamily: "Arial",
  fontSize: 24,
  color: "#ffffff"
});

scene.layer("content", {
  styles: { fontSize: 32 }  // Override fontSize, inherit others
}, (layer) => {
  layer.title({
    text: "Hello",
    color: "#ff0000"  // Override color, inherit fontFamily and layer fontSize
  });
  // Result: fontFamily="Arial", fontSize=32, color="#ff0000"
});
```

---

## Cascading Markup

Semantic markup provides metadata for accessibility, analytics, and web representations.

### Available Markup Properties

```typescript
type SemanticMarkup = Record<string, MarkupValue>;

type MarkupValue =
  | string
  | number
  | boolean
  | null
  | MarkupValue[]
  | { [key: string]: MarkupValue };  // Nested objects
```

### Cascade Rules

1. **Shallow merge** - Child properties override parent properties
2. **Deep merge (1 level)** - Nested objects merge their properties
3. **Component wins** - Component > Layer > Scene

### Example: Accessibility Markup

```typescript
scene.markup({
  language: "en",
  category: "tutorial"
});

scene.layer("content", {
  markup: {
    role: "main",
    ariaLabel: "Tutorial content"
  }
}, (layer) => {
  layer.component("title", "Title", { text: "Welcome" }, {
    markup: {
      role: "heading",           // Overrides layer role
      ariaLevel: 1,
      trackingId: "hero-title"
    }
  });
});

// Effective markup for title:
// {
//   language: "en",              // from scene
//   category: "tutorial",        // from scene
//   role: "heading",             // from component (overrides layer)
//   ariaLabel: "Tutorial content", // from layer
//   ariaLevel: 1,                // from component
//   trackingId: "hero-title"     // from component
// }
```

### Use Cases for Markup

1. **Accessibility** - ARIA attributes, roles, labels
2. **Analytics** - Tracking IDs, test variants, campaign tags
3. **A/B Testing** - Variant identifiers, experiment names
4. **Internationalization** - Language codes, translation keys
5. **WebVTT Generation** - Timed metadata tracks
6. **SEO** - Structured data for video search

See [cascading-markup.md](./cascading-markup.md) for detailed documentation.

---

## Built-in Components

### Title Component

```typescript
layer.title({
  text?: string,                // Explicit text
  binding?: string,             // Data binding (e.g., "scene.title")
  fontSize?: number,            // Default: 48
  fontWeight?: number | string, // Default: 700
  color?: string,               // Default: "#ffffff"
  textAlign?: "left" | "center" | "right", // Default: "left"
  position?: { x: number, y: number }      // Default: { x: 48, y: 48 }
});
```

**Data Bindings:**
- `"scene.title"` - Binds to scene title
- `"scene.id"` - Binds to scene ID

### Subtitle Component

```typescript
layer.subtitle({
  text?: string,                // Explicit text
  binding?: string,             // Data binding (e.g., "cue.text")
  fontSize?: number,            // Default: 20
  fontWeight?: number | string, // Default: 400
  color?: string,               // Default: "#cbd5f5"
  textAlign?: "left" | "center" | "right", // Default: "left"
  position?: { x: number, y: number }      // Default: { x: 48, y: 120 }
});
```

**Data Bindings:**
- `"cue.text"` - Binds to active cue text (default if no text provided)
- `"cue.label"` - Binds to active cue label
- `"cue.id"` - Binds to active cue ID

**Important**: Explicit `text` prop takes precedence over bindings.

### Rectangle Component

```typescript
layer.rectangle({
  color?: string,               // Solid color
  gradient?: string,            // CSS gradient
  x?: number,                   // X position (default: 0)
  y?: number,                   // Y position (default: 0)
  width?: number,               // Width in pixels (default: 1280)
  height?: number,              // Height in pixels (default: 720)
  borderRadius?: number,        // Border radius (default: 0)
  opacity?: number              // Opacity 0-1 (default: 1)
});
```

### Progress Bar Component

```typescript
layer.progressBar({
  position?: "top" | "bottom",  // Default: "bottom"
  height?: number,              // Default: 8
  color?: string,               // Bar color (default: gradient)
  backgroundColor?: string      // Track color (default: rgba gray)
});
```

**Note**: Progress is automatically calculated based on current frame.

---

## Component Timing and Visibility

### Show/Hide Components

```typescript
layer.component("fade-in-title", "Title", { text: "Hello" }, {
  timing: {
    startSec: 2,    // Show at 2 seconds
    endSec: 5       // Hide at 5 seconds
  }
});
```

### Conditional Visibility

```typescript
layer.component("debug-info", "Title", { text: "Debug" }, {
  visible: false  // Never show
});
```

### Layer-Level Timing

```typescript
scene.layer("intro-card", {
  timing: {
    startSec: 0,
    endSec: 3
  }
}, (layer) => {
  // All components in this layer inherit timing
  layer.title({ text: "Welcome" });
  layer.subtitle({ text: "to Babulus" });
});
```

---

## Complete Examples

### Example 1: Simple Title Card

```typescript
video.scene("Title Card", (scene) => {
  scene.styles({
    background: "#1a1a2e",
    fontFamily: "Arial, sans-serif"
  });

  scene.layer("content", { zIndex: 10 }, (layer) => {
    layer.title({
      text: "Babulus",
      fontSize: 64,
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "center",
      position: { x: 640, y: 300 }
    });

    layer.subtitle({
      text: "Video Generation Made Simple",
      fontSize: 24,
      color: "#cbd5f5",
      textAlign: "center",
      position: { x: 640, y: 380 }
    });
  });

  scene.layer("ui", { zIndex: 100 }, (layer) => {
    layer.progressBar();
  });

  scene.cue("intro", (cue) => {
    cue.voice((v) => v.say("Welcome to Babulus"));
  });
});
```

### Example 2: Animated Layers

```typescript
video.scene("Feature Highlight", (scene) => {
  scene.styles({
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  });

  // Background pattern (always visible)
  scene.layer("background", { zIndex: -5 }, (layer) => {
    layer.rectangle({
      gradient: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
      width: 1280,
      height: 720
    });
  });

  // Title (0-3 seconds)
  scene.layer("title", {
    timing: { startSec: 0, endSec: 3 },
    zIndex: 10
  }, (layer) => {
    layer.title({
      text: "Key Features",
      fontSize: 56,
      textAlign: "center",
      position: { x: 640, y: 200 }
    });
  });

  // Feature 1 (3-6 seconds)
  scene.layer("feature-1", {
    timing: { startSec: 3, endSec: 6 },
    zIndex: 10
  }, (layer) => {
    layer.subtitle({
      text: "✓ Component-Based Architecture",
      fontSize: 32,
      textAlign: "center",
      position: { x: 640, y: 300 }
    });
  });

  // Feature 2 (6-9 seconds)
  scene.layer("feature-2", {
    timing: { startSec: 6, endSec: 9 },
    zIndex: 10
  }, (layer) => {
    layer.subtitle({
      text: "✓ Cascading Styles & Markup",
      fontSize: 32,
      textAlign: "center",
      position: { x: 640, y: 300 }
    });
  });

  scene.cue("features", (cue) => {
    cue.voice((v) => {
      v.say("Babulus offers powerful features.");
      v.pause(0.3);
      v.say("Including component-based architecture.");
      v.pause(0.3);
      v.say("And cascading styles and markup.");
    });
  });
});
```

### Example 3: Opacity Cascade Demo

```typescript
video.scene("Opacity Demo", (scene) => {
  scene.styles({
    background: "#000000",
    opacity: 0.8  // Scene-level opacity
  });

  scene.layer("semi-transparent", {
    styles: { opacity: 0.5 },  // 0.8 × 0.5 = 0.4 effective
    zIndex: 10
  }, (layer) => {
    layer.rectangle({
      color: "#ff0000",
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      opacity: 0.5  // 0.8 × 0.5 × 0.5 = 0.2 effective
    });

    layer.title({
      text: "Opacity: 20%",
      fontSize: 32,
      position: { x: 150, y: 200 }
    });
  });

  scene.cue("explanation", (cue) => {
    cue.voice((v) => {
      v.say("Opacity multiplies through the cascade.");
    });
  });
});
```

### Example 4: Markup for Analytics

```typescript
video.scene("Product Demo", (scene) => {
  scene.markup({
    campaign: "product-launch-2024",
    channel: "youtube",
    category: "demo"
  });

  scene.layer("content", {
    markup: {
      region: "hero",
      importance: "high"
    },
    zIndex: 10
  }, (layer) => {
    layer.component("cta-button", "Title", {
      text: "Try It Now",
      fontSize: 48,
      color: "#00ff00",
      position: { x: 640, y: 400 }
    }, {
      markup: {
        role: "button",
        trackingEvent: "cta-click",
        testVariant: "green-button",
        position: "hero"
      }
    });
  });

  scene.cue("call-to-action", (cue) => {
    cue.voice((v) => v.say("Try our product today!"));
  });
});
```

---

## Best Practices

### 1. Use Layers for Organization

✅ **Good**: Group related components in layers
```typescript
scene.layer("content", {}, (layer) => {
  layer.title({ text: "Hello" });
  layer.subtitle({ text: "World" });
});
```

❌ **Avoid**: Many standalone components
```typescript
scene.title({ text: "Hello" });
scene.subtitle({ text: "World" });
```

### 2. Define Styles at the Highest Level

✅ **Good**: Scene-level styles cascade
```typescript
scene.styles({ fontFamily: "Arial", color: "#fff" });
scene.layer("content", {}, (layer) => {
  layer.title({ text: "Hello" });  // Inherits fontFamily and color
});
```

❌ **Avoid**: Repeating styles
```typescript
scene.layer("content", {}, (layer) => {
  layer.title({ text: "Hello", fontFamily: "Arial", color: "#fff" });
  layer.subtitle({ text: "World", fontFamily: "Arial", color: "#fff" });
});
```

### 3. Use Z-Index for Depth Control

- Background: z-index < 0
- Content: z-index 0-50
- UI elements: z-index > 50

### 4. Use Timing for Animations

Create smooth transitions by timing layers:
- Title card: 0-3s
- Feature 1: 3-6s
- Feature 2: 6-9s
- Outro: 9-12s

### 5. Add Markup for Web Features

Mark components with semantic metadata for:
- Accessibility (ARIA roles)
- Analytics (tracking IDs)
- A/B testing (variant tags)
- Internationalization (language codes)

---

## Migration from Old API

### Before (Markup-Based)

```typescript
scene.markup({
  background: "#1a1a2e",
  titleColor: "#ffffff"
});
```

### After (Component-Based)

```typescript
scene.styles({
  background: "#1a1a2e"
});

scene.layer("content", {}, (layer) => {
  layer.title({
    text: "Hello",
    color: "#ffffff"
  });
});
```

---

## See Also

- [Cascading Markup Documentation](./cascading-markup.md) - Detailed markup guide
- [Test Projects](../test-projects/) - Working examples
  - [styles-demo](../test-projects/styles-demo/) - Cascading styles demo
  - [markup-demo](../test-projects/markup-demo/) - Cascading markup demo
