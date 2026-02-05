import type { DocsEntry } from "@/lib/docs-registry";

export const componentsDoc: DocsEntry = {
  slug: ["components"],
  title: "Components",
  description: "Off-the-shelf components for titles, overlays, callouts, and motion UI",
  category: "Designers",
  html: `
<h1>Components</h1>
<p>These are the off-the-shelf components you can drop into a scene. They are deterministic, frame-driven, and designed to stack cleanly with layouts.</p>

<h2>Overview</h2>
<ul>
  <li>Use components for text overlays, motion graphics, and UI elements.</li>
  <li>Keep layouts for structure; components are content.</li>
  <li>Everything is frame-driven (no CSS keyframes).</li>
</ul>

<h2>Components Reel</h2>
<p>A short montage showing the core components.</p>
<div class="docs-preview" data-docs-preview="components-reel" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Title + Subtitle (with text effects)</h2>
<p>Titles and subtitles support text effects for controlled, readable motion.</p>
<pre><code>layer.title({
  text: "Frame-driven titles",
  textEffect: {
    effect: "fade_up",
    unit: "words",
    durationFrames: 24,
    staggerFrames: 4,
    start: { kind: "cue" }
  }
});

layer.subtitle({
  text: "Readable motion, minimal setup",
  textEffect: {
    effect: "slide_left",
    unit: "chars",
    durationFrames: 20,
    staggerFrames: 2
  }
});</code></pre>
<div class="docs-preview" data-docs-preview="components-title" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Background</h2>
<p>Use a flat color from the current theme to set the scene.</p>
<pre><code>layer.background({
  color: "var(--color-bg)"
});</code></pre>
<div class="docs-preview" data-docs-preview="components-background" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Progress Bar</h2>
<p>Shows playback progress; ideal for tutorials and onboarding.</p>
<pre><code>layer.progressBar({
  position: "bottom",
  height: 8,
  color: "var(--color-accent)",
  backgroundColor: "var(--color-muted)"
});</code></pre>
<div class="docs-preview" data-docs-preview="components-progress" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Lower Third</h2>
<p>Introduce speakers or annotate a moment.</p>
<pre><code>layer.lowerThird({
  name: "Jordan Lee",
  title: "Design Lead",
  organization: "Babulus",
  style: "modern",
  primaryColor: "var(--color-accent)"
});</code></pre>
<div class="docs-preview" data-docs-preview="components-lower-third" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Bullet List</h2>
<p>Step-by-step explanations or key points.</p>
<pre><code>layer.bulletList({
  items: ["Frame-driven", "Composable", "Deterministic"],
  revealStyle: "spring",
  staggerDelayFrames: 12
});</code></pre>
<div class="docs-preview" data-docs-preview="components-bullets" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Callout</h2>
<p>Point to a specific area in a layout or screenshot.</p>
<pre><code>layer.callout({
  text: "This is the key signal",
  pointerTarget: { x: 1240, y: 420 }
});</code></pre>
<div class="docs-preview" data-docs-preview="components-callout" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Chyron</h2>
<p>Ticker-style updates or quick bullet headlines.</p>
<pre><code>layer.chyron({
  items: [
    { text: "Frame-driven system" },
    { text: "All engines synchronized" }
  ],
  mode: "page"
});</code></pre>
<div class="docs-preview" data-docs-preview="components-chyron" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Code Block</h2>
<p>Readable code walkthroughs.</p>
<pre><code>layer.codeBlock({
  language: "xml",
  code: "const frame = i => i * 2;"
});</code></pre>
<div class="docs-preview" data-docs-preview="components-code" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>Quote Card</h2>
<p>Pull-quote card for emphasis.</p>
<pre><code>layer.quoteCard({
  quote: "The frame is the clock.",
  author: "Babulus"
});</code></pre>
<div class="docs-preview" data-docs-preview="components-quote" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h2>When to Use What</h2>
<ul>
  <li><strong>Title + Subtitle:</strong> scene openers, transitions, chapter markers.</li>
  <li><strong>Lower Third:</strong> speaker identification or context tags.</li>
  <li><strong>Bullet List:</strong> structured points and arguments.</li>
  <li><strong>Callout:</strong> annotate a specific region of the screen.</li>
  <li><strong>Chyron:</strong> rapid updates or news-style highlights.</li>
  <li><strong>Code Block:</strong> developer-focused walkthroughs.</li>
</ul>
`,
};
