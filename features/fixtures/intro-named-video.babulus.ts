import { defineVideo } from "../../src/dsl/builder.js";

export const video = defineVideo((builder) => {
  builder.composition("Intro", (composition) => {
    composition.scene("Title", (scene) => {
      scene.cue("Hook", (cue) => {
        cue.voice((voice) => {
          voice.say("Hello");
        });
      });
    });
  });
});
