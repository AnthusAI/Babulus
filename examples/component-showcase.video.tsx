import React from 'react';
import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Component Showcase', { fps: 30, width: 1920, height: 1080 }, (c) => {
  // Use OpenAI TTS (development environment)
  c.voiceover({ provider: 'openai', voice: 'alloy' });
  const brandBackground = {
    variant: 'linear',
    gradient: {
      angle: 135,
      colors: ['#101010', '#1f2a44'],
    },
  };

  // Scene 1: Title Slide Layout
  c.scene('intro', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Babulus Component Library',
        subtitle: 'Layouts, Motion Graphics & Animation',
        entrance: {
          title: { type: 'spring', durationFrames: 30, mass: 0.5, stiffness: 200, damping: 100 },
          subtitle: { type: 'fade', durationFrames: 20, delayFrames: 15 },
        },
      });
    });

    s.cue('welcome', (cue) => {
      cue.voice((v) => {
        v.say('Welcome to the Babulus component library.');
        v.pause(0.3);
        v.say('A comprehensive set of tools for creating professional videos.');
      });
    });
  });

  // Scene 2: Bullet List Demo
  c.scene('bullet-list-demo', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('title', { zIndex: 10 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Key Features',
        verticalAlign: 'top',
        padding: 60,
      });
    });

    s.layer('bullets', { zIndex: 5, timing: { startSec: 1 } }, (l) => {
      l.bulletList({
        items: [
          'PowerPoint-style layout templates',
          'Broadcast-quality motion graphics',
          'Frame-based animation system',
          'Smooth transitions and effects',
        ],
        revealStyle: 'spring',
        staggerDelayFrames: 20,
        position: { y: 300 },
      });
    });

    s.cue('features', (cue) => {
      cue.voice((v) => {
        v.say('The library includes PowerPoint-style layouts.');
        v.pause(0.4);
        v.say('Broadcast-quality motion graphics.');
        v.pause(0.4);
        v.say('A frame-based animation system.');
        v.pause(0.4);
        v.say('And smooth transitions throughout.');
      });
    });
  });

  // Scene 3: Lower Third Demo
  c.scene('lower-third-demo', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('lower-third', { zIndex: 10, timing: { startSec: 1, endSec: 5 } }, (l) => {
      l.lowerThird({
        name: 'John Doe',
        title: 'Product Designer',
        organization: 'Acme Corporation',
        style: 'modern',
        primaryColor: '#0066cc',
        entranceFrames: 20,
        holdFrames: 90,
        exitFrames: 15,
      });
    });

    s.cue('lower-third', (cue) => {
      cue.voice((v) => {
        v.say('Lower thirds identify speakers with smooth animations.');
        v.pause(0.5);
        v.say('Multiple styles are available to match your brand.');
      });
    });
  });

  // Scene 4: Chyron Demo
  c.scene('chyron-demo', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('content', { zIndex: 5 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Chyron Component',
        subtitle: 'Scrolling and paged ticker displays',
      });
    });

    s.layer('chyron', { zIndex: 10, timing: { startSec: 1.5 } }, (l) => {
      l.chyron({
        items: [
          { text: 'Breaking: New components released', icon: '🎉' },
          { text: 'Animation system is frame-perfect', highlight: true },
          { text: 'Easy to use with builder API' },
        ],
        mode: 'page',
        pageDurationFrames: 60,
        pageTransition: { type: 'slide', direction: 'up', durationFrames: 15 },
      });
    });

    s.cue('chyron', (cue) => {
      cue.voice((v) => {
        v.say('The chyron component provides scrolling tickers and paged displays.');
        v.pause(0.4);
        v.say('Perfect for news-style content or key points.');
      });
    });
  });

  // Scene 5: Two Column Layout
  c.scene('two-column-demo', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('TwoColumn', {
        ratio: '50-50',
        left: (
          <div style={{ padding: '40px', color: '#fff' }}>
            <h2 style={{ fontSize: 48, marginBottom: 24 }}>Two Column Layout</h2>
            <p style={{ fontSize: 24, lineHeight: 1.6 }}>
              Perfect for side-by-side comparisons, before and after, or content with supporting visuals.
            </p>
          </div>
        ),
        right: (
          <div style={{
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 32
          }}>
            Supporting Content
          </div>
        ),
        staggerDelayFrames: 15,
      });
    });

    s.cue('two-column', (cue) => {
      cue.voice((v) => {
        v.say('Layout components make it easy to structure your content.');
        v.pause(0.3);
        v.say('Choose from several PowerPoint-inspired layouts.');
      });
    });
  });

  // Scene 6: Code Block Demo
  c.scene('code-demo', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('title', { zIndex: 10 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Code Highlighting',
        verticalAlign: 'top',
        padding: 60,
      });
    });

    s.layer('code', { zIndex: 5, timing: { startSec: 1 } }, (l) => {
      l.codeBlock({
        code: `const video = defineVideo("My Video", { fps: 30 }, (c) => {
  c.scene("intro", (s) => {
    s.layer("content", {}, (l) => {
      l.layout("TitleSlide", {
        title: "Hello World"
      });
    });
  });
});`,
        language: 'typescript',
        theme: 'dracula',
        revealStyle: 'line-by-line',
        lineDelayFrames: 15,
        position: { y: 250 },
      });
    });

    s.cue('code', (cue) => {
      cue.voice((v) => {
        v.say('The code block component supports syntax highlighting.');
        v.pause(0.3);
        v.say('With multiple themes and reveal animations.');
      });
    });
  });

  // Scene 7: Conclusion
  c.scene('conclusion', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });

    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('TitleSlide', {
        title: 'Start Creating',
        subtitle: 'Professional videos made easy',
      });
    });

    s.cue('outro', (cue) => {
      cue.voice((v) => {
        v.say('Start creating professional videos with the Babulus component library.');
        v.pause(0.3);
        v.say('Everything you need in one powerful package.');
      });
    });
  });
});
