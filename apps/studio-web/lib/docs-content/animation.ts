import type { DocsEntry } from "@/lib/docs-registry";

export const animationDoc: DocsEntry = {
  slug: ["animation"],
  title: "Animation",
  description: "Unified, frame-synchronized animation across layout, data, generative art, 3D, and motion graphics",
  category: "Designers",
  html: `
<div class="docs-preview" data-docs-preview="animation-reel" data-w="1920" data-h="1080" data-autoplay="true"></div>

<h1>Animation</h1>
<p>Babulus treats animation as a deterministic function of frame. Every component renders from a single input:</p>
<div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">render</span>(frame: <span class="dt">number</span>) <span class="op">-&gt;</span> visual output</code></pre></div>
<p>No global timers. No CSS keyframes. No independent loops. This keeps previews and renders perfectly synchronized across all animation engines.</p>

<hr />

<h2>Why frame-driven matters</h2>
<ul>
  <li><strong>Deterministic previews</strong>: scrub any frame and see the exact output.</li>
  <li><strong>Deterministic renders</strong>: the same input always yields the same output.</li>
  <li><strong>Cross-engine synchronization</strong>: layout, data viz, generative art, and 3D all share the same timeline.</li>
</ul>

<hr />

<h2>Unified engine integration</h2>
<p>Babulus integrates multiple animation engines behind a consistent frame contract. You can mix and match these components in the same scene:</p>
<ul>
  <li><strong>Framer Motion</strong> for layout and orchestration</li>
  <li><strong>D3</strong> for animated data visualization</li>
  <li><strong>Processing / p5.js</strong> for generative art & special effects</li>
  <li><strong>Three.js</strong> for spatial 3D scenes</li>
  <li><strong>Anime.js</strong> for low-level motion on DOM targets (frame-driven via seek)</li>
  <li><strong>Lottie (After Effects)</strong> for motion graphic assets</li>
  <li><strong>Text Effects</strong> for named-effect kinetic typography (built on Anime.js)</li>
</ul>

<hr />

<h2>Base classes</h2>
<p>Each engine is wrapped by a frame-driven base class in the Babulus standard library. Extend these classes and you inherit:</p>
<ul>
  <li>Frame synchronization</li>
  <li>Deterministic rendering</li>
  <li>Automatic sizing to video dimensions</li>
</ul>

<pre><code>class MySketch extends P5SketchBase {
  drawFrame(p5, frame, fps, size) {
    // draw based on frame
  }
}</code></pre>

<hr />

<details>
  <summary><strong>View code</strong> (demo reel)</summary>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene</span> id=<span class="st">"reel"</span> ...<span class="fu">&gt;</span>
  <span class="co">&lt;!-- Framer / D3 / p5 / Three / Lottie / Text / Anime / Mix --&gt;</span>
<span class="fu">&lt;/scene&gt;</span></code></pre></div>
</details>

<hr />

<h2>Framer Motion (Layout + Motion Graphics)</h2>
<p>Frame-driven motion using Framer Motion components and Babulus frame helpers.</p>
<div class="docs-preview" data-docs-preview="animation-framer" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (framer)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">framerMotionDemo</span>({
  size: 240,
  accent: <span class="st">'var(--color-accent)'</span>
});</code></pre></div>
</details>

<h2>D3 (Data Visualization)</h2>
<p>Frame-synchronized chart transitions without time-based D3 transitions.</p>
<div class="docs-preview" data-docs-preview="animation-d3" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (d3)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">d3BarChart</span>({
  valuesA: [4, 7, 5, 8, 6],
  valuesB: [6, 3, 9, 4, 7]
});</code></pre></div>
</details>

<h2>Processing / p5.js (Generative Art)</h2>
<p>Procedural visuals driven by frame, not time.</p>
<div class="docs-preview" data-docs-preview="animation-processing" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (p5)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">processingSketch</span>({
  particleCount: 28
});</code></pre></div>
</details>

<h2>Three.js (3D Scenes)</h2>
<p>Frame-driven 3D rendering with deterministic camera + object motion.</p>
<div class="docs-preview" data-docs-preview="animation-three" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (three)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">threeOrbit</span>({
  cubeSize: 160
});</code></pre></div>
</details>

<h2>Lottie (After Effects)</h2>
<p>After Effects animations rendered frame-by-frame in sync with the timeline.</p>
<div class="docs-preview" data-docs-preview="animation-lottie" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (lottie)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">lottieBadge</span>({
  size: 280
});</code></pre></div>
</details>

<h2>Text Effects (Named effects)</h2>
<p>A high-level vocabulary for text animation: named effects, units (chars/words/lines), and deterministic timing.</p>
<div class="docs-preview" data-docs-preview="animation-text-effects" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (text effects)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">component</span>(<span class="st">'text'</span>, <span class="st">'TextEffectsDemo'</span>, {});</code></pre></div>
</details>

<h2>Text Effects Cookbook</h2>
<p>Curated effects (stable names with predictable motion):</p>
<ul>
  <li><code>fade</code></li>
  <li><code>fade_up</code></li>
  <li><code>fade_down</code></li>
  <li><code>slide_left</code></li>
  <li><code>slide_right</code></li>
  <li><code>pop</code></li>
  <li><code>scale_in</code></li>
</ul>
<p>If a cue is present, the default start is <code>{ kind: "cue" }</code> (no manual frame math required).</p>
<details>
  <summary><strong>View code</strong> (title effect)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">title</span>({
  text: <span class="st">"Frame-driven titles"</span>,
  textEffect: {
    effect: <span class="st">"fade_up"</span>,
    unit: <span class="st">"words"</span>,
    durationFrames: 24,
    staggerFrames: 4,
    start: { kind: <span class="st">"cue"</span> }
  }
});</code></pre></div>
</details>
<p>See <a href="/docs/components">Components</a> for more text effect examples with Title + Subtitle.</p>

<h2>Anime.js (Low-level harness)</h2>
<p>Full control over DOM-target animation while staying frame-driven via <code>seek()</code>.</p>
<div class="docs-preview" data-docs-preview="animation-anime" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (anime)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">component</span>(<span class="st">'anime'</span>, <span class="st">'AnimeHarnessDemo'</span>, {});</code></pre></div>
</details>

<h2>Mix-and-match scenes</h2>
<p>Use multiple engines in the same scene. Because everything is frame-driven, all layers stay perfectly synchronized.</p>
<div class="docs-preview" data-docs-preview="animation-mix" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View code</strong> (mix + match)</summary>
  <div class="sourceCode"><pre class="sourceCode ts"><code class="sourceCode ts"><span class="fu">layer</span>.<span class="fu">mixAndMatchDemo</span>();</code></pre></div>
</details>
`,
};
