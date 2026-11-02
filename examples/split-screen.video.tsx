import React from 'react';
import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Split Screen Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  c.scene('split-screen', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));
    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('SplitScreen', {
        direction: 'horizontal',
        ratio: 0.5,
        divider: { show: true, color: 'rgba(255,255,255,0.25)', width: 2 },
        first: (
          <div
            style={{
              height: '100%',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 24,
              margin: 24,
              padding: 32,
              color: '#f5f7fb',
            }}
          >
            <div style={{ fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
              Panel A
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, marginTop: 12 }}>Before</div>
          </div>
        ),
        second: (
          <div
            style={{
              height: '100%',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 24,
              margin: 24,
              padding: 32,
              color: '#f5f7fb',
            }}
          >
            <div style={{ fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
              Panel B
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, marginTop: 12 }}>After</div>
          </div>
        ),
      });
    });
    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('Split screens are ideal for comparisons and before and afters.');
        v.pause(1.2);
      });
    });
  });
});
