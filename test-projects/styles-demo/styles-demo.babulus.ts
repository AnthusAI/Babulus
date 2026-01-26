import { defineVideo } from "../../src/dsl/builder.js";

export default defineVideo(
  "Cascading Styles Demo",
  { fps: 30, width: 1280, height: 720, durationSeconds: 15 },
  (video) => {
    video.voiceover({ provider: "dry-run", leadInSeconds: 0.5 });

  // Scene 1: Blank slate with transparent background
  video.scene("Blank Scene", (scene) => {
      scene.styles({
        background: "transparent", // Transparent background
      });

      scene.cue("blank-cue", (cue) => {
        cue.voice((v) => v.say("This is a blank scene with transparent background."));
      });
    });

    // Scene 2: Scene-level styles with layers
    video.scene("Layered Scene", (scene) => {
      // Scene-level styles (cascade to all layers/components)
      scene.styles({
        background: "#1a1a2e",
        fontFamily: "Arial, sans-serif",
        opacity: 1.0,
      });

      // Background layer with gradient rectangle
      scene.layer("background", { zIndex: -10 }, (layer) => {
        layer.rectangle({
          gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          x: 0,
          y: 0,
          width: "100%",
          height: "100%",
        });
      });

      // Content layer with text (inherits scene opacity)
      scene.layer("content", {
        zIndex: 10,
        styles: {
          opacity: 0.9, // Layer opacity (multiplies with scene)
        },
      }, (layer) => {
        layer.title({
          text: "Cascading Styles Demo",
          fontSize: 64,
          fontWeight: 800,
          color: "#ffffff",
          textAlign: "center",
          position: { x: 640, y: 200 },
        });

        layer.subtitle({
          text: "This scene demonstrates cascading styles and layers.",
          fontSize: 24,
          color: "#e0e7ff",
          textAlign: "center",
          position: { x: 640, y: 300 },
        });

        layer.subtitle({
          text: "Notice the gradient background, layered text, and progress bar.",
          fontSize: 24,
          color: "#e0e7ff",
          textAlign: "center",
          position: { x: 640, y: 340 },
        });
      });

      // UI layer with progress bar (always on top)
      scene.layer("ui", {
        zIndex: 100,
        styles: {
          opacity: 0.8,
        },
      }, (layer) => {
        layer.progressBar({
          position: "bottom",
          height: 6,
        });
      });

      scene.cue("intro", (cue) => {
        cue.voice((v) => {
          v.say("This scene demonstrates cascading styles and layers.");
          v.pause(0.2);
          v.say("Notice the gradient background, layered text, and progress bar.");
        });
      });
    });

    // Scene 3: Opacity multiplication demo
    video.scene("Opacity Demo", (scene) => {
      scene.styles({
        background: "#000000",
        opacity: 0.8, // Scene opacity: 0.8
      });

      scene.layer("semi-transparent", {
        zIndex: 10,
        styles: {
          opacity: 0.5, // Layer opacity: 0.5 (combined: 0.8 × 0.5 = 0.4)
        },
      }, (layer) => {
        layer.rectangle({
          color: "#ff6b6b",
          x: 100,
          y: 100,
          width: 400,
          height: 200,
        });

        layer.title({
          text: "Opacity: 0.4",
          fontSize: 48,
          color: "#ffffff",
          position: { x: 300, y: 180 },
        });
      });

      scene.layer("more-transparent", {
        zIndex: 20,
        styles: {
          opacity: 0.25, // Layer opacity: 0.25 (combined: 0.8 × 0.25 = 0.2)
        },
      }, (layer) => {
        layer.rectangle({
          color: "#4ecdc4",
          x: 600,
          y: 300,
          width: 400,
          height: 200,
        });

        layer.title({
          text: "Opacity: 0.2",
          fontSize: 48,
          color: "#ffffff",
          position: { x: 800, y: 380 },
        });
      });

      scene.cue("opacity-explanation", (cue) => {
        cue.voice((v) => {
          v.say("Opacity multiplies down through the cascade.");
          v.pause(0.3);
          v.say("Scene times layer equals the final component opacity.");
        });
      });
    });

    // Scene 4: Component positioning demo
    video.scene("Positioning Demo", (scene) => {
      scene.styles({
        background: "#f0f0f0",
      });

      scene.layer("rectangles", { zIndex: 0 }, (layer) => {
        // Top-left
        layer.rectangle({
          color: "#e74c3c",
          x: 50,
          y: 50,
          width: 200,
          height: 150,
        });

        // Top-right
        layer.rectangle({
          color: "#3498db",
          x: 1030,
          y: 50,
          width: 200,
          height: 150,
        });

        // Bottom-left
        layer.rectangle({
          color: "#2ecc71",
          x: 50,
          y: 520,
          width: 200,
          height: 150,
        });

        // Bottom-right
        layer.rectangle({
          color: "#f39c12",
          x: 1030,
          y: 520,
          width: 200,
          height: 150,
        });

        // Center
        layer.rectangle({
          color: "#9b59b6",
          x: 490,
          y: 260,
          width: 300,
          height: 200,
          borderRadius: 20,
        });

        layer.title({
          text: "Positioned Rectangles",
          fontSize: 36,
          fontWeight: 700,
          color: "#000000",
          textAlign: "center",
          position: { x: 640, y: 350 },
        });
      });

      scene.cue("positioning-explanation", (cue) => {
        cue.voice((v) => {
          v.say("Rectangle components support precise positioning.");
          v.pause(0.3);
          v.say("You can place them anywhere on the canvas with pixel accuracy.");
        });
      });
    });
  }
);
