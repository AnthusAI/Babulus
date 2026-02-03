import React from 'react';
import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Two Column Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  c.scene('two-column', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));
    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('TwoColumn', {
        ratio: '60-40',
        left: (
          <div style={{ padding: 48, color: '#f5f7fb' }}>
            <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 20 }}>Two Column Layout</div>
            <div style={{ fontSize: 28, lineHeight: 1.5, color: 'rgba(255,255,255,0.75)' }}>
              Use this for side-by-side comparisons, before/after, or supporting visuals.
            </div>
          </div>
        ),
        right: (
          <div
            style={{
              height: '100%',
              margin: 32,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f5f7fb',
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            Supporting Visual
          </div>
        ),
        staggerDelayFrames: 12,
      });
    });
    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('Two column layouts balance text and supporting visuals.');
        v.pause(1.2);
      });
    });
  });
});
