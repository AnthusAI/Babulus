// This file exports all components for browser-side rendering
// It will be bundled by esbuild and loaded in Playwright

import React from 'react';
import { createRoot } from 'react-dom/client';

// Import Babulus renderer components and registry
import { ComposableRenderer } from '../packages/renderer/src/ComposableRenderer.tsx';
import { RendererProvider } from '../packages/renderer/src/context.tsx';

// Render function that will be called from Playwright
(window as any).renderFrame = (renderData: any) => {
  const { script, frame, config, inputProps } = renderData;

  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }

  const reactRoot = createRoot(root);

  reactRoot.render(
    <RendererProvider frame={frame} config={config}>
      <ComposableRenderer script={script} {...inputProps} />
    </RendererProvider>
  );

  // Return a promise that resolves when rendering is complete
  return new Promise((resolve) => {
    setTimeout(resolve, 100); // Wait for rendering to complete
  });
};
