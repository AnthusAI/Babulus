import { getActiveCue, getActiveScene, type ScriptData } from "@babulus/shared";

const buildScript = (): ScriptData => ({
  fps: 30,
  meta: { durationSeconds: undefined },
  scenes: [
    {
      id: "scene-1",
      startSec: 0,
      cues: [
        {
          id: "cue-1",
          startSec: 0,
        },
      ],
    },
  ],
});

describe("open-ended timing", () => {
  test("getActiveScene respects allowOpenEnded", () => {
    const script = buildScript();
    expect(getActiveScene(script, 5)).toBeNull();
    expect(getActiveScene(script, 5, { allowOpenEnded: true })?.id).toBe("scene-1");
  });

  test("getActiveCue respects allowOpenEnded", () => {
    const script = buildScript();
    expect(getActiveCue(script, 5)).toBeNull();
    expect(getActiveCue(script, 5, { allowOpenEnded: true })?.id).toBe("cue-1");
  });
});
