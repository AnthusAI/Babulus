import assert from 'node:assert/strict';
import { When, Then } from '@cucumber/cucumber';
import { findDocBySlug } from '../../apps/studio-web/lib/docs-registry.js';
import { listComponents } from '../../packages/renderer/src/components/registry.js';
import { renderFrameToHtml } from '../../packages/renderer/src/render.js';
import { ComposableRenderer } from '../../packages/renderer/src/ComposableRenderer.js';
import type { ScriptData } from '../../packages/shared/src/video.js';

let docsHtml = '';
let registryComponents: string[] = [];
let renderedHtml = '';

When('I load the animation docs entry', () => {
  const doc = findDocBySlug(['animation']);
  assert.ok(doc, 'Animation docs entry should exist');
  docsHtml = doc!.html;
});

Then('the animation docs should include preview mounts:', (table: { raw: () => string[][] }) => {
  const ids = table.raw().slice(1).map((row) => row[0]).filter(Boolean);
  ids.forEach((id) => {
    assert.ok(
      docsHtml.includes(`data-docs-preview="${id}"`),
      `Expected docs HTML to include preview mount ${id}`,
    );
  });
});

When('I list renderer components', () => {
  registryComponents = listComponents();
});

Then('the component registry should include:', (table: { raw: () => string[][] }) => {
  const names = table.raw().slice(1).map((row) => row[0]).filter(Boolean);
  names.forEach((name) => {
    assert.ok(
      registryComponents.includes(name),
      `Expected registry to include component ${name}`,
    );
  });
});

When('I render an animation demo frame to HTML', () => {
  const script: ScriptData = {
    fps: 30,
    meta: { fps: 30, width: 1280, height: 720, durationSeconds: 2 },
    scenes: [
      {
        id: 'demo',
        title: 'Demo',
        startSec: 0,
        endSec: 2,
        layers: [
          {
            id: 'engines',
            components: [
              { id: 'framer', type: 'FramerMotionDemo', props: {} },
              { id: 'd3', type: 'D3BarChart', props: {} },
              { id: 'p5', type: 'P5Particles', props: {} },
              { id: 'three', type: 'ThreeOrbit', props: {} },
              { id: 'lottie', type: 'LottieBadge', props: {} },
              { id: 'anime', type: 'AnimeHarnessDemo', props: {} },
              { id: 'text-effects', type: 'TextEffects', props: { text: 'Text Effects', effect: { effect: 'fade_up', unit: 'words', start: { kind: 'frame', frame: 0 } } } },
            ],
          },
        ],
      },
    ],
  };

  renderedHtml = renderFrameToHtml({
    component: ComposableRenderer,
    config: { fps: 30, width: 1280, height: 720, durationFrames: 60 },
    frame: 0,
    inputProps: { script },
  });
});

Then('the HTML should include engine markers:', (table: { raw: () => string[][] }) => {
  const engines = table.raw().slice(1).map((row) => row[0]).filter(Boolean);
  engines.forEach((engine) => {
    assert.ok(
      renderedHtml.includes(`data-engine=\"${engine}\"`),
      `Expected HTML to include data-engine="${engine}"`,
    );
  });
});
