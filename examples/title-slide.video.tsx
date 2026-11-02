import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Title Screen Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
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
      l.component('title-demo', 'TitleSlideLayoutDemo', {});
    });

    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('This is the title screen layout.');
        v.pause(18);
      });
    });
  });
});
