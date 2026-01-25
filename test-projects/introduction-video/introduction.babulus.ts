import { defineVideo } from "../../src/dsl/builder.js";

export default defineVideo((video) => {
  video.composition("Introduction to Babulus", (composition) => {
    composition.meta({ fps: 30, width: 1280, height: 720 });
    composition.posterTime(2);
    composition.voiceover({ provider: "dry-run", leadInSeconds: 0.5 });

    composition.scene("Welcome", (scene) => {
      scene.cue("Opening", (cue) => {
        cue.voice((voice) => {
          voice.say("Welcome to Babulus, the AI-powered video creation platform.");
          voice.pause(0.4);
          voice.say("Create professional videos using code, with automatic voiceovers and scene composition.");
        });
      });
    });

    composition.scene("Key Features", (scene) => {
      scene.cue("Power of TypeScript", (cue) => {
        cue.voice((voice) => {
          voice.say("Babulus combines the power of TypeScript with AI to streamline video production.");
          voice.pause(0.3);
          voice.say("Write your video content as code, and we handle voiceover generation, timing, and rendering.");
        });
      });

      scene.pause(0.5);

      scene.cue("Tooling Features", (cue) => {
        cue.voice((voice) => {
          voice.say("Use scenes to organize your content, cues to structure narration, and beats to control timing.");
          voice.pause(0.3);
          voice.say("Add background music, sound effects, and visual components to enhance your videos.");
        });
      });
    });

    composition.scene("Getting Started", (scene) => {
      scene.cue("How to Begin", (cue) => {
        cue.voice((voice) => {
          voice.say("Getting started is simple. Create a project, upload your assets, and start writing your video script.");
          voice.pause(0.4);
          voice.say("The editor provides real-time preview, syntax highlighting, and instant feedback as you build.");
        });
      });

      scene.pause(0.5);

      scene.cue("Workflow", (cue) => {
        cue.voice((voice) => {
          voice.say("When you are ready, click Generate to process your script and create the final video.");
          voice.pause(0.3);
          voice.say("You can iterate quickly, making changes and regenerating until your video is perfect.");
        });
      });
    });

    composition.scene("Conclusion", (scene) => {
      scene.cue("Call to Action", (cue) => {
        cue.voice((voice) => {
          voice.say("Whether you are creating marketing content, educational videos, or product demos, Babulus makes it fast and easy.");
          voice.pause(0.4);
          voice.say("Start creating your first video today and experience the future of video production.");
        });
      });
    });
  });
});
