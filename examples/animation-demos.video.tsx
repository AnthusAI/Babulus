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
  video.composition('Animation Reel', (composition: any) => {
    composition.meta(meta);
    composition.voiceover({ provider: 'dry-run' });

    composition.scene('reel', (scene: any) => {
      scene.styles({ background: 'var(--color-bg)' });

      const segmentSec = 2.2;
      const sections = [
        { id: 'framer', number: '01', title: 'Framer Motion', subtitle: 'Layout + motion graphics', component: 'framerMotionDemo' },
        { id: 'd3', number: '02', title: 'D3', subtitle: 'Data visualization', component: 'd3BarChart' },
        { id: 'processing', number: '03', title: 'Processing / p5.js', subtitle: 'Generative art', component: 'processingSketch' },
        { id: 'three', number: '04', title: 'Three.js', subtitle: '3D scenes', component: 'threeOrbit' },
        { id: 'lottie', number: '05', title: 'Lottie', subtitle: 'After Effects assets', component: 'lottieBadge' },
        { id: 'text', number: '06', title: 'Text Effects', subtitle: 'Named effects vocabulary', component: 'textEffects' },
        { id: 'anime', number: '07', title: 'Anime.js', subtitle: 'Low-level animation engine', component: 'animeHarness' },
        { id: 'mix', number: '08', title: 'Mix + Match', subtitle: 'Multiple engines in one scene', component: 'mixAndMatch' },
      ];

      sections.forEach((section, idx) => {
        const startSec = idx * segmentSec;
        const endSec = startSec + segmentSec;

        scene.layer(`engine-${section.id}`, { zIndex: 10, timing: { startSec, endSec } }, (layer: any) => {
          if (section.component === 'framerMotionDemo') {
            layer.framerMotionDemo({ size: 240 });
          }
          if (section.component === 'd3BarChart') {
            layer.d3BarChart({});
          }
          if (section.component === 'processingSketch') {
            layer.processingSketch({ particleCount: 30 });
          }
          if (section.component === 'threeOrbit') {
            layer.threeOrbit({ cubeSize: 160 });
          }
          if (section.component === 'lottieBadge') {
            layer.lottieBadge({ size: 260 });
          }
          if (section.component === 'textEffects') {
            layer.component(`text-effects-${section.id}`, 'TextEffectsDemo', {});
          }
          if (section.component === 'animeHarness') {
            layer.component(`anime-${section.id}`, 'AnimeHarnessDemo', {});
          }
          if (section.component === 'mixAndMatch') {
            layer.mixAndMatchDemo();
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

  video.composition('Animation Framer', (composition: any) => {
    buildSingleDemo(composition, 'framer', (scene) => {
      scene.layer('framer', { zIndex: 10 }, (layer: any) => {
        layer.framerMotionDemo({ size: 260 });
      });
    });
  });

  video.composition('Animation D3', (composition: any) => {
    buildSingleDemo(composition, 'd3', (scene) => {
      scene.layer('d3', { zIndex: 10 }, (layer: any) => {
        layer.d3BarChart({});
      });
    });
  });

  video.composition('Animation Processing', (composition: any) => {
    buildSingleDemo(composition, 'processing', (scene) => {
      scene.layer('processing', { zIndex: 10 }, (layer: any) => {
        layer.processingSketch({ particleCount: 30 });
      });
    });
  });

  video.composition('Animation Three', (composition: any) => {
    buildSingleDemo(composition, 'three', (scene) => {
      scene.layer('three', { zIndex: 10 }, (layer: any) => {
        layer.threeOrbit({ cubeSize: 160 });
      });
    });
  });

  video.composition('Animation Lottie', (composition: any) => {
    buildSingleDemo(composition, 'lottie', (scene) => {
      scene.layer('lottie', { zIndex: 10 }, (layer: any) => {
        layer.lottieBadge({ size: 260 });
      });
    });
  });

  video.composition('Animation Text Effects', (composition: any) => {
    buildSingleDemo(composition, 'text-effects', (scene) => {
      scene.layer('text-effects', { zIndex: 10 }, (layer: any) => {
        layer.component('text-effects', 'TextEffectsDemo', {});
      });
    });
  });

  video.composition('Animation Anime', (composition: any) => {
    buildSingleDemo(composition, 'anime', (scene) => {
      scene.layer('anime', { zIndex: 10 }, (layer: any) => {
        layer.component('anime', 'AnimeHarnessDemo', {});
      });
    });
  });

  video.composition('Animation Mix', (composition: any) => {
    buildSingleDemo(composition, 'mix', (scene) => {
      scene.layer('mix', { zIndex: 10 }, (layer: any) => {
        layer.mixAndMatchDemo();
      });
    }, 8);
  });
});
