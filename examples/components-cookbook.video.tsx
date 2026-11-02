import { defineVideo } from '../src/dsl/builder';

const meta = { fps: 30, width: 1920, height: 1080 };

const hold = (scene: any, seconds: number) => {
  scene.cue('hold', (cue: any) => {
    cue.voice((voice: any) => {
      voice.pause(seconds);
    });
  });
};

const buildSingleDemo = (
  composition: any,
  title: string,
  renderLayer: (scene: any) => void,
  durationSec = 6,
) => {
  composition.meta(meta);
  composition.voiceover({ provider: 'dry-run' });
  composition.scene(title, (scene: any) => {
    scene.styles({ background: 'var(--color-bg)' });
    renderLayer(scene);
    hold(scene, durationSec);
  });
};

export default defineVideo((video) => {
  video.composition('Components Reel', (composition: any) => {
    composition.meta(meta);
    composition.voiceover({ provider: 'dry-run' });

    composition.scene('reel', (scene: any) => {
      scene.styles({ background: 'var(--color-bg)' });

      const segmentSec = 2.2;
      const sections = [
        { id: 'title', number: '01', title: 'Title + Subtitle', subtitle: 'Text effects ready', type: 'title' },
        { id: 'background', number: '02', title: 'Background', subtitle: 'Flat theme fill', type: 'background' },
        { id: 'progress', number: '03', title: 'Progress Bar', subtitle: 'Playback cue', type: 'progress' },
        { id: 'bullets', number: '04', title: 'Bullet List', subtitle: 'Structured points', type: 'bullets' },
        { id: 'lower-third', number: '05', title: 'Lower Third', subtitle: 'Speaker context', type: 'lowerThird' },
        { id: 'callout', number: '06', title: 'Callout + Code', subtitle: 'Annotations', type: 'callout' },
        { id: 'chyron', number: '07', title: 'Chyron', subtitle: 'Ticker updates', type: 'chyron' },
        { id: 'quote', number: '08', title: 'Quote Card', subtitle: 'Pull quotes', type: 'quote' },
      ];

      sections.forEach((section, idx) => {
        const startSec = idx * segmentSec;
        const endSec = startSec + segmentSec;

        scene.layer(`component-${section.id}`, { zIndex: 10, timing: { startSec, endSec } }, (layer: any) => {
          if (section.type === 'title') {
            layer.title({
              text: 'Frame-driven components',
              color: 'var(--color-primary)',
              textColor: 'var(--color-text)',
              textEffect: {
                effect: 'fade_up',
                unit: 'words',
                durationFrames: 22,
                staggerFrames: 4,
              },
              position: { x: 140, y: 260 },
            });
            layer.subtitle({
              text: 'Readable motion with minimal setup',
              textEffect: {
                effect: 'slide_left',
                unit: 'chars',
                durationFrames: 20,
                staggerFrames: 2,
              },
              position: { x: 140, y: 360 },
              color: 'var(--color-text-muted)',
              fontSize: 28,
              fontWeight: 500,
            });
          }

          if (section.type === 'background') {
            layer.background({ color: 'var(--color-surface)' });
          }

          if (section.type === 'progress') {
            layer.progressBar({
              position: 'bottom',
              height: 10,
              color: 'var(--color-accent)',
              backgroundColor: 'var(--color-muted-more)',
            });
          }

          if (section.type === 'bullets') {
            layer.bulletList({
              items: ['Frame-driven', 'Composable', 'Deterministic'],
              revealStyle: 'spring',
              staggerDelayFrames: 12,
              position: { x: 140, y: 280 },
              textColor: 'var(--color-text)',
            });
          }

          if (section.type === 'lowerThird') {
            layer.lowerThird({
              name: 'Jordan Lee',
              title: 'Design Lead',
              organization: 'Babulus',
              style: 'modern',
              primaryColor: 'var(--color-accent)',
            });
          }

          if (section.type === 'callout') {
            layer.codeBlock({
              language: 'typescript',
              code: 'const frame = t => t * 2;\nconst motion = frame => Math.sin(frame / 8);',
              theme: 'nord',
              position: { y: 260 },
              width: 1200,
              height: 380,
            });
            layer.callout({
              text: 'Frame-driven motion',
              pointerTarget: { x: 980, y: 350 },
              position: { x: 1180, y: 220 },
            });
          }

          if (section.type === 'chyron') {
            layer.chyron({
              items: [
                { text: 'All components are frame-driven' },
                { text: 'Layouts handle structure' },
                { text: 'Text effects are deterministic' },
              ],
              mode: 'page',
              pageDurationFrames: 40,
              pageTransition: { type: 'slide', direction: 'up', durationFrames: 10 },
            });
          }

          if (section.type === 'quote') {
            layer.quoteCard({
              quote: 'The frame is the clock.',
              attribution: 'Babulus',
              accentColor: 'var(--color-accent)',
            });
          }
        });

        scene.layer(`label-${section.id}`, { zIndex: 20, timing: { startSec, endSec } }, (layer: any) => {
          layer.layout('ChapterHeading', {
            number: section.number,
            title: section.title,
            subtitle: section.subtitle,
            numberColor: 'var(--color-accent)',
            layout: 'side-by-side',
            numberEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
            titleEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
          });
        });
      });

      hold(scene, sections.length * segmentSec);
    });
  });

  video.composition('Components Title', (composition: any) => {
    buildSingleDemo(composition, 'title-demo', (scene) => {
      scene.layer('title', { zIndex: 10 }, (layer: any) => {
        layer.title({
          text: 'Text effects with zero keyframes',
          color: 'var(--color-primary)',
          textColor: 'var(--color-text)',
          textEffect: {
            effect: 'fade_up',
            unit: 'words',
            durationFrames: 24,
            staggerFrames: 4,
          },
          position: { x: 160, y: 280 },
        });
        layer.subtitle({
          text: 'fade, slide, pop, scale — all frame-driven',
          textEffect: {
            effect: 'slide_left',
            unit: 'chars',
            durationFrames: 20,
            staggerFrames: 2,
          },
          position: { x: 160, y: 380 },
          color: 'var(--color-text-muted)',
          fontSize: 28,
          fontWeight: 500,
        });
      });
    }, 6);
  });

  video.composition('Components Background', (composition: any) => {
    buildSingleDemo(composition, 'background-demo', (scene) => {
      scene.layer('background', { zIndex: 0 }, (layer: any) => {
        layer.background({ color: 'var(--color-surface-strong)' });
      });
      scene.layer('label', { zIndex: 10 }, (layer: any) => {
        layer.title({
          text: 'Background fills',
          color: 'var(--color-primary)',
          textColor: 'var(--color-text)',
          position: { x: 160, y: 300 },
        });
        layer.subtitle({
          text: 'Use theme surfaces for subtle contrast',
          position: { x: 160, y: 380 },
          color: 'var(--color-text-muted)',
          fontSize: 28,
          fontWeight: 500,
        });
      });
    }, 5);
  });

  video.composition('Components Progress', (composition: any) => {
    buildSingleDemo(composition, 'progress-demo', (scene) => {
      scene.layer('progress', { zIndex: 10 }, (layer: any) => {
        layer.progressBar({
          position: 'bottom',
          height: 12,
          color: 'var(--color-accent)',
          backgroundColor: 'var(--color-muted-more)',
        });
      });
    }, 5);
  });

  video.composition('Components Lower Third', (composition: any) => {
    buildSingleDemo(composition, 'lower-third-demo', (scene) => {
      scene.layer('lower-third', { zIndex: 10 }, (layer: any) => {
        layer.lowerThird({
          name: 'Jordan Lee',
          title: 'Design Lead',
          organization: 'Babulus',
          style: 'modern',
          primaryColor: 'var(--color-accent)',
        });
      });
    }, 5);
  });

  video.composition('Components Bullets', (composition: any) => {
    buildSingleDemo(composition, 'bullets-demo', (scene) => {
      scene.layer('bullets', { zIndex: 10 }, (layer: any) => {
        layer.bulletList({
          items: ['Frame-driven', 'Composable', 'Deterministic', 'Cue-timed'],
          revealStyle: 'spring',
          staggerDelayFrames: 12,
          position: { x: 160, y: 260 },
          textColor: 'var(--color-text)',
        });
      });
    }, 6);
  });

  video.composition('Components Callout', (composition: any) => {
    buildSingleDemo(composition, 'callout-demo', (scene) => {
      scene.layer('code', { zIndex: 10 }, (layer: any) => {
        layer.codeBlock({
          language: 'typescript',
          code: 'const frame = i => i * 2;\\nconst motion = frame => Math.sin(frame / 8);',
          theme: 'nord',
          position: { y: 260 },
          width: 1200,
          height: 380,
        });
      });
      scene.layer('callout', { zIndex: 20 }, (layer: any) => {
        layer.callout({
          text: 'Frame-driven motion',
          pointerTarget: { x: 980, y: 350 },
          position: { x: 1180, y: 220 },
        });
      });
    }, 6);
  });

  video.composition('Components Chyron', (composition: any) => {
    buildSingleDemo(composition, 'chyron-demo', (scene) => {
      scene.layer('chyron', { zIndex: 10 }, (layer: any) => {
        layer.chyron({
          items: [
            { text: 'All components are frame-driven' },
            { text: 'Layouts handle structure' },
            { text: 'Text effects are deterministic' },
          ],
          mode: 'page',
          pageDurationFrames: 40,
          pageTransition: { type: 'slide', direction: 'up', durationFrames: 10 },
        });
      });
    }, 6);
  });

  video.composition('Components Code', (composition: any) => {
    buildSingleDemo(composition, 'code-demo', (scene) => {
      scene.layer('code', { zIndex: 10 }, (layer: any) => {
        layer.codeBlock({
          language: 'typescript',
          code: 'const frame = i => i * 2;\\nconst motion = frame => Math.sin(frame / 8);',
          theme: 'nord',
          position: { y: 260 },
          width: 1200,
          height: 380,
        });
      });
    }, 6);
  });

  video.composition('Components Quote', (composition: any) => {
    buildSingleDemo(composition, 'quote-demo', (scene) => {
      scene.layer('quote', { zIndex: 10 }, (layer: any) => {
        layer.quoteCard({
          quote: 'The frame is the clock.',
          attribution: 'Babulus',
          accentColor: 'var(--color-accent)',
        });
      });
    }, 6);
  });
});
