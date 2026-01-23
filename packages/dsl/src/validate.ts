import type { AudioClipSpec, CueContent, CueSpec, Markup, SceneSpec, VideoSpec } from "./types.js";

export type ValidationError = { path: string; message: string };

export type ValidationResult = { ok: boolean; errors: ValidationError[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isMarkup = (value: unknown): value is Markup => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) =>
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean" ||
      entry === null,
  );
};

const isCueContent = (value: unknown): value is CueContent => {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "say") {
    return typeof value.text === "string";
  }
  if (value.kind === "pause") {
    return typeof value.seconds === "number";
  }
  if (value.kind === "beat") {
    return value.label === undefined || typeof value.label === "string";
  }
  return false;
};

const isAudioClipSpec = (value: unknown): value is AudioClipSpec => {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "sfx") {
    return typeof value.id === "string";
  }
  if (value.kind === "music") {
    return typeof value.prompt === "string";
  }
  return false;
};

const validateCue = (cue: unknown, path: string, errors: ValidationError[]) => {
  if (!isRecord(cue)) {
    errors.push({ path, message: "Cue must be an object." });
    return;
  }
  if (typeof cue.id !== "string") {
    errors.push({ path: `${path}.id`, message: "Cue id must be a string." });
  }
  const content = cue.content;
  if (!Array.isArray(content) || !content.every(isCueContent)) {
    errors.push({ path: `${path}.content`, message: "Cue content must be an array of cue items." });
  }
  if (cue.audio !== undefined) {
    if (!Array.isArray(cue.audio) || !cue.audio.every(isAudioClipSpec)) {
      errors.push({ path: `${path}.audio`, message: "Cue audio must be an array of audio clips." });
    }
  }
  if (cue.markup !== undefined && !isMarkup(cue.markup)) {
    errors.push({ path: `${path}.markup`, message: "Cue markup must be a flat key/value map." });
  }
};

const validateScene = (scene: unknown, path: string, errors: ValidationError[]) => {
  if (!isRecord(scene)) {
    errors.push({ path, message: "Scene must be an object." });
    return;
  }
  if (typeof scene.id !== "string") {
    errors.push({ path: `${path}.id`, message: "Scene id must be a string." });
  }
  if (!Array.isArray(scene.cues)) {
    errors.push({ path: `${path}.cues`, message: "Scene cues must be an array." });
  } else {
    scene.cues.forEach((cue, idx) => validateCue(cue, `${path}.cues[${idx}]`, errors));
  }
  if (scene.markup !== undefined && !isMarkup(scene.markup)) {
    errors.push({ path: `${path}.markup`, message: "Scene markup must be a flat key/value map." });
  }
};

export function validateVideoSpec(spec: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  if (!isRecord(spec)) {
    return { ok: false, errors: [{ path: "", message: "Video spec must be an object." }] };
  }
  if (typeof spec.id !== "string") {
    errors.push({ path: "id", message: "Video id must be a string." });
  }
  if (!isRecord(spec.storyboard) || !Array.isArray(spec.storyboard.scenes)) {
    errors.push({ path: "storyboard.scenes", message: "Storyboard scenes must be an array." });
  } else {
    spec.storyboard.scenes.forEach((scene, idx) =>
      validateScene(scene, `storyboard.scenes[${idx}]`, errors),
    );
  }
  if (spec.composition !== undefined) {
    const composition = spec.composition;
    if (!isRecord(composition)) {
      errors.push({ path: "composition", message: "Composition must be an object." });
    } else {
      if (typeof composition.fps !== "number") {
        errors.push({ path: "composition.fps", message: "Composition fps must be a number." });
      }
      if (typeof composition.width !== "number") {
        errors.push({ path: "composition.width", message: "Composition width must be a number." });
      }
      if (typeof composition.height !== "number") {
        errors.push({ path: "composition.height", message: "Composition height must be a number." });
      }
      if (composition.durationFrames !== undefined && typeof composition.durationFrames !== "number") {
        errors.push({
          path: "composition.durationFrames",
          message: "Composition durationFrames must be a number.",
        });
      }
    }
  }
  if (spec.template !== undefined) {
    if (!isRecord(spec.template) || typeof spec.template.id !== "string") {
      errors.push({ path: "template.id", message: "Template id must be a string." });
    }
  }
  if (spec.publish !== undefined && !isRecord(spec.publish)) {
    errors.push({ path: "publish", message: "Publish must be an object." });
  }
  if (spec.markup !== undefined && !isMarkup(spec.markup)) {
    errors.push({ path: "markup", message: "Markup must be a flat key/value map." });
  }
  return { ok: errors.length === 0, errors };
}
