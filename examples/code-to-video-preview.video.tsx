import React from "react";
import { defineVideo } from "../src/dsl/builder";

export default defineVideo(
  "Code to Video Preview",
  { fps: 30, width: 1920, height: 1080 },
  (c) => {
    c.scene("intro", (s) => {
      s.layer("content", {}, (l) => {
        l.layout("TitleSlide", {
          eyebrow: "Code to Video",
          title: "Code Your Videos",
          subtitle: "(AI is really good at it!)",
          verticalAlign: "center",
          horizontalAlign: "center",
          entranceStartFrame: -999,
        });
      });
      s.cue("intro-vo", (cue) => {
        cue.voice((v) => {
          v.say("Write TypeScript. Babulus builds the video.");
        });
      });
    });

    c.scene("code", (s) => {
      s.layer("content", {}, (l) => {
        l.layout("BulletListScreen", {
          eyebrow: "Pipeline",
          title: "Your code becomes a video",
          subtitle: "Scene structure + narration = render",
          bullets: {
            items: [
              "Write a few scenes",
              "Add voiceover with cues",
              "Babulus computes timing",
              "Renderer outputs MP4",
            ],
            bulletStyle: "icon",
            bulletIcon: {
              kind: "lucide",
              name: "check",
              size: 44,
              strokeWidth: 3.2,
            },
            fontSize: 48,
            lineHeight: 1.2,
            spacing: 24,
          },
        });
      });
      s.cue("code-vo", (cue) => {
        cue.voice((v) => {
          v.say("Scenes and narration become a finished render.");
        });
      });
    });
  },
);
