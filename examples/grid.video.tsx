import React from 'react';
import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Grid Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  const cards = Array.from({ length: 6 }, (_, idx) => (
    <div
      key={idx}
      style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 24,
        color: '#f5f7fb',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
        Card {idx + 1}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>Grid Layout</div>
      <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.75)' }}>Staggered reveal tiles.</div>
    </div>
  ));

  c.scene('grid', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));
    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('Grid', {
        columns: 3,
        items: cards,
        staggerPattern: 'diagonal',
        itemDurationFrames: 18,
        staggerDelayFrames: 6,
      });
    });
    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('Grid layouts are great for showcasing multiple items at once.');
        v.pause(1.2);
      });
    });
  });
});
