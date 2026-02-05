import assert from 'node:assert/strict';
import { When, Then } from '@cucumber/cucumber';
import { findDocBySlug, listDocsByCategory } from '../../apps/studio-web/lib/docs-registry.js';
import { renderFrameToHtml } from '../../packages/renderer/src/render.js';
import { ComposableRenderer } from '../../packages/renderer/src/ComposableRenderer.js';
import type { ScriptData } from '../../packages/shared/src/video.js';

let docsCategories: string[] = [];
let componentsHtml = '';
let componentsCategory = '';
let renderedHtml = '';

When('I list docs categories', () => {
  const sections = listDocsByCategory({ includeInternal: false });
  docsCategories = sections.map((section) => section.category);
});

Then('the docs categories should place {string} before {string}', (first: string, second: string) => {
  const firstIndex = docsCategories.indexOf(first);
  const secondIndex = docsCategories.indexOf(second);
  assert.ok(firstIndex !== -1, `Expected category ${first} to be present`);
  assert.ok(secondIndex !== -1, `Expected category ${second} to be present`);
  assert.ok(firstIndex < secondIndex, `Expected ${first} to appear before ${second}`);
});

When('I load the components docs entry', () => {
  const doc = findDocBySlug(['components']);
  assert.ok(doc, 'Components docs entry should exist');
  componentsHtml = doc!.html;
  componentsCategory = doc!.category;
});

Then('the components docs category should be {string}', (category: string) => {
  assert.equal(componentsCategory, category);
});

Then('the components docs should include preview mounts:', (table: { raw: () => string[][] }) => {
  const ids = table.raw().slice(1).map((row) => row[0]).filter(Boolean);
  ids.forEach((id) => {
    assert.ok(
      componentsHtml.includes(`data-docs-preview="${id}"`),
      `Expected components docs HTML to include preview mount ${id}`,
    );
  });
});

When('I render a title and subtitle with text effects to HTML', () => {
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
            id: 'components',
            components: [
              {
                id: 'title',
                type: 'Title',
                props: {
                  text: 'Frame-driven titles',
                  textEffect: { effect: 'fade_up', unit: 'words', start: { kind: 'frame', frame: 0 } },
                },
              },
              {
                id: 'subtitle',
                type: 'Subtitle',
                props: {
                  text: 'Deterministic motion',
                  textEffect: { effect: 'slide_left', unit: 'chars', start: { kind: 'frame', frame: 0 } },
                },
              },
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

Then('the HTML should include text effects markers', () => {
  const occurrences = renderedHtml.split('data-engine="text-effects"').length - 1;
  assert.ok(occurrences >= 2, 'Expected text effects engine markers for title and subtitle');
});
