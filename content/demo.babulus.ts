import { defineVideo } from "../src/dsl/builder.js";

export default defineVideo((video) => {
  video.composition("Studio Demo", (composition) => {
    composition.meta({ fps: 30, width: 1280, height: 720 });
    composition.posterTime(2);
    composition.voiceover({ provider: "dry-run", leadInSeconds: 0.5 });

    composition.scene("Opening", (scene) => {
      scene.cue("Hook", (cue) => {
        cue.voice((voice) => {
          voice.say("Welcome to the Babulus preview. We are testing timing, cues, and playback.");
          voice.pause(0.4);
          voice.say("This is a longer segment so the storyboard has time to advance.");
        });
      });
      scene.pause(0.6);
      scene.cue("Setup", (cue) => {
        cue.voice((voice) => {
          voice.say("Each cue becomes a timed span in the script JSON. The player advances frame by frame.");
          voice.pause(0.35);
          voice.say("You should see the cue title change when we move past this point.");
        });
      });
    });

    composition.scene("Feature", (scene) => {
      scene.cue("Capability", (cue) => {
        cue.voice((voice) => {
          voice.say("Next we highlight a capability. Imagine visuals changing here when we plug in real compositions.");
        });
      });
      scene.pause(0.5);
      scene.cue("Outcome", (cue) => {
        cue.voice((voice) => {
          voice.say("Playback should keep moving even without real video assets. This proves timing is correct.");
        });
      });
    });

    composition.scene("Wrap", (scene) => {
      scene.cue("CTA", (cue) => {
        cue.voice((voice) => {
          voice.say("Final cue. We can now iterate on rendering and swap in real visuals.");
        });
      });
    });
  });
});
