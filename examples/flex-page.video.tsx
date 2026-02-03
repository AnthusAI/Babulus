import React from 'react';
import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Flex Page Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  c.scene('flex-page', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));
    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('FlexPage', {
        label: 'Flex',
        eyebrow: 'Base Layout',
        title: 'FlexPage Shell',
        subtitle: 'Header + content flex area',
        headerAlign: 'left',
        contentDirection: 'row',
        contentGap: 24,
        children: [
          {
            type: 'Rectangle',
            id: 'flex-card-1',
            flex: 1,
            props: {
              color: 'rgba(255,255,255,0.08)',
              width: '100%',
              height: '100%',
              radius: 24,
            },
          },
          {
            type: 'Rectangle',
            id: 'flex-card-2',
            flex: 1,
            props: {
              color: 'rgba(255,255,255,0.08)',
              width: '100%',
              height: '100%',
              radius: 24,
            },
          },
        ],
      });
    });
    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('FlexPage is the base shell for custom layouts.');
        v.pause(1.2);
      });
    });
  });
});
