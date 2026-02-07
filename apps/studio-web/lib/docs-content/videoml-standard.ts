import type { DocsEntry } from "@/lib/docs-registry";

export const videomlStandardDoc: DocsEntry = {
  slug: ["videoml-standard"],
  title: "VideoML Standard",
  description: "Complete reference for the VideoML XML standard for time-based UI and video",
  category: "Standards",
  personas: ["developers"],
  difficulty: "advanced",
  relatedDocs: ["videoml-conformance", "live-vom", "babulus-language-design"],
  lastReviewed: "2026-02-05",
  html: `
<h1 id="videoml-standard">VideoML Standard</h1>
<p><strong>Status:</strong> Draft (v0.1)</p>
<p>VideoML is an XML-based standard for creating videos using declarative markup. It treats time as a layout axis and uses the browser DOM as the canonical runtime. VideoML feels like web programming with a timeline.</p>

<h2 id="what-youll-learn">What You'll Learn</h2>
<ul>
  <li>Core VideoML syntax and root element structure</li>
  <li>Temporal layout model (sequence, stack, duration)</li>
  <li>Timeline API for accessing playback state</li>
  <li>Lifecycle events for scene and cue transitions</li>
  <li>Inline JavaScript and event handlers</li>
  <li>Design decisions behind VideoML's approach</li>
</ul>

<hr />

<h2 id="canonical-root">Canonical Root Element</h2>
<p>Every VideoML document starts with a <code>&lt;vml&gt;</code> root element. This is the canonical format—XML files are the source of truth, and all derived outputs (MP4 videos, JSON timelines) are generated artifacts.</p>

<h3 id="root-attributes">Required Attributes</h3>
<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span>
  id=<span class="st">"intro"</span>
  title=<span class="st">"Introduction Video"</span>
  fps=<span class="st">"30"</span>
  width=<span class="st">"1920"</span>
  height=<span class="st">"1080"</span>
<span class="fu">&gt;</span>
  <span class="co">&lt;!-- scenes go here --&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>

<ul>
  <li><code>id</code>: Unique identifier for this video</li>
  <li><code>title</code>: Human-readable name</li>
  <li><code>fps</code>: Frames per second (24, 30, or 60 typical)</li>
  <li><code>width</code> / <code>height</code>: Video dimensions in pixels</li>
</ul>

<h3 id="file-extension">File Extension</h3>
<p>VideoML files use the <code>.babulus.xml</code> extension. This disambiguates them from generic XML and signals they contain time-based video markup.</p>

<div class="callout callout-info">
  <strong>Design Decision:</strong> XML was chosen over JSON because it maps naturally to HTML/DOM, supports mixed content (text + elements), and allows Web Component syntax (<code>&lt;title-slide /&gt;</code>).
</div>

<hr />

<h2 id="temporal-layout">Temporal Layout Model</h2>
<p>VideoML automatically calculates durations based on content, treating time like CSS treats space. Add a 5-second scene, and the video grows by 5 seconds—no manual duration math required.</p>

<h3 id="sequence">Sequence (Back-to-Back)</h3>
<p>The <code>&lt;sequence&gt;</code> element plays children one after another. Total duration equals the sum of all child durations.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;sequence&gt;</span>
  <span class="fu">&lt;scene</span> duration=<span class="st">"3s"</span><span class="fu">&gt;</span>Scene 1<span class="fu">&lt;/scene&gt;</span>  <span class="co">&lt;!-- 0-3s --&gt;</span>
  <span class="fu">&lt;scene</span> duration=<span class="st">"2s"</span><span class="fu">&gt;</span>Scene 2<span class="fu">&lt;/scene&gt;</span>  <span class="co">&lt;!-- 3-5s --&gt;</span>
  <span class="fu">&lt;scene</span> duration=<span class="st">"4s"</span><span class="fu">&gt;</span>Scene 3<span class="fu">&lt;/scene&gt;</span>  <span class="co">&lt;!-- 5-9s --&gt;</span>
<span class="fu">&lt;/sequence&gt;</span>
<span class="co">&lt;!-- Total: 9 seconds --&gt;</span></code></pre></div>

<h3 id="stack">Stack (Parallel)</h3>
<p>The <code>&lt;stack&gt;</code> element plays children simultaneously. Total duration equals the longest child.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;stack&gt;</span>
  <span class="co">&lt;!-- Visual layer: 10s --&gt;</span>
  <span class="fu">&lt;layer</span> duration=<span class="st">"10s"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;title-slide</span> title=<span class="st">"Welcome"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;/layer&gt;</span>

  <span class="co">&lt;!-- Audio narration: 8s --&gt;</span>
  <span class="fu">&lt;audio</span> src=<span class="st">"narration.wav"</span> duration=<span class="st">"8s"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;/stack&gt;</span>
<span class="co">&lt;!-- Total: 10 seconds (longest child) --&gt;</span></code></pre></div>

<h3 id="auto-duration">Automatic Duration</h3>
<p>If you omit the <code>duration</code> attribute, VideoML calculates it from child elements or generated audio (TTS).</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene&gt;</span>
  <span class="fu">&lt;cue&gt;</span>Welcome to the tutorial.<span class="fu">&lt;/cue&gt;</span>
<span class="fu">&lt;/scene&gt;</span>
<span class="co">&lt;!-- Duration = length of TTS audio for "Welcome to the tutorial." --&gt;</span></code></pre></div>

<div class="callout callout-tip">
  <strong>Tip:</strong> Narration-driven videos use automatic duration. Motion-driven videos (animations, screen recordings) set explicit durations.
</div>

<hr />

<h2 id="timeline-api">Timeline API</h2>
<p>Access current playback state via the global <code>window.timeline</code> object. This API is available in both Live Mode (real-time editing) and Export Mode (rendering).</p>

<h3 id="timeline-properties">Properties</h3>
<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>window.timeline.frame</code></td>
      <td>number</td>
      <td>Current frame (0-indexed)</td>
    </tr>
    <tr>
      <td><code>window.timeline.time</code></td>
      <td>number</td>
      <td>Current time in seconds</td>
    </tr>
    <tr>
      <td><code>window.timeline.fps</code></td>
      <td>number</td>
      <td>Frames per second</td>
    </tr>
    <tr>
      <td><code>window.timelines</code></td>
      <td>Timeline[]</td>
      <td>Array of all timelines (for multi-player sync)</td>
    </tr>
  </tbody>
</table>

<h3 id="css-variables">CSS Variables</h3>
<p>VideoML sets CSS custom properties on the root element every frame. Use these in stylesheets for dynamic effects.</p>

<div class="sourceCode"><pre class="sourceCode css"><code class="sourceCode css"><span class="co">/* Access timeline state in CSS */</span>
<span class="fu">.progress-bar</span> {
  <span class="kw">width</span>: <span class="fu">calc(</span><span class="dv">100</span><span class="dt">%</span> <span class="op">*</span> <span class="fu">var(</span><span class="va">--video-time</span><span class="fu">)</span> <span class="op">/</span> <span class="fu">var(</span><span class="va">--video-duration</span><span class="fu">))</span>;
}

<span class="fu">.fade-in</span> {
  <span class="kw">opacity</span>: <span class="fu">calc(</span><span class="fu">var(</span><span class="va">--video-frame</span><span class="fu">)</span> <span class="op">/</span> <span class="dv">30</span><span class="fu">)</span>; <span class="co">/* Fade in over 30 frames */</span>
}</code></pre></div>

<h3 id="timeline-example">JavaScript Example</h3>
<div class="sourceCode"><pre class="sourceCode js"><code class="sourceCode javascript"><span class="co">// Log playback state every frame</span>
<span class="bu">window</span><span class="op">.</span><span class="fu">addEventListener</span>(<span class="st">'timeline:tick'</span><span class="op">,</span> (e) <span class="kw">=&gt;</span> {
  <span class="bu">console</span><span class="op">.</span><span class="fu">log</span>(<span class="st">"Frame "</span> <span class="op">+</span> <span class="bu">window</span><span class="op">.</span><span class="at">timeline</span><span class="op">.</span><span class="at">frame</span> <span class="op">+</span> <span class="st">" at "</span> <span class="op">+</span> <span class="bu">window</span><span class="op">.</span><span class="at">timeline</span><span class="op">.</span><span class="at">time</span> <span class="op">+</span> <span class="st">"s"</span>)<span class="op">;</span>
})<span class="op">;</span>

<span class="co">// Calculate progress percentage</span>
<span class="kw">const</span> progress <span class="op">=</span> (<span class="bu">window</span><span class="op">.</span><span class="at">timeline</span><span class="op">.</span><span class="at">frame</span> <span class="op">/</span> totalFrames) <span class="op">*</span> <span class="dv">100</span><span class="op">;</span></code></pre></div>

<div class="callout callout-warning">
  <strong>Performance:</strong> <code>timeline:tick</code> fires every frame (30-60 times per second). Avoid expensive operations in tick handlers.
</div>

<hr />

<h2 id="lifecycle-events">Lifecycle Events</h2>
<p>VideoML dispatches events when scenes and cues start/end. Listen to these events to trigger animations, update UI, or log analytics.</p>

<h3 id="event-types">Event Types</h3>
<table>
  <thead>
    <tr>
      <th>Event</th>
      <th>Dispatched On</th>
      <th>Detail</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>timeline:tick</code></td>
      <td><code>&lt;vml&gt;</code>, <code>window</code></td>
      <td><code>{ frame, time, fps }</code></td>
    </tr>
    <tr>
      <td><code>scene:start</code></td>
      <td><code>&lt;scene&gt;</code>, <code>window</code></td>
      <td><code>{ sceneId, startTime }</code></td>
    </tr>
    <tr>
      <td><code>scene:end</code></td>
      <td><code>&lt;scene&gt;</code>, <code>window</code></td>
      <td><code>{ sceneId, endTime }</code></td>
    </tr>
    <tr>
      <td><code>cue:start</code></td>
      <td><code>&lt;cue&gt;</code>, <code>window</code></td>
      <td><code>{ cueId, text }</code></td>
    </tr>
    <tr>
      <td><code>cue:end</code></td>
      <td><code>&lt;cue&gt;</code>, <code>window</code></td>
      <td><code>{ cueId }</code></td>
    </tr>
  </tbody>
</table>

<h3 id="event-example">Example: Scene Transitions</h3>
<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span> id=<span class="st">"demo"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;script&gt;</span>
    <span class="co">// Log when scenes change</span>
    window<span class="op">.</span><span class="fu">addEventListener</span>(<span class="st">'scene:start'</span><span class="op">,</span> (e) <span class="kw">=&gt;</span> {
      console<span class="op">.</span><span class="fu">log</span>(<span class="vs">\`Scene started: \${e.detail.sceneId}\`</span>)<span class="op">;</span>
    })<span class="op">;</span>
  <span class="fu">&lt;/script&gt;</span>

  <span class="fu">&lt;scene</span> id=<span class="st">"intro"</span> duration=<span class="st">"3s"</span><span class="fu">&gt;</span>
    <span class="co">&lt;!-- scene content --&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>

<hr />

<h2 id="inline-javascript">Inline JavaScript</h2>
<p>VideoML supports <code>&lt;script&gt;</code> tags and <code>on:*</code> event handler attributes. Scripts execute when inserted into the DOM, just like HTML.</p>

<h3 id="script-blocks">Script Blocks</h3>
<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span> id=<span class="st">"interactive"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;script&gt;</span>
    <span class="co">// Initialize state</span>
    <span class="kw">let</span> clickCount <span class="op">=</span> <span class="dv">0</span><span class="op">;</span>

    <span class="kw">function</span> <span class="fu">handleClick</span>() {
      clickCount<span class="op">++;</span>
      console<span class="op">.</span><span class="fu">log</span>(<span class="vs">\`Clicked \${clickCount} times\`</span>)<span class="op">;</span>
    }
  <span class="fu">&lt;/script&gt;</span>

  <span class="fu">&lt;scene</span> duration=<span class="st">"5s"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;button</span> on:click=<span class="st">"handleClick()"</span><span class="fu">&gt;</span>Click Me<span class="fu">&lt;/button&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>

<h3 id="event-handlers">Event Handler Attributes</h3>
<p>Use <code>on:*</code> attributes to attach event handlers inline. The handler scope includes:</p>
<ul>
  <li><code>event</code>: The DOM event object</li>
  <li><code>target</code>: The element that triggered the event</li>
  <li><code>timeline</code>: The current timeline object</li>
  <li><code>root</code>: The <code>&lt;vml&gt;</code> root element</li>
</ul>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;button</span> on:click=<span class="st">"console.log(timeline.frame)"</span><span class="fu">&gt;</span>Log Frame<span class="fu">&lt;/button&gt;</span>
<span class="fu">&lt;input</span> on:change=<span class="st">"target.value = target.value.toUpperCase()"</span> <span class="fu">/&gt;</span></code></pre></div>

<h3 id="ignoring-subtrees">Ignoring Subtrees</h3>
<p>Use <code>data-videoml-ignore="true"</code> to exclude DOM subtrees from handler rebinding and mutation recording. This is useful for third-party widgets or performance-sensitive areas.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;div</span> data-videoml-ignore=<span class="st">"true"</span><span class="fu">&gt;</span>
  <span class="co">&lt;!-- This subtree is ignored by VideoML runtime --&gt;</span>
  <span class="fu">&lt;iframe</span> src=<span class="st">"external-widget.html"</span><span class="fu">&gt;&lt;/iframe&gt;</span>
<span class="fu">&lt;/div&gt;</span></code></pre></div>

<hr />

<h2 id="scenes-and-layers">Scenes and Layers</h2>
<p>Scenes are the primary structural unit. Layers provide z-index stacking within scenes.</p>

<h3 id="scene-element">Scene Element</h3>
<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene</span>
  id=<span class="st">"intro"</span>
  start=<span class="st">"0s"</span>
  duration=<span class="st">"5s"</span>
<span class="fu">&gt;</span>
  <span class="co">&lt;!-- scene content --&gt;</span>
<span class="fu">&lt;/scene&gt;</span></code></pre></div>

<ul>
  <li><code>id</code>: Unique identifier</li>
  <li><code>start</code>: Absolute start time (optional, defaults to sequential)</li>
  <li><code>duration</code>: Scene length (optional if auto-calculated)</li>
</ul>

<h3 id="layer-element">Layer Element</h3>
<p>Layers stack visually using CSS z-index. Higher z-index appears on top.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene</span> duration=<span class="st">"8s"</span><span class="fu">&gt;</span>
  <span class="co">&lt;!-- Background layer (z-index: 0) --&gt;</span>
  <span class="fu">&lt;layer</span> style=<span class="st">"z-index: 0"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;background-gradient</span> colors=<span class="st">"blue,purple"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;/layer&gt;</span>

  <span class="co">&lt;!-- Content layer (z-index: 10) --&gt;</span>
  <span class="fu">&lt;layer</span> style=<span class="st">"z-index: 10"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;title-slide</span> title=<span class="st">"Hello"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;/layer&gt;</span>

  <span class="co">&lt;!-- Overlay layer (z-index: 20) --&gt;</span>
  <span class="fu">&lt;layer</span> style=<span class="st">"z-index: 20"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;lower-third</span> name=<span class="st">"Jane Doe"</span> title=<span class="st">"CEO"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;/layer&gt;</span>
<span class="fu">&lt;/scene&gt;</span></code></pre></div>

<hr />

<h2 id="cues-and-tts">Cues and Text-to-Speech</h2>
<p>Cues contain narration text that gets converted to audio via TTS providers. The audio duration determines scene length.</p>

<h3 id="cue-element">Cue Element</h3>
<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene&gt;</span>
  <span class="fu">&lt;cue</span> id=<span class="st">"intro-1"</span> voice=<span class="st">"en-US-Neural"</span><span class="fu">&gt;</span>
    Welcome to the tutorial. Today we'll cover the basics.
  <span class="fu">&lt;/cue&gt;</span>
<span class="fu">&lt;/scene&gt;</span>
<span class="co">&lt;!-- Scene duration = TTS audio length --&gt;</span></code></pre></div>

<ul>
  <li><code>id</code>: Unique identifier for this cue</li>
  <li><code>voice</code>: TTS voice name (provider-specific)</li>
  <li>Text content: The narration script</li>
</ul>

<h3 id="multiple-cues">Multiple Cues</h3>
<p>Multiple cues in a scene play sequentially (like a sequence).</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene&gt;</span>
  <span class="fu">&lt;cue</span> id=<span class="st">"line-1"</span><span class="fu">&gt;</span>First sentence.<span class="fu">&lt;/cue&gt;</span>
  <span class="fu">&lt;cue</span> id=<span class="st">"line-2"</span><span class="fu">&gt;</span>Second sentence.<span class="fu">&lt;/cue&gt;</span>
<span class="fu">&lt;/scene&gt;</span>
<span class="co">&lt;!-- Total duration = sum of both audio clips --&gt;</span></code></pre></div>

<h3 id="narration-track">Narration Track</h3>
<p>Use <code>&lt;narration&gt;</code> for voiceover that spans multiple transitions. Narration items sit on the timeline (like scenes/transitions) but render no visuals.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;transition</span> effect=<span class="st">"push"</span> duration=<span class="st">"12f"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;narration</span> id=<span class="st">"layouts-voice"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;cue</span> id=<span class="st">"layouts"</span><span class="fu">&gt;</span>
    Use one-column, two-column, three-column, and grid layouts.
  <span class="fu">&lt;/cue&gt;</span>
<span class="fu">&lt;/narration&gt;</span></code></pre></div>

<p>Place <code>&lt;narration&gt;</code> just before the scenes it should align with. It will start at the next scene's start unless you provide <code>start</code> or <code>duration</code>.</p>

<hr />

<h2 id="web-components">Web Components</h2>
<p>VideoML uses Web Components (custom elements) for reusable UI. Any hyphenated tag is treated as a Web Component.</p>

<h3 id="component-syntax">Component Syntax</h3>
<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="co">&lt;!-- Built-in components --&gt;</span>
<span class="fu">&lt;title-slide</span> title=<span class="st">"Welcome"</span> subtitle=<span class="st">"Get Started"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;lower-third</span> name=<span class="st">"Jane Doe"</span> title=<span class="st">"CEO"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;code-block</span> language=<span class="st">"javascript"</span><span class="fu">&gt;</span>
  console.log('Hello');
<span class="fu">&lt;/code-block&gt;</span>

<span class="co">&lt;!-- Custom components --&gt;</span>
<span class="fu">&lt;my-chart</span> data=<span class="st">"[1,2,3]"</span> type=<span class="st">"bar"</span> <span class="fu">/&gt;</span></code></pre></div>

<h3 id="props-attribute">Props Attribute</h3>
<p>For complex data, use the <code>props</code> attribute with JSON.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;data-visualization</span>
  props=<span class="st">'{
    "data": [
      {"month": "Jan", "sales": 100},
      {"month": "Feb", "sales": 150}
    ],
    "chartType": "line",
    "showLegend": true
  }'</span>
<span class="fu">/&gt;</span></code></pre></div>

<div class="callout callout-info">
  <strong>Design Decision:</strong> Web Components avoid framework lock-in. They work with vanilla JavaScript, React, Vue, or any library.
</div>

<hr />

<h2 id="transitions">Transitions</h2>
<p><a href="/docs/videoml/transitions">Full transitions guide & integration test gallery</a></p>
<p>Transitions are first-class timeline items that sit between scenes. A transition is a container (like a scene) that can hold visuals and audio, and it can either <strong>overlap</strong> adjacent scenes or <strong>insert</strong> time between them.</p>

<div class="callout callout-info">
  <strong>Timing:</strong> All time values accept seconds or frames (e.g. <code>0.6s</code>, <code>12f</code>). Time expressions can reference <code>scene()</code>, <code>cue()</code>, and <code>mark()</code>.
</div>

<h3 id="transition-element">Transition Element</h3>
<p>Use <code>&lt;transition&gt;</code> between scenes for crossfades, wipes, and any branded or custom transitions.</p>

<table>
  <thead>
    <tr>
      <th>Attribute</th>
      <th>Type</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>id</code></td>
      <td>string</td>
      <td>Required unique id.</td>
    </tr>
    <tr>
      <td><code>start</code> / <code>end</code> / <code>duration</code></td>
      <td>time</td>
      <td>Optional. Explicit timing for the transition window.</td>
    </tr>
    <tr>
      <td><code>effect</code></td>
      <td>string</td>
      <td>Named transition preset (e.g. <code>crossfade</code>, <code>fade</code>, <code>wipe</code>).</td>
    </tr>
    <tr>
      <td><code>ease</code></td>
      <td>string</td>
      <td>GSAP ease string (e.g. <code>power2.inOut</code>).</td>
    </tr>
    <tr>
      <td><code>mode</code></td>
      <td>string</td>
      <td><code>overlap</code> (default) or <code>insert</code>.</td>
    </tr>
    <tr>
      <td><code>overflow</code></td>
      <td>string</td>
      <td>Visual overflow behavior: <code>clip</code>, <code>extend</code>, <code>allow</code>.</td>
    </tr>
    <tr>
      <td><code>overflow-audio</code></td>
      <td>string</td>
      <td>Audio overflow behavior: <code>clip</code>, <code>extend</code>, <code>allow</code>.</td>
    </tr>
  </tbody>
</table>

<h3 id="transition-audio">Audio in Transitions</h3>
<p>Transitions can include SFX and music via <code>&lt;sfx&gt;</code>, <code>&lt;music&gt;</code>, or <code>&lt;audio kind=...&gt;</code>.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;transition</span> id=<span class="st">"wipe-01"</span> effect=<span class="st">"wipe"</span> duration=<span class="st">"18f"</span> ease=<span class="st">"power2.inOut"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;sfx</span> id=<span class="st">"whoosh"</span> start=<span class="st">"0f"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;/transition&gt;</span></code></pre></div>

<h3 id="scene-enter-exit">Scene Enter/Exit (Convenience)</h3>
<p>For quick fades, use per-scene convenience attributes. These do not crossfade; they only animate the scene itself.</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene</span>
  id=<span class="st">"intro"</span>
  enter=<span class="st">"fade"</span>
  enter-duration=<span class="st">"12f"</span>
  exit=<span class="st">"fade"</span>
  exit-duration=<span class="st">"12f"</span>
<span class="fu">&gt;</span>
  <span class="fu">&lt;cue</span> id=<span class="st">"intro"</span><span class="fu">&gt;</span>Welcome to the video.<span class="fu">&lt;/cue&gt;</span>
<span class="fu">&lt;/scene&gt;</span></code></pre></div>

<div class="callout callout-info">
  <strong>Crossfade:</strong> Use a dedicated <code>&lt;transition&gt;</code> element for true crossfades between scenes.
</div>

<hr />


<h2 id="complete-example">Complete Example</h2>
<p>Here's a full VideoML document demonstrating all core features:</p>

<div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span>
  id=<span class="st">"product-demo"</span>
  title=<span class="st">"Product Demo Video"</span>
  fps=<span class="st">"30"</span>
  width=<span class="st">"1920"</span>
  height=<span class="st">"1080"</span>
<span class="fu">&gt;</span>
  <span class="fu">&lt;script&gt;</span>
    <span class="co">// Track scene transitions</span>
    window<span class="op">.</span><span class="fu">addEventListener</span>(<span class="st">'scene:start'</span><span class="op">,</span> (e) <span class="kw">=&gt;</span> {
      console<span class="op">.</span><span class="fu">log</span>(<span class="vs">\`Started: \${e.detail.sceneId}\`</span>)<span class="op">;</span>
    })<span class="op">;</span>
  <span class="fu">&lt;/script&gt;</span>

  <span class="co">&lt;!-- Title scene with explicit duration --&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"title"</span> duration=<span class="st">"3s"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;layer&gt;</span>
      <span class="fu">&lt;title-slide</span>
        title=<span class="st">"Product Demo"</span>
        subtitle=<span class="st">"Version 2.0"</span>
      <span class="fu">/&gt;</span>
    <span class="fu">&lt;/layer&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>

  <span class="co">&lt;!-- Narration scene with auto duration from TTS --&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"intro"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;stack&gt;</span>
      <span class="co">&lt;!-- Visual layer --&gt;</span>
      <span class="fu">&lt;layer&gt;</span>
        <span class="fu">&lt;content-screen</span> title=<span class="st">"Overview"</span><span class="fu">&gt;</span>
          <span class="fu">&lt;ul&gt;</span>
            <span class="fu">&lt;li&gt;</span>Fast performance<span class="fu">&lt;/li&gt;</span>
            <span class="fu">&lt;li&gt;</span>Easy to use<span class="fu">&lt;/li&gt;</span>
            <span class="fu">&lt;li&gt;</span>Secure by default<span class="fu">&lt;/li&gt;</span>
          <span class="fu">&lt;/ul&gt;</span>
        <span class="fu">&lt;/content-screen&gt;</span>
      <span class="fu">&lt;/layer&gt;</span>

      <span class="co">&lt;!-- Narration track --&gt;</span>
      <span class="fu">&lt;cue</span> id=<span class="st">"intro-narration"</span><span class="fu">&gt;</span>
        Our new product offers fast performance, ease of use, and security.
      <span class="fu">&lt;/cue&gt;</span>
    <span class="fu">&lt;/stack&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>

  <span class="co">&lt;!-- Code demo scene --&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"code-demo"</span> duration=<span class="st">"8s"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;layer&gt;</span>
      <span class="fu">&lt;code-block</span> language=<span class="st">"javascript"</span> filename=<span class="st">"app.js"</span><span class="fu">&gt;</span>
import { render } from 'babulus';

render({
  fps: 30,
  width: 1920,
  height: 1080
});
      <span class="fu">&lt;/code-block&gt;</span>
    <span class="fu">&lt;/layer&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>

  <span class="co">&lt;!-- Outro with lower third --&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"outro"</span> duration=<span class="st">"4s"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;layer</span> style=<span class="st">"z-index: 0"</span><span class="fu">&gt;</span>
      <span class="fu">&lt;background-gradient</span> colors=<span class="st">"#667eea,#764ba2"</span> <span class="fu">/&gt;</span>
    <span class="fu">&lt;/layer&gt;</span>
    <span class="fu">&lt;layer</span> style=<span class="st">"z-index: 10"</span><span class="fu">&gt;</span>
      <span class="fu">&lt;lower-third</span>
        name=<span class="st">"Learn More"</span>
        title=<span class="st">"babulus.dev"</span>
      <span class="fu">/&gt;</span>
    <span class="fu">&lt;/layer&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>

<hr />

<h2 id="design-decisions">Design Decisions</h2>
<p>Understanding the "why" behind VideoML's approach:</p>

<h3 id="why-xml">Why XML Over JSON?</h3>
<ul>
  <li><strong>HTML Familiarity:</strong> Web developers already know XML/HTML syntax</li>
  <li><strong>Mixed Content:</strong> XML supports text + elements naturally (JSON requires nested objects)</li>
  <li><strong>Web Components:</strong> Hyphenated custom elements (<code>&lt;title-slide /&gt;</code>) map directly to Web Component spec</li>
  <li><strong>Tooling:</strong> XML parsers, validators, and editors are mature and widely available</li>
</ul>

<h3 id="why-dom-runtime">Why DOM Runtime?</h3>
<ul>
  <li><strong>Zero Translation:</strong> VideoML elements become DOM nodes directly—no virtual layer</li>
  <li><strong>CSS Compatibility:</strong> Use standard CSS for styling, animations, and layout</li>
  <li><strong>JavaScript Integration:</strong> Manipulate video content with familiar DOM APIs</li>
  <li><strong>Browser Features:</strong> Leverage existing browser capabilities (accessibility, dev tools, extensions)</li>
</ul>

<h3 id="why-temporal-layout">Why Temporal Layout?</h3>
<ul>
  <li><strong>No Duration Math:</strong> Eliminate error-prone manual calculations</li>
  <li><strong>Composability:</strong> Scenes and sequences nest naturally</li>
  <li><strong>Flexibility:</strong> Swap a 3s scene for a 5s scene—total duration updates automatically</li>
  <li><strong>Narration-Driven:</strong> TTS audio length determines timing—video adapts to script changes</li>
</ul>

<h3 id="why-no-sandboxing">Why No Sandboxing?</h3>
<ul>
  <li><strong>Trust Model:</strong> VideoML files are source code, not untrusted user input</li>
  <li><strong>Power vs Safety:</strong> Full JavaScript access enables rich interactions (at cost of security review)</li>
  <li><strong>Renderer Context:</strong> Videos render in isolated headless browsers anyway</li>
  <li><strong>Future Work:</strong> Sandboxed mode may be added for user-generated content scenarios</li>
</ul>

<hr />

<h2 id="quick-reference">Quick Reference</h2>

<h3 id="core-elements">Core Elements</h3>
<table>
  <thead>
    <tr>
      <th>Element</th>
      <th>Purpose</th>
      <th>Key Attributes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>&lt;vml&gt;</code></td>
      <td>Root element</td>
      <td><code>id</code>, <code>fps</code>, <code>width</code>, <code>height</code></td>
    </tr>
    <tr>
      <td><code>&lt;scene&gt;</code></td>
      <td>Video section</td>
      <td><code>id</code>, <code>start</code>, <code>duration</code></td>
    </tr>
    <tr>
      <td><code>&lt;sequence&gt;</code></td>
      <td>Back-to-back</td>
      <td><code>duration</code> (auto)</td>
    </tr>
    <tr>
      <td><code>&lt;stack&gt;</code></td>
      <td>Parallel</td>
      <td><code>duration</code> (auto = max)</td>
    </tr>
    <tr>
      <td><code>&lt;layer&gt;</code></td>
      <td>Z-index container</td>
      <td><code>style</code></td>
    </tr>
    <tr>
      <td><code>&lt;cue&gt;</code></td>
      <td>TTS narration</td>
      <td><code>id</code>, <code>voice</code></td>
    </tr>
  </tbody>
</table>

<h3 id="timeline-api-summary">Timeline API Summary</h3>
<table>
  <thead>
    <tr>
      <th>API</th>
      <th>Access</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Current frame</td>
      <td><code>window.timeline.frame</code></td>
    </tr>
    <tr>
      <td>Current time</td>
      <td><code>window.timeline.time</code></td>
    </tr>
    <tr>
      <td>Frame rate</td>
      <td><code>window.timeline.fps</code></td>
    </tr>
    <tr>
      <td>CSS var (frame)</td>
      <td><code>var(--video-frame)</code></td>
    </tr>
    <tr>
      <td>CSS var (time)</td>
      <td><code>var(--video-time)</code></td>
    </tr>
  </tbody>
</table>

<h3 id="event-summary">Event Summary</h3>
<table>
  <thead>
    <tr>
      <th>Event</th>
      <th>Fires When</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>timeline:tick</code></td>
      <td>Every frame</td>
    </tr>
    <tr>
      <td><code>scene:start</code></td>
      <td>Scene begins</td>
    </tr>
    <tr>
      <td><code>scene:end</code></td>
      <td>Scene ends</td>
    </tr>
    <tr>
      <td><code>cue:start</code></td>
      <td>Cue audio starts</td>
    </tr>
    <tr>
      <td><code>cue:end</code></td>
      <td>Cue audio ends</td>
    </tr>
  </tbody>
</table>

<hr />

<h2 id="scope-and-non-goals">Scope and Non-Goals</h2>

<h3 id="in-scope">In Scope</h3>
<ul>
  <li>XML syntax and root element definition</li>
  <li>Temporal layout model (sequence, stack, auto-duration)</li>
  <li>Timeline API specification</li>
  <li>Lifecycle events (tick, scene, cue)</li>
  <li>Inline JavaScript and event handlers</li>
  <li>Web Component integration</li>
</ul>

<h3 id="out-of-scope">Out of Scope</h3>
<ul>
  <li><strong>Determinism Enforcement:</strong> VideoML does not guarantee reproducible output if scripts use randomness or external state</li>
  <li><strong>Sandboxed Scripting:</strong> No security isolation for <code>&lt;script&gt;</code> blocks (treat VideoML as trusted source code)</li>
  <li><strong>Backward Compatibility:</strong> <code>&lt;video&gt;</code> root is deprecated; <code>&lt;vml&gt;</code> is canonical</li>
  <li><strong>Animation Keyframes:</strong> Use CSS animations or JavaScript—VideoML provides timing, not animation primitives</li>
</ul>

<hr />

<h2 id="related-topics">Related Topics</h2>
<ul>
  <li><a href="/docs/videoml-conformance">VideoML Conformance</a> — Validation and testing</li>
  <li><a href="/docs/live-vom">Live VOM</a> — Real-time editing and recording</li>
  <li><a href="/docs/components">Components Guide</a> — Built-in Web Components</li>
  <li><a href="/docs/rendering-overview">Rendering Overview</a> — Generating MP4 outputs</li>
  <li><a href="/docs/glossary">Glossary</a> — VideoML terminology reference</li>
</ul>

<h2 id="next-steps">Next Steps</h2>
<ul>
  <li><strong>Try It:</strong> Create your first VideoML file in <a href="/code-to-video">Code to Video</a></li>
  <li><strong>Learn Components:</strong> Explore <a href="/docs/components-layouts">Layouts</a> and <a href="/docs/components">Components</a></li>
  <li><strong>Advanced:</strong> Read about <a href="/docs/live-vom">Live Mode</a> for interactive editing</li>
</ul>
`,
};
