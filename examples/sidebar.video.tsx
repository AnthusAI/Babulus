import React from 'react';
import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Sidebar Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  c.scene('sidebar', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));
    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('Sidebar', {
        sidebarPosition: 'left',
        sidebarWidth: 360,
        sidebar: (
          <div
            style={{
              height: '100%',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.08)',
              padding: 28,
              color: '#f5f7fb',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
              Sidebar
            </div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>Key Notes</div>
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.75)' }}>Use for stats, prompts, or callouts.</div>
          </div>
        ),
        main: (
          <div style={{ padding: 24, color: '#f5f7fb' }}>
            <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 16 }}>Sidebar Layout</div>
            <div style={{ fontSize: 28, lineHeight: 1.5, color: 'rgba(255,255,255,0.75)' }}>
              Main content stays spacious while the sidebar holds supporting information.
            </div>
          </div>
        ),
      });
    });
    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('Sidebar layouts keep primary content focused with a supporting rail.');
        v.pause(1.2);
      });
    });
  });
});
