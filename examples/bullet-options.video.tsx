import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Bullet Options', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({
    provider: 'openai',
    voice: 'alloy',
    pronunciations: [
      { grapheme: 'babulus', alias: 'BAB-you-lus' },
      { grapheme: 'Lucide', alias: 'loo-SEED' },
      { grapheme: 'lucide', alias: 'loo-SEED' },
    ],
  });

  const featureItems = ['Fast onboarding', 'Reusable layouts', 'Motion presets', 'Frame-accurate timing'];

  c.scene('bullets-A', (s) => {
    s.layer('page', {}, (l) => {
      l.layout('BulletListScreen', {
        label: undefined,
        background: 'linear-gradient(135deg, #101010, #1f2a44)',
        eyebrow: 'Menu Option',
        title: 'Option A — Bold & Large',
        subtitle: 'Readable at a distance',
        align: 'left',
        bullets: {
          items: featureItems,
          entranceStartFrame: -999,
          bulletStyle: 'icon',
          bulletIcon: { kind: 'lucide', name: 'check', color: '#7ee0a3', strokeWidth: 3, size: 34 },
          fontSize: 76,
          lineHeight: 1.5,
          spacing: 110,
          textColor: '#f5f7fb',
          justify: 'space-between',
        },
      });
    });
    s.cue('vo-a', (cue) => {
      cue.voice((v) => {
        v.say('Option A uses oversized checked bullets for maximum legibility.');
        v.pause(1.4);
      });
    });
  });

  c.scene('bullets-B', (s) => {
    s.layer('page', {}, (l) => {
      l.layout('BulletListScreen', {
        label: undefined,
        background: 'linear-gradient(135deg, #15202b, #243447)',
        eyebrow: 'Menu Option',
        title: 'Option B — Numbered Stack',
        subtitle: 'Ordered steps, strong rhythm',
        align: 'left',
        bullets: {
          items: featureItems,
          entranceStartFrame: -999,
          bulletStyle: 'number',
          fontSize: 68,
          lineHeight: 1.5,
          spacing: 100,
          textColor: '#eef3f8',
          justify: 'space-between',
        },
      });
    });
    s.cue('vo-b', (cue) => {
      cue.voice((v) => {
        v.say('Option B numbers each point for clear, ordered steps.');
        v.pause(1.4);
      });
    });
  });

  c.scene('bullets-C', (s) => {
    s.layer('page', {}, (l) => {
      l.layout('BulletListScreen', {
        label: undefined,
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        eyebrow: 'Menu Option',
        title: 'Option C — Split Grid',
        subtitle: 'Compact, two-column feel',
        align: 'left',
        bullets: {
          items: featureItems,
          entranceStartFrame: -999,
          bulletStyle: 'icon',
          bulletIcon: { kind: 'lucide', name: 'arrow-right', color: '#c7dcff', strokeWidth: 2.4, size: 34 },
          columns: 2,
          columnGap: 80,
          fontSize: 60,
          lineHeight: 1.5,
          spacing: 80,
          textColor: '#e9edf5',
          justify: 'start',
        },
      });
    });
    s.cue('vo-c', (cue) => {
      cue.voice((v) => {
        v.say('Option C tightens the list into a compact grid-friendly spacing.');
        v.pause(1.4);
      });
    });
  });
});
