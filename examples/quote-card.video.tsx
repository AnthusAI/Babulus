import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Quote Card Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  c.scene('quote', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));
    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('QuoteCard', {
        quote: 'Design for video means clarity at a distance.',
        attribution: 'Babulus Studio',
        accentColor: 'var(--color-accent, #8fb2ff)',
        backgroundColor: 'var(--color-surface, #1f2233)',
        textColor: 'var(--color-text, #f6f2ff)',
      });
    });
    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('Quote cards highlight short, punchy statements on screen.');
        v.pause(1.2);
      });
    });
  });
});
