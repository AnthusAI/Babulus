# Cascading Semantic Markup

Babulus supports cascading semantic markup that flows from scene → layer → component, similar to how visual styles cascade.

## Overview

Semantic markup allows you to add metadata to any element in your scene. This metadata can be used for:

- **Web representations** - When rendering to DOM instead of video
- **Accessibility** - ARIA attributes, semantic roles
- **Analytics** - Track user interactions with specific components
- **A/B testing** - Tag component variants
- **WebVTT metadata** - Generate timed metadata tracks
- **SEO** - Structured data for video search

## Cascade Rules

Markup cascades from parent to child with **shallow merging**:

1. **Scene markup** - Base metadata for the entire scene
2. **Layer markup** - Overrides/extends scene markup for all components in the layer
3. **Component markup** - Overrides/extends layer and scene markup for specific component

For nested objects (one level deep), properties are merged. Otherwise, child values override parent values.

## API

### Scene-Level Markup

```typescript
video.scene("Analytics Demo", (scene) => {
  scene.markup({
    category: "product-demo",
    variant: "A",
    audience: "developers"
  });

  // All components in this scene inherit the markup
});
```

### Layer-Level Markup

```typescript
scene.layer("content", {
  markup: {
    role: "main",
    region: "hero"
  }
}, (layer) => {
  // All components in this layer inherit scene + layer markup
});
```

### Component-Level Markup

```typescript
layer.component(
  "cta-button",
  "Button",
  { text: "Sign Up" },
  {
    markup: {
      role: "button",
      ariaLabel: "Sign up for free trial",
      trackingId: "hero-cta",
      testVariant: "blue-button"
    }
  }
);
```

## Complete Example

```typescript
import { defineVideo } from "@babulus/dsl";

export default defineVideo(
  "Accessibility Demo",
  { fps: 30, width: 1280, height: 720 },
  (video) => {
    video.scene("Main Content", (scene) => {
      // Scene-level markup applies to all elements
      scene.markup({
        language: "en",
        category: "tutorial",
        difficulty: "beginner"
      });

      // Layer for main content with accessibility role
      scene.layer("content", {
        markup: {
          role: "main",
          ariaLabel: "Main tutorial content"
        },
        zIndex: 10
      }, (layer) => {
        // Title inherits: language, category, difficulty, role, ariaLabel
        layer.title({
          text: "Welcome to Babulus",
          fontSize: 48
        });

        // Add specific markup for this component
        layer.component(
          "description",
          "Subtitle",
          { text: "Create videos with code" },
          {
            markup: {
              role: "doc-subtitle",
              ariaDescribedBy: "title"
            }
          }
        );
      });

      // Separate layer for UI elements
      scene.layer("ui", {
        markup: {
          role: "navigation",
          ariaLabel: "Video controls"
        },
        zIndex: 100
      }, (layer) => {
        layer.progressBar({
          position: "bottom"
        });
      });
    });
  }
);
```

## Accessing Markup in Components

Components receive cascaded markup via the `markup` prop:

```typescript
export function CustomComponent(props: {
  text: string;
  markup?: CascadedMarkup;
}) {
  const { text, markup = {} } = props;

  return (
    <div
      role={markup.role as string}
      aria-label={markup.ariaLabel as string}
      data-tracking-id={markup.trackingId as string}
    >
      {text}
    </div>
  );
}
```

## Use Cases

### 1. Accessibility

```typescript
scene.layer("content", {
  markup: {
    role: "article",
    ariaLive: "polite"
  }
}, (layer) => {
  layer.title({ text: "Breaking News" });
  layer.subtitle({ text: "Important update..." });
});
```

### 2. Analytics Tracking

```typescript
scene.markup({
  campaign: "product-launch-2024",
  channel: "youtube"
});

layer.component("hero-cta", "Button", { text: "Learn More" }, {
  markup: {
    trackingEvent: "cta-click",
    position: "hero",
    testGroup: "variation-b"
  }
});
```

### 3. A/B Testing

```typescript
scene.markup({
  experiment: "color-test",
  variant: "blue"
});

layer.rectangle({
  color: "#0066cc"
}, {
  markup: {
    element: "background",
    variantColor: "blue"
  }
});
```

### 4. Internationalization

```typescript
scene.markup({
  language: "es",
  region: "LATAM"
});

layer.title({
  text: "Bienvenido"
}, {
  markup: {
    translationKey: "welcome.title",
    locale: "es-MX"
  }
});
```

## Markup vs Styles

**Styles** control visual appearance (colors, fonts, opacity). They cascade and multiply (opacity).

**Markup** provides semantic metadata (roles, labels, tracking IDs). They cascade and merge (shallow merge).

Both systems work together:

```typescript
layer.component("feature-card", "Card", { ... }, {
  styles: {
    background: "#f0f0f0",
    opacity: 0.9
  },
  markup: {
    role: "article",
    category: "feature",
    importance: "high"
  }
});
```

## Future: WebVTT Generation

In the future, Babulus could generate WebVTT metadata tracks from markup:

```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
{
  "type": "scene",
  "id": "intro",
  "category": "product-demo",
  "language": "en"
}

00:00:00.500 --> 00:00:03.000
{
  "type": "component",
  "id": "hero-title",
  "role": "heading",
  "importance": "high"
}
```

This would enable:
- Screen reader announcements
- Search engine indexing of video content
- Interactive video overlays
- Custom analytics integrations
