import { composition, scene, voice, audio } from '@babulus/dsl';

export default composition('introduction', () => {
  voice({ provider: 'dry-run', leadInSeconds: 0.5 });

  scene('welcome', 'Welcome', () => {
    voice.cue(() => {
      voice.say('Welcome to Babulus, the AI-powered video creation platform.');
      voice.pause(0.4);
      voice.say('Create professional videos using code, with automatic voiceovers and scene composition.');
    });
  });

  scene('features', 'Key Features', () => {
    voice.cue(() => {
      voice.say('Babulus combines the power of TypeScript with AI to streamline video production.');
      voice.pause(0.3);
      voice.say('Write your video content as code, and we handle voiceover generation, timing, and rendering.');
    });

    voice.pause(0.5);

    voice.cue(() => {
      voice.say('Use scenes to organize your content, cues to structure narration, and beats to control timing.');
      voice.pause(0.3);
      voice.say('Add background music, sound effects, and visual components to enhance your videos.');
    });
  });

  scene('getting-started', 'Getting Started', () => {
    voice.cue(() => {
      voice.say('Getting started is simple. Create a project, upload your assets, and start writing your video script.');
      voice.pause(0.4);
      voice.say('The editor provides real-time preview, syntax highlighting, and instant feedback as you build.');
    });

    voice.pause(0.5);

    voice.cue(() => {
      voice.say('When you are ready, click Generate to process your script and create the final video.');
      voice.pause(0.3);
      voice.say('You can iterate quickly, making changes and regenerating until your video is perfect.');
    });
  });

  scene('conclusion', 'Conclusion', () => {
    voice.cue(() => {
      voice.say('Whether you are creating marketing content, educational videos, or product demos, Babulus makes it fast and easy.');
      voice.pause(0.4);
      voice.say('Start creating your first video today and experience the future of video production.');
    });
  });
});
