export type Markup = Record<string, string | number | boolean | null>;

export type CompositionSpec = {
  fps: number;
  width: number;
  height: number;
  durationFrames?: number;
};

export type CueContent =
  | { kind: "say"; text: string }
  | { kind: "pause"; seconds: number }
  | { kind: "beat"; label?: string };

export type AudioClipSpec =
  | { kind: "sfx"; id: string; at?: string; volume?: number | string; durationSeconds?: number }
  | { kind: "music"; prompt: string; at?: string; volume?: number | string; durationSeconds?: number };

export type CueSpec = {
  id: string;
  content: CueContent[];
  audio?: AudioClipSpec[];
  markup?: Markup;
};

export type SceneSpec = {
  id: string;
  componentId?: string;
  props?: Record<string, unknown>;
  cues: CueSpec[];
  markup?: Markup;
};

export type PublishSpec = {
  slug?: string;
  page?: {
    title?: string;
    description?: string;
    cta?: { label: string; href: string };
  };
  channels?: Record<string, unknown>;
};

export type VideoSpec = {
  id: string;
  template?: { id: string; version?: string };
  composition?: CompositionSpec;
  storyboard: { scenes: SceneSpec[] };
  publish?: PublishSpec;
  markup?: Markup;
};

export type ResolveContext = {
  sources: {
    httpText: (input: { url: string; cache?: string }) => Promise<string>;
    httpJson: <T = unknown>(input: { url: string; cache?: string }) => Promise<T>;
  };
  media: {
    image: {
      generate: (input: { prompt: string; size?: string }) => Promise<{ url: string }>;
    };
  };
  publish: Record<string, unknown>;
};

export type VideoResolver = (ctx: ResolveContext) => Promise<VideoSpec> | VideoSpec;

export type VideoModule = {
  resolve: (ctx: ResolveContext) => Promise<VideoSpec>;
};
