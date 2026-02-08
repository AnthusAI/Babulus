import type { DocsEntry } from "@/lib/docs-registry";

export const videomlTransitionsDoc: DocsEntry = {
  slug: ["videoml", "transitions"],
  title: "Transitions",
  description: "Scene-to-scene transitions, audio cues, easing, and the integration-test gallery",
  category: "Designers",
  lastReviewed: "2026-02-06",
  html: `
<h1>Transitions</h1>
<div class="callout callout-info">
  Canonical docs now live at <a href="https://videoml.org/docs/standard">videoml.org/docs/standard</a>.
</div>
<p>Transitions are first-class timeline items that sit between scenes. They can overlap scenes (crossfade, wipe, slide) or insert time between them. Transitions are containers, so they can include visuals, layers, and audio cues.</p>

<div class="callout callout-info">
  <strong>Start here:</strong> The videos below are the primary documentation. Each example is also a full integration test.
</div>

<hr />

<h2>Integration test gallery</h2>
<p>Each example below is a full integration test. Add new transitions here as the library grows.</p>

<h3>Crossfade baseline</h3>
<p>Classic overlap dissolve. Use this when you want two scenes to blend without a cut.</p>
<div class="docs-preview" data-docs-preview="transitions-crossfade" data-w="1920" data-h="1080" data-autoplay="true"></div>
<details>
  <summary><strong>View XML</strong> (crossfade)</summary>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span> id=<span class="st">"transitions-crossfade"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"crossfade-a"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#7a1f1f&quot;}"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;layer</span> id=<span class="st">"bg"</span><span class="fu">&gt;&lt;video-background</span> props=<span class="st">"{&quot;color&quot;:&quot;#7a1f1f&quot;}"</span> <span class="fu">/&gt;&lt;/layer&gt;</span>
    <span class="fu">&lt;layer</span> id=<span class="st">"title"</span><span class="fu">&gt;&lt;video-title</span> props=<span class="st">"{&quot;text&quot;:&quot;Scene A&quot;,&quot;textAlign&quot;:&quot;center&quot;,&quot;position&quot;:{&quot;y&quot;:540}}"</span> <span class="fu">/&gt;&lt;/layer&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>
  <span class="fu">&lt;transition</span> id=<span class="st">"crossfade-1"</span> effect=<span class="st">"crossfade"</span> duration=<span class="st">"18f"</span> ease=<span class="st">"power2.inOut"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"crossfade-b"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#1f3a7a&quot;}"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;layer</span> id=<span class="st">"bg"</span><span class="fu">&gt;&lt;video-background</span> props=<span class="st">"{&quot;color&quot;:&quot;#1f3a7a&quot;}"</span> <span class="fu">/&gt;&lt;/layer&gt;</span>
    <span class="fu">&lt;layer</span> id=<span class="st">"title"</span><span class="fu">&gt;&lt;video-title</span> props=<span class="st">"{&quot;text&quot;:&quot;Scene B&quot;,&quot;textAlign&quot;:&quot;center&quot;,&quot;position&quot;:{&quot;y&quot;:540}}"</span> <span class="fu">/&gt;&lt;/layer&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>
</details>

<h3>Slide + push directions</h3>
<p>Directional moves. Slide brings the next scene in; push moves both scenes to emphasize momentum.</p>
<div class="docs-preview" data-docs-preview="transitions-slide-push" data-w="1920" data-h="1080"></div>
<details>
  <summary><strong>View XML</strong> (slide + push)</summary>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span> id=<span class="st">"transitions-slide-push"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"slide-a"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#7a1f1f&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
  <span class="fu">&lt;transition</span> id=<span class="st">"slide-left"</span> effect=<span class="st">"slide"</span> duration=<span class="st">"16f"</span> ease=<span class="st">"power3.inOut"</span> props=<span class="st">"{&quot;direction&quot;:&quot;left&quot;}"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"slide-b"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#1f7a3a&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
  <span class="fu">&lt;transition</span> id=<span class="st">"push-up"</span> effect=<span class="st">"push"</span> duration=<span class="st">"18f"</span> ease=<span class="st">"power2.inOut"</span> props=<span class="st">"{&quot;direction&quot;:&quot;up&quot;}"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"slide-c"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#1f3a7a&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>
</details>

<h3>Wipe + custom easing</h3>
<p>Hard-edge reveal with a custom ease curve for sharper, more graphic motion.</p>
<div class="docs-preview" data-docs-preview="transitions-wipe" data-w="1920" data-h="1080"></div>
<details>
  <summary><strong>View XML</strong> (wipe)</summary>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span> id=<span class="st">"transitions-wipe"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"wipe-a"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#7a1f1f&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
  <span class="fu">&lt;transition</span> id=<span class="st">"wipe-right"</span> effect=<span class="st">"wipe"</span> duration=<span class="st">"20f"</span> ease=<span class="st">"expo.inOut"</span> props=<span class="st">"{&quot;direction&quot;:&quot;right&quot;}"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"wipe-b"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#1f3a7a&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>
</details>

<h3>Insert mode gap + audio</h3>
<p>Creates a deliberate gap between scenes (no overlap). Useful for beats, pauses, or SFX hits.</p>
<div class="docs-preview" data-docs-preview="transitions-insert-audio" data-w="1920" data-h="1080"></div>
<details>
  <summary><strong>View XML</strong> (insert + audio)</summary>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span> id=<span class="st">"transitions-insert-audio"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"insert-a"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#7a1f1f&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
  <span class="fu">&lt;transition</span> id=<span class="st">"insert-gap"</span> mode=<span class="st">"insert"</span> effect=<span class="st">"fade"</span> duration=<span class="st">"1.5s"</span> overflow-audio=<span class="st">"clip"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;sfx</span> id=<span class="st">"transition-hit"</span> start=<span class="st">"6f"</span> clip-duration=<span class="st">"0.6s"</span> prompt=<span class="st">"short impact"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;/transition&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"insert-b"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#1f7a3a&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>
</details>

<h3>Custom brand/logo transition</h3>
<p>Use this when you want a company logo or any custom graphic to appear during transitions. You can add audio, layers, or completely custom motion here.</p>
<div class="docs-preview" data-docs-preview="transitions-branded" data-w="1920" data-h="1080"></div>
<details>
  <summary><strong>View XML</strong> (branded)</summary>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;vml</span> id=<span class="st">"transitions-branded"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"brand-a"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#7a1f1f&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
  <span class="fu">&lt;transition</span> id=<span class="st">"brand-overlay"</span> effect=<span class="st">"fade"</span> duration=<span class="st">"20f"</span> ease=<span class="st">"power2.inOut"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;icon</span> props=<span class="st">"{&quot;kind&quot;:&quot;lucide&quot;,&quot;name&quot;:&quot;star&quot;,&quot;size&quot;:180,&quot;strokeWidth&quot;:8,&quot;position&quot;:{&quot;x&quot;:1240,&quot;y&quot;:420}}"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;/transition&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"brand-b"</span> styles=<span class="st">"{&quot;background&quot;:&quot;#1f3a7a&quot;}"</span><span class="fu">&gt;</span>...<span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/vml&gt;</span></code></pre></div>
</details>

<hr />

<h2>Core concepts</h2>
<ul>
  <li><strong>Transition element:</strong> Use <code>&lt;transition&gt;</code> for scene-to-scene effects and custom branded motion.</li>
  <li><strong>Scene enter/exit:</strong> Convenience attributes for fade in/out on a single scene (not a crossfade).</li>
  <li><strong>Overlap vs insert:</strong> Overlap blends scenes; insert creates a gap and shifts later scenes forward.</li>
  <li><strong>Audio in transitions:</strong> Use <code>&lt;sfx&gt;</code>, <code>&lt;music&gt;</code>, or <code>&lt;audio kind=...&gt;</code> inside a transition.</li>
  <li><strong>GSAP easing:</strong> Use GSAP ease strings (e.g. <code>power2.inOut</code>).</li>
</ul>

<details>
  <summary><strong>Transition element</strong> (XML)</summary>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;transition</span> id=<span class="st">"crossfade-1"</span> effect=<span class="st">"crossfade"</span> duration=<span class="st">"18f"</span> ease=<span class="st">"power2.inOut"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;sfx</span> id=<span class="st">"whoosh"</span> start=<span class="st">"0f"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;/transition&gt;</span></code></pre></div>
  <h3>Attributes</h3>
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
        <td>Named transition preset (e.g. <code>crossfade</code>, <code>fade</code>, <code>wipe</code>, <code>slide</code>).</td>
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
</details>

<details>
  <summary><strong>Scene enter/exit</strong> (XML)</summary>
  <p>Enter/exit transitions are simple helpers for a single scene. They do not crossfade.</p>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;scene</span>
  id=<span class="st">"intro"</span>
  enter=<span class="st">"fade"</span>
  enter-duration=<span class="st">"12f"</span>
  exit=<span class="st">"fade"</span>
  exit-duration=<span class="st">"12f"</span>
<span class="fu">&gt;</span>
  <span class="fu">&lt;cue</span> id=<span class="st">"intro"</span><span class="fu">&gt;</span>Welcome to the video.<span class="fu">&lt;/cue&gt;</span>
<span class="fu">&lt;/scene&gt;</span></code></pre></div>
</details>

<details>
  <summary><strong>Overlap vs insert</strong> (XML)</summary>
  <p><strong>Overlap</strong> blends adjacent scenes over the transition window. <strong>Insert</strong> shifts later scenes forward, creating a gap between scenes.</p>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;transition</span> id=<span class="st">"gap"</span> mode=<span class="st">"insert"</span> duration=<span class="st">"1.5s"</span> effect=<span class="st">"fade"</span><span class="fu">/&gt;</span></code></pre></div>
</details>

<details>
  <summary><strong>Audio cues in transitions</strong> (XML)</summary>
  <p>Audio clips inside a transition are timed relative to the transition start. Use <code>overflow-audio</code> to clip, extend, or allow audio beyond the transition window.</p>
  <div class="sourceCode"><pre class="sourceCode xml"><code class="sourceCode xml"><span class="fu">&lt;transition</span> id=<span class="st">"audio-test"</span> duration=<span class="st">"24f"</span> overflow-audio=<span class="st">"clip"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;sfx</span> id=<span class="st">"impact"</span> start=<span class="st">"8f"</span> clip-duration=<span class="st">"1s"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;/transition&gt;</span></code></pre></div>
</details>

<hr />

<h2>Checklist for new transition videos</h2>
<ul>
  <li>Shows the transition in isolation with strong contrast.</li>
  <li>Includes a timing edge case (short/long duration).</li>
  <li>Includes audio if relevant.</li>
  <li>Uses a GSAP ease string (non-linear).</li>
</ul>
`,
};
