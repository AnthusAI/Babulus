import React from 'react';
import { defineVideo } from '../src/dsl/builder';

const featureItems = ['Fast onboarding', 'Reusable layouts', 'Motion presets', 'Frame-accurate timing'];

export default defineVideo('Bullet Playground', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({
    provider: 'openai',
    voice: 'alloy',
    pronunciations: [
      { grapheme: 'babulus', alias: 'BAB-you-lus' },
      { grapheme: 'Lucide', alias: 'loo-SEED' },
      { grapheme: 'lucide', alias: 'loo-SEED' },
    ],
  });
  const brandBackground = {
    variant: 'linear',
    gradient: {
      angle: 135,
      colors: ['#101010', '#1f2a44'],
    },
  };

  // Scene 1: Lucide checks
  c.scene('lucide-checks', (s) => {
    s.layer('bg', {}, (l) => {
      l.background(brandBackground);
    });
    s.layer('title', { zIndex: 5 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Lucide Icon Bullets',
        subtitle: 'check, arrow-right, star, circle-dot',
        verticalAlign: 'top',
        padding: 60,
        titleSize: 60,
        subtitleSize: 28,
      });
    });
    s.layer('list', { zIndex: 10 }, (l) => {
      l.bulletList({
        items: featureItems,
        bulletStyle: 'icon',
        bulletIcon: { kind: 'lucide', name: 'check', color: '#7ee0a3', strokeWidth: 2.4, size: 30 },
        fontSize: 44,
        lineHeight: 1.35,
        spacing: 18,
        textColor: '#e9edf5',
        position: { x: 340, y: 260 },
      });
    });
    s.cue('vo1', (cue) => {
      cue.voice((v) => {
        v.say('Lucide check marks sized for TV distance readability.');
        v.pause(1.5);
      });
    });
  });

  // Scene 2: Unicode bullets with custom font
  c.scene('unicode-bullets', (s) => {
    s.layer('bg', {}, (l) => l.background(brandBackground));
    s.layer('title', { zIndex: 5 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Unicode Bullets',
        subtitle: 'Em dash / stars with custom font',
        verticalAlign: 'top',
        padding: 60,
        titleSize: 60,
        subtitleSize: 28,
      });
    });
    s.layer('list', { zIndex: 10 }, (l) => {
      l.bulletList({
        items: featureItems,
        bulletStyle: 'icon',
        bulletIcon: { kind: 'unicode', name: '•', fontFamily: '\"Segoe UI Symbol\", \"Arial Unicode MS\", sans-serif', color: '#f8d477', size: 34 },
        fontSize: 46,
        lineHeight: 1.3,
        spacing: 20,
        textColor: '#f3f4f6',
        position: { x: 320, y: 260 },
      });
    });
    s.cue('vo2', (cue) => {
      cue.voice((v) => {
        v.say('Unicode bullets with a configurable fallback font.');
        v.pause(1.5);
      });
    });
  });

  // Scene 3: Numbered list (control case)
  c.scene('numbered', (s) => {
    s.layer('bg', {}, (l) => l.background(brandBackground));
    s.layer('title', { zIndex: 5 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Numbered Bullets',
        subtitle: 'Ordered, large, TV-friendly',
        verticalAlign: 'top',
        padding: 60,
        titleSize: 60,
        subtitleSize: 28,
      });
    });
    s.layer('list', { zIndex: 10 }, (l) => {
      l.bulletList({
        items: featureItems,
        bulletStyle: 'number',
        fontSize: 46,
        lineHeight: 1.35,
        spacing: 18,
        textColor: '#e5ecff',
        position: { x: 340, y: 260 },
      });
    });
    s.cue('vo3', (cue) => {
      cue.voice((v) => {
        v.say('Classic numbered list for ordered steps on screen.');
        v.pause(1.5);
      });
    });
  });

  // Scene 4: Mixed icons (different icons per item via custom item.icon)
  c.scene('mixed-icons', (s) => {
    s.layer('bg', {}, (l) => l.background(brandBackground));
    s.layer('title', { zIndex: 5 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Mixed Lucide per Item',
        subtitle: 'icon field on each item overrides',
        verticalAlign: 'top',
        padding: 60,
        titleSize: 60,
        subtitleSize: 28,
      });
    });
    s.layer('list', { zIndex: 10 }, (l) => {
      l.bulletList({
        items: [
          { text: 'Fast onboarding', icon: 'arrow-right' },
          { text: 'Reusable layouts', icon: 'check' },
          { text: 'Motion presets', icon: 'star' },
          { text: 'Frame-accurate timing', icon: 'circle-dot' },
        ],
        bulletStyle: 'icon',
        bulletIcon: { kind: 'lucide', name: 'dot', color: '#9bd0ff', strokeWidth: 2.2, size: 28 }, // fallback if item.icon missing
        fontSize: 44,
        lineHeight: 1.35,
        spacing: 18,
        textColor: '#e9edf5',
        position: { x: 340, y: 260 },
      });
    });
    s.cue('vo4', (cue) => {
      cue.voice((v) => {
        v.say('Per-item Lucide icons override the default bullet icon.');
        v.pause(1.5);
      });
    });
  });
});
