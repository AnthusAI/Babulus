import { defineVideo } from "../../src/dsl/builder.js";

export default defineVideo((video) => {
  video.composition("Intro", (composition) => {
    composition.scene("Title", (scene) => {
      scene.cue("Hook", (cue) => {
        cue.voice((voice) => {
          voice.say("Hello");
        });
      });
    });
  });
});
