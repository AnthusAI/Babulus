import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Chapter Heading Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  c.scene('chapter', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));

    s.layer('chapter-1', { zIndex: 10, timing: { startSec: 0, endSec: 3 } }, (l) => {
      l.layout('ChapterHeading', {
        number: '01',
        title: 'Introduction',
        subtitle: 'Establish the structure and visual hierarchy',
        layout: 'side-by-side',
        numberEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
        titleEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
      });
    });

    s.layer('chapter-2', { zIndex: 10, timing: { startSec: 3, endSec: 6 } }, (l) => {
      l.layout('ChapterHeading', {
        number: '02',
        title: 'System Components',
        subtitle: 'Call out each section with bold numbering',
        layout: 'side-by-side',
        numberEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
        titleEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
      });
    });

    s.layer('chapter-3', { zIndex: 10, timing: { startSec: 6, endSec: 9 } }, (l) => {
      l.layout('ChapterHeading', {
        number: '03',
        title: 'Next Steps',
        subtitle: 'Use chapter breaks to pace the story',
        layout: 'side-by-side',
        numberEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
        titleEntrance: { type: 'fade', from: 1, to: 1, durationFrames: 1 },
      });
    });

    s.cue('preview', (cue) => {
      cue.voice((v) => v.pause(9));
    });
  });
});
