// Babulus Standard Browser Bundle
// This bundle includes:
// - ComposableRenderer (the core renderer)
// - Standard components (Title, Subtitle, ProgressBar, Rectangle, Background)
// - Registry system for extending with custom components
// - Window API for rendering frames

import React from 'react';
import { createRoot } from 'react-dom/client';

// Import Babulus core
import { ComposableRenderer } from '../packages/renderer/src/ComposableRenderer.tsx';
import { RendererProvider, useCurrentFrame, useVideoConfig } from '../packages/renderer/src/context.tsx';
import { registerComponent, getComponent, listComponents } from '../packages/renderer/src/components/registry.ts';
import { interpolate, spring } from '../packages/renderer/src/math.ts';

// Standard components are already registered in registry.ts
// We just need to export the registration function for projects to extend

// Make Babulus API available globally for custom bundles
(window as any).Babulus = {
  // Component registry
  registerComponent,
  getComponent,
  listComponents,

  // Core renderer
  ComposableRenderer,
  RendererProvider,

  // Context hooks (for custom components)
  useCurrentFrame,
  useVideoConfig,

  // Math utilities (for animations)
  interpolate,
  spring,
};

// Create React root once and reuse it for all frames
let reactRoot: ReturnType<typeof createRoot> | null = null;

// Render function that will be called from Playwright
(window as any).renderFrame = (renderData: any) => {
  const { script, frame, config, inputProps } = renderData;

  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }

  // Create root only once, reuse for subsequent frames
  if (!reactRoot) {
    reactRoot = createRoot(root);
  }

  reactRoot.render(
    <RendererProvider frame={frame} config={config}>
      <ComposableRenderer script={script} {...inputProps} />
    </RendererProvider>
  );

  // Return a promise that resolves when rendering is complete
  return new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
};
