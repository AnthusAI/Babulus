import {
  type AudioClipSpec,
  type CueContent,
  type CueSpec,
  type Markup,
  type PublishSpec,
  type ResolveContext,
  type SceneSpec,
  type VideoModule,
  type VideoResolver,
  type VideoSpec,
} from "./types.js";
import type { AstValidationError, AstValidationOptions, AstValidationResult } from "./ast.js";

export type {
  AudioClipSpec,
  CueContent,
  CueSpec,
  Markup,
  PublishSpec,
  ResolveContext,
  SceneSpec,
  VideoModule,
  VideoResolver,
  VideoSpec,
};

export type { AstValidationError, AstValidationOptions, AstValidationResult };

export { validateModuleSource } from "./ast.js";
export { resolveVideoModule } from "./resolve.js";
export { validateVideoSpec } from "./validate.js";

const isVideoSpec = (value: unknown): value is VideoSpec =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "storyboard" in value;

const isVideoBuilder = (value: unknown): value is VideoBuilder =>
  typeof value === "object" &&
  value !== null &&
  "build" in value &&
  typeof (value as VideoBuilder).build === "function";

export const defineVideo = (resolver: VideoResolver): VideoModule => ({
  resolve: async (ctx: ResolveContext) => {
    const result = await resolver(ctx);
    if (isVideoBuilder(result)) {
      return result.build();
    }
    if (isVideoSpec(result)) {
      return result;
    }
    throw new Error("defineVideo resolver must return a VideoSpec or VideoBuilder.");
  },
});

export const video = (id: string) => new VideoBuilder(id);

export const say = (text: string): CueContent => ({ kind: "say", text });

export const pause = (seconds: number): CueContent => ({ kind: "pause", seconds });

export const beat = (label?: string): CueContent => ({ kind: "beat", label });

export const sfx = (id: string): AudioClipSpec => ({ kind: "sfx", id });

export const music = (prompt: string): AudioClipSpec => ({ kind: "music", prompt });

class VideoBuilder {
  private spec: VideoSpec;

  constructor(id: string) {
    this.spec = { id, storyboard: { scenes: [] } };
  }

  composition(composition: VideoSpec["composition"]) {
    this.spec.composition = composition;
    return this;
  }

  template(id: string, version?: string) {
    this.spec.template = { id, version };
    return this;
  }

  scene(id: string, builder: (scene: SceneBuilder) => SceneBuilder) {
    const scene = builder(new SceneBuilder(id)).build();
    this.spec.storyboard.scenes.push(scene);
    return this;
  }

  publish(publish: PublishSpec) {
    this.spec.publish = publish;
    return this;
  }

  markup(markup: Markup) {
    this.spec.markup = markup;
    return this;
  }

  build(): VideoSpec {
    return this.spec;
  }
}

class SceneBuilder {
  private spec: SceneSpec;

  constructor(id: string) {
    this.spec = { id, cues: [] };
  }

  component(componentId: string) {
    this.spec.componentId = componentId;
    return this;
  }

  props(props: Record<string, unknown>) {
    this.spec.props = props;
    return this;
  }

  cue(id: string, content: CueContent | CueContent[] | string) {
    const normalized = normalizeCueContent(content);
    this.spec.cues.push({ id, content: normalized });
    return this;
  }

  audio(audio: AudioClipSpec | AudioClipSpec[]) {
    const cue = this.spec.cues.at(-1);
    if (!cue) {
      throw new Error("scene.audio() must be called after at least one cue().");
    }
    cue.audio = (cue.audio ?? []).concat(audio);
    return this;
  }

  markup(markup: Markup) {
    this.spec.markup = markup;
    return this;
  }

  cueMarkup(markup: Markup) {
    const cue = this.spec.cues.at(-1);
    if (!cue) {
      throw new Error("scene.cueMarkup() must be called after at least one cue().");
    }
    cue.markup = markup;
    return this;
  }

  build(): SceneSpec {
    return this.spec;
  }
}

const normalizeCueContent = (content: CueContent | CueContent[] | string): CueContent[] => {
  if (typeof content === "string") {
    return [say(content)];
  }
  return Array.isArray(content) ? content : [content];
};
