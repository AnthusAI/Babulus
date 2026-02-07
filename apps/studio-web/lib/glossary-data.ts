/**
 * Glossary Data Structure
 * Centralized VideoML terminology with plain-language definitions
 */

export type GlossaryTerm = {
  term: string;
  definition: string;
  technicalNote?: string;
  example?: string;
  relatedTerms?: string[];
  docSlug?: string;
};

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: "VideoML",
    definition:
      "An XML-based markup language for creating videos. Similar to how HTML describes web pages, VideoML describes video scenes, timing, and components. Files use the .babulus.xml extension.",
    technicalNote:
      "VideoML is the canonical format for Babulus projects. It can be authored directly as XML or generated from JavaScript/TypeScript DSL code.",
    relatedTerms: ["VOM", "Scene", "Temporal Layout"],
    docSlug: "videoml-standard",
  },
  {
    term: "VOM",
    definition:
      "Video Object Model. The in-memory representation of a VideoML document during playback. Just as web browsers parse HTML into a Document Object Model (DOM) for rendering, Babulus parses VideoML into a VOM for video playback. You can inspect and manipulate the VOM using JavaScript, similar to manipulating HTML with JavaScript.",
    technicalNote:
      "The VOM is a browser DOM subtree. VideoML elements become actual DOM nodes that can be styled with CSS and controlled with JavaScript.",
    relatedTerms: ["VideoML", "Timeline API", "Live Mode"],
    docSlug: "videoml-standard",
  },
  {
    term: "Temporal Layout",
    definition:
      "The automatic calculation of video durations based on content length. When you add a 3-second scene to a video, the total duration grows by 3 seconds—just like adding a paragraph makes a webpage taller. You don't manually calculate total duration; VideoML handles it automatically.",
    technicalNote:
      "Implementation uses a reflow algorithm similar to CSS box model layout, but applied to the time dimension instead of spatial dimensions.",
    example: `<sequence>
  <!-- This sequence automatically becomes 5s total -->
  <scene duration="3s">First scene</scene>
  <scene duration="2s">Second scene</scene>
</sequence>`,
    relatedTerms: ["Sequence", "Stack", "Duration"],
    docSlug: "videoml-standard",
  },
  {
    term: "Scene",
    definition:
      "A distinct section of video with its own content and timing. Scenes are the building blocks of videos, similar to slides in a presentation or chapters in a book. Each scene can contain visual layers, audio, and components.",
    example: `<scene id="intro" duration="5s">
  <layer>
    <title-slide title="Welcome" />
  </layer>
</scene>`,
    relatedTerms: ["Cue", "Layer", "Sequence", "Stack"],
    docSlug: "videoml-standard",
  },
  {
    term: "Cue",
    definition:
      "A narration or dialogue segment within a scene. Each cue contains text that gets converted to speech using text-to-speech (TTS) providers. The duration of the generated audio determines how long the scene lasts. Think of cues as the 'script lines' for your voiceover.",
    example: `<cue id="intro-1">Welcome to our product tour.</cue>
<cue id="intro-2">Let me show you the key features.</cue>`,
    relatedTerms: ["Scene", "TTS", "Duration"],
  },
  {
    term: "Layer",
    definition:
      "A visual container within a scene that holds components or content. Layers stack on top of each other (like Photoshop layers) and can have independent timing within a scene.",
    technicalNote: "Layers use CSS z-index for stacking order. Higher z-index values appear on top.",
    relatedTerms: ["Scene", "Component", "Stack"],
  },
  {
    term: "Sequence",
    definition:
      "A container that plays its children back-to-back in order. If you have three 5-second scenes in a sequence, the total duration is 15 seconds. Each child starts when the previous one ends.",
    example: `<sequence>
  <scene duration="5s">Scene 1</scene>  <!-- 0-5s -->
  <scene duration="3s">Scene 2</scene>  <!-- 5-8s -->
  <scene duration="2s">Scene 3</scene>  <!-- 8-10s -->
</sequence>
<!-- Total: 10 seconds -->`,
    relatedTerms: ["Stack", "Scene", "Temporal Layout"],
    docSlug: "videoml-standard",
  },
  {
    term: "Stack",
    definition:
      "A container that plays its children simultaneously (in parallel). The total duration equals the longest child. Use stacks to combine audio narration with visuals, or to overlay multiple visual layers.",
    example: `<stack>
  <!-- Visual layer: 10s -->
  <layer duration="10s">
    <content-screen />
  </layer>

  <!-- Audio track: 10s -->
  <audio src="narration.wav" duration="10s" />
</stack>
<!-- Total: 10 seconds (longest child) -->`,
    relatedTerms: ["Sequence", "Layer", "Temporal Layout"],
    docSlug: "videoml-standard",
  },
  {
    term: "Duration",
    definition:
      "The length of time an element plays, specified in seconds (s) or frames (f). Duration can be set explicitly (duration='5s') or calculated automatically from child elements or generated audio.",
    example: `<!-- Explicit duration -->
<scene duration="5s">...</scene>

<!-- Auto-calculated from audio -->
<scene>
  <cue>This text will be converted to audio, and the scene duration will match the audio length.</cue>
</scene>`,
    relatedTerms: ["Temporal Layout", "Cue", "FPS"],
  },
  {
    term: "FPS",
    definition:
      "Frames Per Second. The number of still images (frames) shown per second of video. Standard values are 24fps (film), 30fps (TV/web), or 60fps (high frame rate). Higher FPS means smoother motion but larger file sizes.",
    technicalNote: "Set on the root <vml> element. All timing calculations use this FPS value.",
    example: `<vml fps="30" width="1920" height="1080">
  <!-- 30 frames per second -->
</vml>`,
    relatedTerms: ["Timeline API", "Duration"],
  },
  {
    term: "Live Mode",
    definition:
      "A real-time editing mode where videos play continuously without a fixed end time. Useful for live presentations or interactive editing. In Live Mode, you can add scenes on-the-fly, and the video extends indefinitely. When you 'cut' to the next scene, the previous scene's duration is sealed. Contrast with Export Mode, where all durations must be set before rendering.",
    technicalNote:
      "Live Mode uses unbounded timelines. Scenes can have open-ended durations (no explicit end time) until a cut event occurs.",
    relatedTerms: ["Timeline API", "Scene", "Recording"],
    docSlug: "live-vom",
  },
  {
    term: "Timeline API",
    definition:
      "JavaScript API for accessing and controlling video playback. Provides access to current frame number, playback time, and frame rate. Available globally as window.timeline.",
    example: `// Access current playback state
window.timeline.frame  // Current frame (0-indexed)
window.timeline.time   // Current time in seconds
window.timeline.fps    // Frame rate

// Listen for timeline events
window.addEventListener('timeline:tick', (e) => {
  console.log('Frame:', e.detail.frame);
});`,
    relatedTerms: ["VOM", "Live Mode", "FPS"],
    docSlug: "videoml-standard",
  },
  {
    term: "Component",
    definition:
      "A reusable UI building block for video content. Components include titles, subtitles, progress bars, lower thirds, code blocks, and more. They're similar to React components but designed specifically for video timelines.",
    technicalNote:
      "Components are implemented as Web Components (custom HTML elements with hyphenated names).",
    example: `<title-slide title="Welcome" subtitle="Let's get started" />
<lower-third name="Jane Doe" title="CEO" />
<progress-bar position="bottom" />`,
    relatedTerms: ["Layer", "Scene", "Web Component"],
    docSlug: "components",
  },
  {
    term: "Web Component",
    definition:
      "A browser standard for creating custom HTML elements with encapsulated behavior. VideoML components are built as Web Components, allowing you to create custom video elements with hyphenated names (like <my-custom-component />).",
    technicalNote:
      "Uses the Custom Elements API. No React or Vue required—works with vanilla JavaScript and DOM APIs.",
    relatedTerms: ["Component", "VOM"],
  },
  {
    term: "TTS",
    definition:
      "Text-to-Speech. Converts written text into spoken audio using AI voice synthesis. Babulus supports multiple TTS providers with different quality/cost profiles: ElevenLabs (high quality, ~$1/1000 chars), AWS Polly (good quality, ~$4/1M chars), Azure Speech (good quality, ~$16/1M chars). Generated audio determines scene duration in narration-driven videos.",
    relatedTerms: ["Cue", "Duration", "Narration"],
    docSlug: "tts-aws-polly-quickstart",
  },
  {
    term: "Rendering",
    definition:
      "The process of converting a VideoML document and generated assets (audio, images) into a final MP4 video file. Rendering captures browser frames at your target FPS and encodes them with ffmpeg.",
    technicalNote:
      "Three rendering modes: Local (your machine), Container (Docker locally), Cloud (AWS Fargate). Local is fastest for development; cloud scales for production.",
    relatedTerms: ["Generation", "Encoding", "FPS"],
    docSlug: "rendering-overview",
  },
  {
    term: "Generation",
    definition:
      "The first phase of video creation where Babulus processes your script to create timeline data, generate TTS audio, and prepare assets. Generation is fast (10-30 seconds) and produces JSON files plus audio. This is separate from rendering (which creates the final video).",
    technicalNote:
      "Generation creates: script.json (scene structure), timeline.json (timing data), and audio files (TTS output).",
    relatedTerms: ["Rendering", "TTS", "Timeline API"],
    docSlug: "rendering-overview",
  },
  {
    term: "Encoding",
    definition:
      "The final step of rendering where individual PNG frames are combined with audio and compressed into an MP4 video file using ffmpeg. H.264 codec is used for broad compatibility.",
    technicalNote:
      "Uses ffmpeg command-line tool. Typical settings: H.264 video codec, AAC audio codec, MP4 container format.",
    relatedTerms: ["Rendering", "FPS"],
  },
  {
    term: "Recording",
    definition:
      "The process of capturing a live or interactive video session into a fixed-duration VideoML document. In Live Mode, recording seals all open-ended scene durations and creates a deterministic timeline that can be rendered.",
    relatedTerms: ["Live Mode", "Rendering", "Duration"],
    docSlug: "live-vom",
  },
  {
    term: "Deterministic",
    definition:
      "Producing the same output every time given the same inputs. Babulus videos are deterministic: the same VideoML script always generates the same video. This makes approvals meaningful and iterations predictable.",
    technicalNote:
      "Determinism is key for production workflows. You can approve a preview knowing the final render will match exactly.",
    relatedTerms: ["Recording", "Rendering"],
  },
  {
    term: "Data Binding",
    definition:
      "Connecting component properties to dynamic data from your scene, timeline, or JavaScript context. Allows components to automatically update based on playback state or custom data.",
    example: `<!-- Bind title to scene data -->
<title-slide title="{{ scene.title }}" />

<!-- Bind progress to timeline -->
<progress-bar value="{{ timeline.time / timeline.duration }}" />`,
    relatedTerms: ["Component", "Timeline API", "Scene"],
    docSlug: "components-guide",
  },
  {
    term: "Layout",
    definition:
      "A full-frame structural template that defines regions for content. Layouts include title screens, two-column splits, three-column grids, and content screens. They provide consistent structure across videos.",
    example: `<content-screen
  title="Feature Overview"
  subtitle="Key Capabilities"
>
  <!-- Content goes here -->
</content-screen>`,
    relatedTerms: ["Component", "Scene", "Layer"],
    docSlug: "components-layouts",
  },
  {
    term: "Aspect Ratio",
    definition:
      "The proportional relationship between width and height of a video. Common ratios: 16:9 (widescreen, 1920×1080), 9:16 (vertical/mobile, 1080×1920), 1:1 (square, 1080×1080), 4:3 (traditional TV, 1440×1080).",
    relatedTerms: ["FPS", "Rendering"],
  },
  {
    term: "Project Storage",
    definition:
      "Cloud-based file storage system for Babulus projects. Files are stored in S3, metadata in DynamoDB, and served via CloudFront CDN. Provides version control and multi-tenant isolation.",
    technicalNote: "Uses AWS S3 for files, DynamoDB for metadata, CloudFront for CDN.",
    relatedTerms: ["Rendering", "Cloud"],
    docSlug: "project-storage-architecture",
  },
  {
    term: "Narration",
    definition:
      "Spoken voice-over audio that guides the video content. In Babulus, narration is generated from cue text using TTS providers. Narration timing drives scene duration in narration-first workflows.",
    relatedTerms: ["Cue", "TTS", "Duration"],
  },
  {
    term: "Agent",
    definition:
      "An AI system or automation script that can perform tasks like drafting video scripts, generating variations, or proposing changes. Agents handle repetitive work while humans focus on approvals and creative direction.",
    technicalNote: "Future feature. Currently, 'agent' refers to planned AI assistance capabilities.",
    relatedTerms: ["Generation", "Deterministic"],
  },
];

/**
 * Get a glossary term by name (case-insensitive)
 */
export function getGlossaryTerm(term: string): GlossaryTerm | undefined {
  const normalized = term.toLowerCase().trim();
  return glossaryTerms.find((t) => t.term.toLowerCase() === normalized);
}

/**
 * Get all terms that should be auto-linked in documentation
 */
export function getAutoLinkTerms(): string[] {
  return glossaryTerms.map((t) => t.term);
}

/**
 * Get related glossary terms for a given term
 */
export function getRelatedGlossaryTerms(term: string): GlossaryTerm[] {
  const glossaryTerm = getGlossaryTerm(term);
  if (!glossaryTerm || !glossaryTerm.relatedTerms) return [];

  return glossaryTerm.relatedTerms
    .map((relatedTerm) => getGlossaryTerm(relatedTerm))
    .filter((t): t is GlossaryTerm => t !== undefined);
}

/**
 * Search glossary terms by keyword
 */
export function searchGlossary(keyword: string): GlossaryTerm[] {
  const normalized = keyword.toLowerCase().trim();
  if (!normalized) return [];

  return glossaryTerms.filter(
    (term) =>
      term.term.toLowerCase().includes(normalized) ||
      term.definition.toLowerCase().includes(normalized)
  );
}
