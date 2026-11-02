import React from 'react';
import { defineVideo } from '../src/dsl/builder';

const miamiVars = {
  '--color-bg': '#131024',
  '--color-text': '#f6f2ff',
  '--color-text-muted': '#c9b8ff',
  '--color-surface': '#2b2044',
  '--color-surface-2': '#3d2b5c',
  '--color-accent': '#ff6bdc',
  '--color-accent-2': '#8fb2ff',
};

export default defineVideo('Grid Screen Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const tiles = Array.from({ length: 8 }, (_, idx) => (
    <div
      key={idx}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 20,
        background: idx % 2 === 0 ? 'var(--color-surface, #2b2044)' : 'var(--color-surface-2, #3d2b5c)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text, #f6f2ff)',
        fontSize: 24,
        fontWeight: 600,
      }}
    >
      Tile {idx + 1}
    </div>
  ));

  c.scene('grid-screen', (s) => {
    s.styles({
      background: 'var(--color-bg, #131024)',
      color: 'var(--color-text, #f6f2ff)',
      vars: miamiVars,
    });

    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('GridScreen', {
        eyebrow: 'Grid Layout',
        title: 'Grid Screen',
        subtitle: 'Header + multi-tile content area',
        grid: {
          columns: 4,
          items: tiles,
          gap: 20,
          entranceStartFrame: -999,
        },
      });
    });

    s.cue('preview', (cue) => {
      cue.voice((v) => v.pause(4));
    });
  });
});
