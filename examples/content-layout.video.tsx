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

export default defineVideo('Content Layout Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  c.scene('content-layout', (s) => {
    s.styles({
      background: 'var(--color-bg, #131024)',
      color: 'var(--color-text, #f6f2ff)',
      vars: miamiVars,
    });

    s.layer('content', { zIndex: 10 }, (l) => {
      l.component('content-layout-demo', 'ContentLayoutDemo', {});
    });

    s.cue('preview', (cue) => {
      cue.voice((v) => v.pause(21));
    });
  });
});
