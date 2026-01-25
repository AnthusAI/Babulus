import { defineVideo } from "../../src/dsl/builder.js";

export default defineVideo((video) => {
  video.composition("Introduction to Babulus", (composition) => {
    composition.meta({ fps: 30, width: 1280, height: 720 });
    composition.posterTime(2);
    composition.voiceover({ provider: "dry-run", leadInSeconds: 0.5 });

    composition.scene("Welcome", (scene) => {
      // Purple gradient background for welcome scene
      scene.markup({
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        textAlign: "center",
        titleColor: "#ffffff",
        titleSize: 56,
        subtitleColor: "#e0e7ff",
        subtitleSize: 24,
      });

      scene.cue("Opening", (cue) => {
        cue.voice((voice) => {
          voice.say("Welcome to Babulus, the AI-powered video creation platform.");
          voice.pause(0.4);
          voice.say("Create professional videos using code, with automatic voiceovers and scene composition.");
        });
      });
    });

    composition.scene("Key Features", (scene) => {
      // Pink/red gradient background for features scene
      scene.markup({
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        titleColor: "#ffffff",
        titleSize: 48,
        subtitleColor: "#fff5f5",
        subtitleSize: 22,
      });

      scene.cue("Power of TypeScript", (cue) => {
        cue.markup({
          titleColor: "#fff5f5",
        });
        cue.voice((voice) => {
          voice.say("Babulus combines the power of TypeScript with AI to streamline video production.");
          voice.pause(0.3);
          voice.say("Write your video content as code, and we handle voiceover generation, timing, and rendering.");
        });
      });

      scene.pause(0.5);

      scene.cue("Tooling Features", (cue) => {
        cue.markup({
          titleColor: "#fffbeb",
        });
        cue.voice((voice) => {
          voice.say("Use scenes to organize your content, cues to structure narration, and beats to control timing.");
          voice.pause(0.3);
          voice.say("Add background music, sound effects, and visual components to enhance your videos.");
        });
      });
    });

    composition.scene("Getting Started", (scene) => {
      // Blue gradient background for getting started scene
      scene.markup({
        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        titleColor: "#ffffff",
        titleSize: 48,
        subtitleColor: "#e0f7ff",
        subtitleSize: 22,
      });

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
      // Green gradient background for conclusion scene
      scene.markup({
        background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
        titleColor: "#ffffff",
        titleSize: 48,
        subtitleColor: "#e0fff5",
        subtitleSize: 22,
      });

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
