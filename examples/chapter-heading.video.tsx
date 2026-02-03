import { defineVideo } from '../src/dsl/builder';

export default defineVideo('Chapter Heading Demo', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({ provider: 'openai', voice: 'alloy' });

  const brandBackground = {
    variant: 'linear',
    gradient: { angle: 135, colors: ['#101010', '#1f2a44'] },
  };

  c.scene('chapter', (s) => {
    s.layer('background', { zIndex: 0 }, (l) => l.background(brandBackground));
    s.layer('content', { zIndex: 10 }, (l) => {
      l.layout('ChapterHeading', {
        number: '02',
        title: 'Chapter Heading Layout',
        subtitle: 'Section breaks with bold hierarchy',
        layout: 'side-by-side',
      });
    });
    s.cue('voice', (cue) => {
      cue.voice((v) => {
        v.say('This layout is for chapter breaks and section headings.');
        v.pause(1.2);
      });
    });
  });
});
