import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Title Slide Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: {
      angle: 135,
      colors: ['#101010', '#1f2a44'],
    },
  };

  c.scene('title-slide', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Title Slide Layout',
        subtitle: 'Single-purpose title screen demo',
        entrance: {
          title: { type: 'spring', durationFrames: 30, mass: 0.5, stiffness: 200, damping: 100 },
          subtitle: { type: 'fade', durationFrames: 18, delayFrames: 12 },
        },
      });
    });

    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('This is the title slide layout.');
        v.pause(1.2);
      });
    });
  });
});
