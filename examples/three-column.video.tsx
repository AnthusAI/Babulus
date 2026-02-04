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

export default defineVideo('Three Column Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  c.scene('three-column', (s) => {
    s.styles({
      background: 'var(--color-bg, #131024)',
      color: 'var(--color-text, #f6f2ff)',
      vars: miamiVars,
    });

    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('ThreeColumnScreen', {
        eyebrow: 'Three Column',
        title: 'Three Column Screen',
        subtitle: 'Wide-screen tri-panel layouts',
        columns: [
          { type: 'PlaceholderPanel', id: 'col-a', props: { label: 'Primary', text: 'Column A', tone: 'primary' } },
          { type: 'PlaceholderPanel', id: 'col-b', props: { label: 'Secondary', text: 'Column B', tone: 'secondary' } },
          { type: 'PlaceholderPanel', id: 'col-c', props: { label: 'Accent', text: 'Column C', tone: 'primary' } },
        ],
      });
    });

    s.cue('preview', (cue) => {
      cue.voice((v) => v.pause(9));
    });
  });
});
