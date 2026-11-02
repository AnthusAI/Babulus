# Cascading Styles Demo

This test project demonstrates the new cascading styles system with layers.

## Features Demonstrated

### Scene 1: Blank Slate
- Transparent background using `scene.styles({ background: "transparent" })`
- Shows the default blank slate behavior

### Scene 2: Layered Scene
- Scene-level styles that cascade to all layers
- Three layers with different zIndex values:
  - Background layer (-10) with gradient rectangle
  - Content layer (10) with title and subtitle
  - UI layer (100) with progress bar
- Demonstrates layer grouping and z-ordering

### Scene 3: Opacity Multiplication
- Shows how opacity multiplies through the cascade
- Scene opacity (0.8) × Layer opacity (0.5) = Component opacity (0.4)
- Two colored rectangles with different opacity levels
- Demonstrates the multiplicative cascade

### Scene 4: Component Positioning
- Rectangle components positioned at specific x,y coordinates
- Corner rectangles in red, blue, green, and orange
- Center rectangle with border radius
- Shows pixel-perfect positioning capability

## Running the Demo

```bash
# Generate script and audio
npm run generate -- test-projects/styles-demo/styles-demo.babulus.xml

# View in Studio (recommended)
# Navigate to http://localhost:3000 and open the project
```

## Generated Outputs

- `src/videos/cascading-styles-demo/cascading-styles-demo.script.json` - Timed script
- `src/videos/cascading-styles-demo/cascading-styles-demo.timeline.json` - Timeline
- `public/babulus/cascading-styles-demo.wav` - Audio output

## Key API Usage

```typescript
// Scene-level styles
scene.styles({
  background: "#1a1a2e",
  fontFamily: "Arial, sans-serif",
  opacity: 1.0,
});

// Create a layer
scene.layer("content", {
  zIndex: 10,
  styles: { opacity: 0.9 }
}, (layer) => {
  layer.rectangle({ gradient: "..." });
  layer.title({ text: "Hello" });
});

// Rectangle with positioning
layer.rectangle({
  color: "#ff6b6b",
  x: 100,
  y: 100,
  width: 400,
  height: 200,
});
```

## Architecture

This demo uses:
- **VisualStyles** type for cascadable properties
- **LayerSpec** for grouping components
- **CascadedStyles** with computed opacity
- **RectangleComponent** (renamed from Background)
- Style cascading: scene → layer → component
