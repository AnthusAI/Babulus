export const componentsGuideDoc = {
  "slug": [
    "components",
    "guide"
  ],
  "title": "Component System Guide",
  "description": "Learn how to build videos using the component-based blank slate architecture",
  "category": "Developer Reference",
  "html": `<h1 id="component-system-guide">Component System Guide</h1>
<p><strong>Designers:</strong> For the curated component catalog and examples, see <a href="/docs/components">Components</a>.</p>
<h2 id="overview">Overview</h2>
<p>Babulus uses a <strong>blank slate architecture</strong> - scenes start completely empty (black background, no elements) and you explicitly add visual components to build your video. This gives you full control over what appears on screen.</p>
<p><strong>Key Concepts:</strong></p>
<ul>
<li><strong>Components</strong> - Visual elements you add to scenes (titles, subtitles, progress bars, backgrounds)</li>
<li><strong>Blank Slate</strong> - Scenes have nothing by default, you build up from scratch</li>
<li><strong>Data Binding</strong> - Components can display data from scenes and cues dynamically</li>
<li><strong>Layering</strong> - Control what appears in front/behind using zIndex</li>
<li><strong>Timing</strong> - Show/hide components at specific times</li>
</ul>

<h2 id="blank-slate-philosophy">Blank Slate Philosophy</h2>
<p>Unlike traditional video tools that start with a template, Babulus scenes are <strong>completely blank by default</strong>:</p>
<ul>
<li>Black background (#000000)</li>
<li>No title, subtitle, or metadata overlays</li>
<li>No progress bars or decorative elements</li>
<li>Nothing appears unless you explicitly add it</li>
</ul>
<p>This prevents surprising "magic" behavior and gives you complete control. It follows video production conventions where you start with a blank canvas.</p>

<h2 id="quick-start">Quick Start</h2>
<h3 id="basic-scene-with-components">Basic Scene with Components</h3>
<div class="sourceCode" id="cb1"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb1-1"><a href="#cb1-1" aria-hidden="true" tabindex="-1"></a><span class="im">import</span> { defineVideo } <span class="im">from</span> <span class="st">"@babulus/dsl"</span><span class="op">;</span></span>
<span id="cb1-2"><a href="#cb1-2" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb1-3"><a href="#cb1-3" aria-hidden="true" tabindex="-1"></a><span class="im">export</span> <span class="im">default</span> <span class="fu">defineVideo</span>((video) <span class="kw">=&gt;</span> {</span>
<span id="cb1-4"><a href="#cb1-4" aria-hidden="true" tabindex="-1"></a>  video<span class="op">.</span><span class="fu">composition</span>(<span class="st">"My Video"</span><span class="op">,</span> (composition) <span class="kw">=&gt;</span> {</span>
<span id="cb1-5"><a href="#cb1-5" aria-hidden="true" tabindex="-1"></a>    composition<span class="op">.</span><span class="fu">meta</span>({ fps<span class="op">:</span> <span class="dv">30</span><span class="op">,</span> width<span class="op">:</span> <span class="dv">1280</span><span class="op">,</span> height<span class="op">:</span> <span class="dv">720</span> })<span class="op">;</span></span>
<span id="cb1-6"><a href="#cb1-6" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb1-7"><a href="#cb1-7" aria-hidden="true" tabindex="-1"></a>    composition<span class="op">.</span><span class="fu">scene</span>(<span class="st">"intro"</span><span class="op">,</span> (scene) <span class="kw">=&gt;</span> {</span>
<span id="cb1-8"><a href="#cb1-8" aria-hidden="true" tabindex="-1"></a>      scene<span class="op">.</span><span class="fu">title</span>(<span class="st">"Welcome to Babulus"</span>)<span class="op">;</span></span>
<span id="cb1-9"><a href="#cb1-9" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb1-10"><a href="#cb1-10" aria-hidden="true" tabindex="-1"></a>      <span class="co">// Add components</span></span>
<span id="cb1-11"><a href="#cb1-11" aria-hidden="true" tabindex="-1"></a>      scene<span class="op">.</span><span class="at">components</span> <span class="op">=</span> [</span>
<span id="cb1-12"><a href="#cb1-12" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb1-13"><a href="#cb1-13" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"background"</span><span class="op">,</span></span>
<span id="cb1-14"><a href="#cb1-14" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"Background"</span><span class="op">,</span></span>
<span id="cb1-15"><a href="#cb1-15" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb1-16"><a href="#cb1-16" aria-hidden="true" tabindex="-1"></a>            gradient<span class="op">:</span> <span class="st">"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"</span></span>
<span id="cb1-17"><a href="#cb1-17" aria-hidden="true" tabindex="-1"></a>          }</span>
<span id="cb1-18"><a href="#cb1-18" aria-hidden="true" tabindex="-1"></a>        }<span class="op">,</span></span>
<span id="cb1-19"><a href="#cb1-19" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb1-20"><a href="#cb1-20" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"title"</span><span class="op">,</span></span>
<span id="cb1-21"><a href="#cb1-21" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb1-22"><a href="#cb1-22" aria-hidden="true" tabindex="-1"></a>          bindings<span class="op">:</span> {</span>
<span id="cb1-23"><a href="#cb1-23" aria-hidden="true" tabindex="-1"></a>            text<span class="op">:</span> <span class="st">"scene.title"</span>  <span class="co">// Bind to scene title</span></span>
<span id="cb1-24"><a href="#cb1-24" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb1-25"><a href="#cb1-25" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb1-26"><a href="#cb1-26" aria-hidden="true" tabindex="-1"></a>            fontSize<span class="op">:</span> <span class="dv">56</span><span class="op">,</span></span>
<span id="cb1-27"><a href="#cb1-27" aria-hidden="true" tabindex="-1"></a>            color<span class="op">:</span> <span class="st">"#ffffff"</span><span class="op">,</span></span>
<span id="cb1-28"><a href="#cb1-28" aria-hidden="true" tabindex="-1"></a>            position<span class="op">:</span> { x<span class="op">:</span> <span class="dv">48</span><span class="op">,</span> y<span class="op">:</span> <span class="dv">48</span> }</span>
<span id="cb1-29"><a href="#cb1-29" aria-hidden="true" tabindex="-1"></a>          }</span>
<span id="cb1-30"><a href="#cb1-30" aria-hidden="true" tabindex="-1"></a>        }<span class="op">,</span></span>
<span id="cb1-31"><a href="#cb1-31" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb1-32"><a href="#cb1-32" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"progress"</span><span class="op">,</span></span>
<span id="cb1-33"><a href="#cb1-33" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"ProgressBar"</span><span class="op">,</span></span>
<span id="cb1-34"><a href="#cb1-34" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb1-35"><a href="#cb1-35" aria-hidden="true" tabindex="-1"></a>            position<span class="op">:</span> <span class="st">"bottom"</span><span class="op">,</span></span>
<span id="cb1-36"><a href="#cb1-36" aria-hidden="true" tabindex="-1"></a>            height<span class="op">:</span> <span class="dv">8</span></span>
<span id="cb1-37"><a href="#cb1-37" aria-hidden="true" tabindex="-1"></a>          }</span>
<span id="cb1-38"><a href="#cb1-38" aria-hidden="true" tabindex="-1"></a>        }</span>
<span id="cb1-39"><a href="#cb1-39" aria-hidden="true" tabindex="-1"></a>      ]<span class="op">;</span></span>
<span id="cb1-40"><a href="#cb1-40" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb1-41"><a href="#cb1-41" aria-hidden="true" tabindex="-1"></a>      scene<span class="op">.</span><span class="fu">cue</span>(<span class="st">"intro-cue"</span><span class="op">,</span> (cue) <span class="kw">=&gt;</span> {</span>
<span id="cb1-42"><a href="#cb1-42" aria-hidden="true" tabindex="-1"></a>        cue<span class="op">.</span><span class="fu">voice</span>((v) <span class="kw">=&gt;</span> v<span class="op">.</span><span class="fu">say</span>(<span class="st">"Welcome to our platform!"</span>))<span class="op">;</span></span>
<span id="cb1-43"><a href="#cb1-43" aria-hidden="true" tabindex="-1"></a>      })<span class="op">;</span></span>
<span id="cb1-44"><a href="#cb1-44" aria-hidden="true" tabindex="-1"></a>    })<span class="op">;</span></span>
<span id="cb1-45"><a href="#cb1-45" aria-hidden="true" tabindex="-1"></a>  })<span class="op">;</span></span>
<span id="cb1-46"><a href="#cb1-46" aria-hidden="true" tabindex="-1"></a>})<span class="op">;</span></span></code></pre></div>

<h2 id="built-in-components">Built-in Components</h2>
<h3 id="background-component">Background Component</h3>
<p>Sets the scene background - supports solid colors, gradients, and images.</p>
<div class="sourceCode" id="cb2"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb2-1"><a href="#cb2-1" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb2-2"><a href="#cb2-2" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"bg"</span><span class="op">,</span></span>
<span id="cb2-3"><a href="#cb2-3" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Background"</span><span class="op">,</span></span>
<span id="cb2-4"><a href="#cb2-4" aria-hidden="true" tabindex="-1"></a>  props<span class="op">:</span> {</span>
<span id="cb2-5"><a href="#cb2-5" aria-hidden="true" tabindex="-1"></a>    color<span class="op">:</span> <span class="st">"#1a1a1a"</span>              <span class="co">// Solid color</span></span>
<span id="cb2-6"><a href="#cb2-6" aria-hidden="true" tabindex="-1"></a>    <span class="co">// OR</span></span>
<span id="cb2-7"><a href="#cb2-7" aria-hidden="true" tabindex="-1"></a>    gradient<span class="op">:</span> <span class="st">"linear-gradient(90deg, #667eea, #764ba2)"</span>  <span class="co">// CSS gradient</span></span>
<span id="cb2-8"><a href="#cb2-8" aria-hidden="true" tabindex="-1"></a>    <span class="co">// OR</span></span>
<span id="cb2-9"><a href="#cb2-9" aria-hidden="true" tabindex="-1"></a>    image<span class="op">:</span> <span class="st">"url('./assets/background.jpg')"</span>  <span class="co">// Image URL</span></span>
<span id="cb2-10"><a href="#cb2-10" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb2-11"><a href="#cb2-11" aria-hidden="true" tabindex="-1"></a>}</span></code></pre></div>
<p><strong>Props:</strong></p>
<ul>
<li><code>color</code> (string) - Solid background color (default: "#000000")</li>
<li><code>gradient</code> (string) - CSS gradient string</li>
<li><code>image</code> (string) - CSS background-image value</li>
</ul>
<p><strong>Note:</strong> Background always renders behind other components (zIndex: -1).</p>

<h3 id="title-component">Title Component</h3>
<p>Displays large heading text, typically bound to scene title.</p>
<div class="sourceCode" id="cb3"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb3-1"><a href="#cb3-1" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb3-2"><a href="#cb3-2" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"title"</span><span class="op">,</span></span>
<span id="cb3-3"><a href="#cb3-3" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb3-4"><a href="#cb3-4" aria-hidden="true" tabindex="-1"></a>  bindings<span class="op">:</span> {</span>
<span id="cb3-5"><a href="#cb3-5" aria-hidden="true" tabindex="-1"></a>    text<span class="op">:</span> <span class="st">"scene.title"</span>  <span class="co">// Data binding</span></span>
<span id="cb3-6"><a href="#cb3-6" aria-hidden="true" tabindex="-1"></a>  }<span class="op">,</span></span>
<span id="cb3-7"><a href="#cb3-7" aria-hidden="true" tabindex="-1"></a>  props<span class="op">:</span> {</span>
<span id="cb3-8"><a href="#cb3-8" aria-hidden="true" tabindex="-1"></a>    fontSize<span class="op">:</span> <span class="dv">48</span><span class="op">,</span></span>
<span id="cb3-9"><a href="#cb3-9" aria-hidden="true" tabindex="-1"></a>    fontWeight<span class="op">:</span> <span class="dv">700</span><span class="op">,</span></span>
<span id="cb3-10"><a href="#cb3-10" aria-hidden="true" tabindex="-1"></a>    color<span class="op">:</span> <span class="st">"#ffffff"</span><span class="op">,</span></span>
<span id="cb3-11"><a href="#cb3-11" aria-hidden="true" tabindex="-1"></a>    textAlign<span class="op">:</span> <span class="st">"center"</span><span class="op">,</span></span>
<span id="cb3-12"><a href="#cb3-12" aria-hidden="true" tabindex="-1"></a>    position<span class="op">:</span> { x<span class="op">:</span> <span class="dv">48</span><span class="op">,</span> y<span class="op">:</span> <span class="dv">48</span> }</span>
<span id="cb3-13"><a href="#cb3-13" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb3-14"><a href="#cb3-14" aria-hidden="true" tabindex="-1"></a>}</span></code></pre></div>
<p><strong>Props:</strong></p>
<ul>
<li><code>text</code> (string) - Explicit text to display</li>
<li><code>binding</code> (string) - Data reference (e.g., "scene.title")</li>
<li><code>fontSize</code> (number) - Font size in pixels (default: 48)</li>
<li><code>fontWeight</code> (number | string) - CSS font-weight (default: 700)</li>
<li><code>color</code> (string) - Text color (default: "#ffffff")</li>
<li><code>textAlign</code> ("left" | "center" | "right") - Alignment (default: "left")</li>
<li><code>position</code> (object) - { x, y } position in pixels (default: { x: 48, y: 48 })</li>
</ul>

<h3 id="subtitle-component">Subtitle Component</h3>
<p>Displays smaller text, typically bound to active cue text.</p>
<div class="sourceCode" id="cb4"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb4-1"><a href="#cb4-1" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb4-2"><a href="#cb4-2" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"subtitle"</span><span class="op">,</span></span>
<span id="cb4-3"><a href="#cb4-3" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Subtitle"</span><span class="op">,</span></span>
<span id="cb4-4"><a href="#cb4-4" aria-hidden="true" tabindex="-1"></a>  bindings<span class="op">:</span> {</span>
<span id="cb4-5"><a href="#cb4-5" aria-hidden="true" tabindex="-1"></a>    text<span class="op">:</span> <span class="st">"cue.text"</span>  <span class="co">// Default: shows active cue text</span></span>
<span id="cb4-6"><a href="#cb4-6" aria-hidden="true" tabindex="-1"></a>  }<span class="op">,</span></span>
<span id="cb4-7"><a href="#cb4-7" aria-hidden="true" tabindex="-1"></a>  props<span class="op">:</span> {</span>
<span id="cb4-8"><a href="#cb4-8" aria-hidden="true" tabindex="-1"></a>    fontSize<span class="op">:</span> <span class="dv">20</span><span class="op">,</span></span>
<span id="cb4-9"><a href="#cb4-9" aria-hidden="true" tabindex="-1"></a>    color<span class="op">:</span> <span class="st">"#cbd5f5"</span><span class="op">,</span></span>
<span id="cb4-10"><a href="#cb4-10" aria-hidden="true" tabindex="-1"></a>    position<span class="op">:</span> { x<span class="op">:</span> <span class="dv">48</span><span class="op">,</span> y<span class="op">:</span> <span class="dv">120</span> }</span>
<span id="cb4-11"><a href="#cb4-11" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb4-12"><a href="#cb4-12" aria-hidden="true" tabindex="-1"></a>}</span></code></pre></div>
<p><strong>Props:</strong> Same as Title component.</p>
<p><strong>Default Behavior:</strong> If no binding is specified, defaults to "cue.text" to show the active cue's spoken text.</p>

<h3 id="progressbar-component">ProgressBar Component</h3>
<p>Shows video playback progress.</p>
<div class="sourceCode" id="cb5"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb5-1"><a href="#cb5-1" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb5-2"><a href="#cb5-2" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"progress"</span><span class="op">,</span></span>
<span id="cb5-3"><a href="#cb5-3" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"ProgressBar"</span><span class="op">,</span></span>
<span id="cb5-4"><a href="#cb5-4" aria-hidden="true" tabindex="-1"></a>  props<span class="op">:</span> {</span>
<span id="cb5-5"><a href="#cb5-5" aria-hidden="true" tabindex="-1"></a>    position<span class="op">:</span> <span class="st">"bottom"</span><span class="op">,</span>  <span class="co">// "top" or "bottom"</span></span>
<span id="cb5-6"><a href="#cb5-6" aria-hidden="true" tabindex="-1"></a>    height<span class="op">:</span> <span class="dv">8</span><span class="op">,</span></span>
<span id="cb5-7"><a href="#cb5-7" aria-hidden="true" tabindex="-1"></a>    color<span class="op">:</span> <span class="st">"linear-gradient(90deg, #38bdf8, #818cf8)"</span><span class="op">,</span></span>
<span id="cb5-8"><a href="#cb5-8" aria-hidden="true" tabindex="-1"></a>    backgroundColor<span class="op">:</span> <span class="st">"rgba(148,163,184,0.25)"</span></span>
<span id="cb5-9"><a href="#cb5-9" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb5-10"><a href="#cb5-10" aria-hidden="true" tabindex="-1"></a>}</span></code></pre></div>
<p><strong>Props:</strong></p>
<ul>
<li><code>position</code> ("top" | "bottom") - Bar position (default: "bottom")</li>
<li><code>height</code> (number) - Height in pixels (default: 8)</li>
<li><code>color</code> (string) - Fill color/gradient (default: blue gradient)</li>
<li><code>backgroundColor</code> (string) - Track color (default: semi-transparent gray)</li>
</ul>
<p><strong>Note:</strong> Progress is automatically calculated and injected by the renderer.</p>

<h2 id="data-binding">Data Binding</h2>
<p>Components can reference dynamic data using the <code>bindings</code> property.</p>
<h3 id="available-data-references">Available Data References</h3>
<p><strong>Scene Data:</strong></p>
<ul>
<li><code>scene.title</code> - Scene title</li>
<li><code>scene.id</code> - Scene ID</li>
</ul>
<p><strong>Cue Data:</strong></p>
<ul>
<li><code>cue.text</code> - Active cue's text content</li>
<li><code>cue.label</code> - Active cue's label</li>
<li><code>cue.id</code> - Active cue's ID</li>
</ul>
<p><strong>Frame Data:</strong></p>
<ul>
<li><code>frame.number</code> - Current frame number</li>
<li><code>frame.time</code> - Current time in seconds</li>
</ul>

<h3 id="binding-examples">Binding Examples</h3>
<div class="sourceCode" id="cb6"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb6-1"><a href="#cb6-1" aria-hidden="true" tabindex="-1"></a><span class="co">// Title bound to scene title</span></span>
<span id="cb6-2"><a href="#cb6-2" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb6-3"><a href="#cb6-3" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"title"</span><span class="op">,</span></span>
<span id="cb6-4"><a href="#cb6-4" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb6-5"><a href="#cb6-5" aria-hidden="true" tabindex="-1"></a>  bindings<span class="op">:</span> { text<span class="op">:</span> <span class="st">"scene.title"</span> }</span>
<span id="cb6-6"><a href="#cb6-6" aria-hidden="true" tabindex="-1"></a>}</span>
<span id="cb6-7"><a href="#cb6-7" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb6-8"><a href="#cb6-8" aria-hidden="true" tabindex="-1"></a><span class="co">// Subtitle showing current cue text</span></span>
<span id="cb6-9"><a href="#cb6-9" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb6-10"><a href="#cb6-10" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"subtitle"</span><span class="op">,</span></span>
<span id="cb6-11"><a href="#cb6-11" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Subtitle"</span><span class="op">,</span></span>
<span id="cb6-12"><a href="#cb6-12" aria-hidden="true" tabindex="-1"></a>  bindings<span class="op">:</span> { text<span class="op">:</span> <span class="st">"cue.text"</span> }  <span class="co">// Updates as cues change</span></span>
<span id="cb6-13"><a href="#cb6-13" aria-hidden="true" tabindex="-1"></a>}</span>
<span id="cb6-14"><a href="#cb6-14" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb6-15"><a href="#cb6-15" aria-hidden="true" tabindex="-1"></a><span class="co">// Static text (no binding)</span></span>
<span id="cb6-16"><a href="#cb6-16" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb6-17"><a href="#cb6-17" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"watermark"</span><span class="op">,</span></span>
<span id="cb6-18"><a href="#cb6-18" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb6-19"><a href="#cb6-19" aria-hidden="true" tabindex="-1"></a>  props<span class="op">:</span> {</span>
<span id="cb6-20"><a href="#cb6-20" aria-hidden="true" tabindex="-1"></a>    text<span class="op">:</span> <span class="st">"© 2026 My Company"</span><span class="op">,</span>  <span class="co">// Fixed text</span></span>
<span id="cb6-21"><a href="#cb6-21" aria-hidden="true" tabindex="-1"></a>    fontSize<span class="op">:</span> <span class="dv">14</span><span class="op">,</span></span>
<span id="cb6-22"><a href="#cb6-22" aria-hidden="true" tabindex="-1"></a>    position<span class="op">:</span> { x<span class="op">:</span> <span class="dv">20</span><span class="op">,</span> y<span class="op">:</span> <span class="dv">680</span> }</span>
<span id="cb6-23"><a href="#cb6-23" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb6-24"><a href="#cb6-24" aria-hidden="true" tabindex="-1"></a>}</span></code></pre></div>

<h2 id="layering-with-zindex">Layering with zIndex</h2>
<p>Control which components appear in front or behind using <code>zIndex</code>.</p>
<div class="sourceCode" id="cb7"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb7-1"><a href="#cb7-1" aria-hidden="true" tabindex="-1"></a>scene<span class="op">.</span><span class="at">components</span> <span class="op">=</span> [</span>
<span id="cb7-2"><a href="#cb7-2" aria-hidden="true" tabindex="-1"></a>  {</span>
<span id="cb7-3"><a href="#cb7-3" aria-hidden="true" tabindex="-1"></a>    id<span class="op">:</span> <span class="st">"bg"</span><span class="op">,</span></span>
<span id="cb7-4"><a href="#cb7-4" aria-hidden="true" tabindex="-1"></a>    type<span class="op">:</span> <span class="st">"Background"</span><span class="op">,</span></span>
<span id="cb7-5"><a href="#cb7-5" aria-hidden="true" tabindex="-1"></a>    zIndex<span class="op">:</span> <span class="op">-</span><span class="dv">1</span>  <span class="co">// Always in back</span></span>
<span id="cb7-6"><a href="#cb7-6" aria-hidden="true" tabindex="-1"></a>  }<span class="op">,</span></span>
<span id="cb7-7"><a href="#cb7-7" aria-hidden="true" tabindex="-1"></a>  {</span>
<span id="cb7-8"><a href="#cb7-8" aria-hidden="true" tabindex="-1"></a>    id<span class="op">:</span> <span class="st">"title"</span><span class="op">,</span></span>
<span id="cb7-9"><a href="#cb7-9" aria-hidden="true" tabindex="-1"></a>    type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb7-10"><a href="#cb7-10" aria-hidden="true" tabindex="-1"></a>    zIndex<span class="op">:</span> <span class="dv">10</span>  <span class="co">// In front</span></span>
<span id="cb7-11"><a href="#cb7-11" aria-hidden="true" tabindex="-1"></a>  }<span class="op">,</span></span>
<span id="cb7-12"><a href="#cb7-12" aria-hidden="true" tabindex="-1"></a>  {</span>
<span id="cb7-13"><a href="#cb7-13" aria-hidden="true" tabindex="-1"></a>    id<span class="op">:</span> <span class="st">"progress"</span><span class="op">,</span></span>
<span id="cb7-14"><a href="#cb7-14" aria-hidden="true" tabindex="-1"></a>    type<span class="op">:</span> <span class="st">"ProgressBar"</span><span class="op">,</span></span>
<span id="cb7-15"><a href="#cb7-15" aria-hidden="true" tabindex="-1"></a>    zIndex<span class="op">:</span> <span class="dv">100</span>  <span class="co">// Always on top</span></span>
<span id="cb7-16"><a href="#cb7-16" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb7-17"><a href="#cb7-17" aria-hidden="true" tabindex="-1"></a>]<span class="op">;</span></span></code></pre></div>
<p><strong>Rules:</strong></p>
<ul>
<li>Higher zIndex = appears in front</li>
<li>Lower zIndex = appears behind</li>
<li>Default zIndex is 0</li>
<li>Background component defaults to -1</li>
</ul>

<h2 id="component-timing">Component Timing</h2>
<p>Show/hide components at specific times using the <code>timing</code> property.</p>
<div class="sourceCode" id="cb8"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb8-1"><a href="#cb8-1" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb8-2"><a href="#cb8-2" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"intro-title"</span><span class="op">,</span></span>
<span id="cb8-3"><a href="#cb8-3" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb8-4"><a href="#cb8-4" aria-hidden="true" tabindex="-1"></a>  props<span class="op">:</span> { text<span class="op">:</span> <span class="st">"Welcome!"</span> }<span class="op">,</span></span>
<span id="cb8-5"><a href="#cb8-5" aria-hidden="true" tabindex="-1"></a>  timing<span class="op">:</span> {</span>
<span id="cb8-6"><a href="#cb8-6" aria-hidden="true" tabindex="-1"></a>    startSec<span class="op">:</span> <span class="fl">0.5</span><span class="op">,</span>   <span class="co">// Appear at 0.5s</span></span>
<span id="cb8-7"><a href="#cb8-7" aria-hidden="true" tabindex="-1"></a>    endSec<span class="op">:</span> <span class="fl">3.0</span>      <span class="co">// Disappear at 3.0s</span></span>
<span id="cb8-8"><a href="#cb8-8" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb8-9"><a href="#cb8-9" aria-hidden="true" tabindex="-1"></a>}</span></code></pre></div>
<p><strong>Timing Options:</strong></p>
<ul>
<li><code>startSec</code> (number) - Time in seconds when component appears</li>
<li><code>endSec</code> (number) - Time in seconds when component disappears</li>
<li>Omit <code>startSec</code> to show from beginning</li>
<li>Omit <code>endSec</code> to show until end</li>
</ul>

<h2 id="visibility-control">Visibility Control</h2>
<p>Hide components conditionally using the <code>visible</code> property.</p>
<div class="sourceCode" id="cb9"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb9-1"><a href="#cb9-1" aria-hidden="true" tabindex="-1"></a>{</span>
<span id="cb9-2"><a href="#cb9-2" aria-hidden="true" tabindex="-1"></a>  id<span class="op">:</span> <span class="st">"debug-info"</span><span class="op">,</span></span>
<span id="cb9-3"><a href="#cb9-3" aria-hidden="true" tabindex="-1"></a>  type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb9-4"><a href="#cb9-4" aria-hidden="true" tabindex="-1"></a>  props<span class="op">:</span> { text<span class="op">:</span> <span class="st">"Debug Mode"</span> }<span class="op">,</span></span>
<span id="cb9-5"><a href="#cb9-5" aria-hidden="true" tabindex="-1"></a>  visible<span class="op">:</span> <span class="kw">false</span>  <span class="co">// Hidden</span></span>
<span id="cb9-6"><a href="#cb9-6" aria-hidden="true" tabindex="-1"></a>}</span></code></pre></div>

<h2 id="complete-example">Complete Example</h2>
<p>Here's a full scene with multiple components demonstrating all features:</p>
<div class="sourceCode" id="cb10"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb10-1"><a href="#cb10-1" aria-hidden="true" tabindex="-1"></a><span class="im">import</span> { defineVideo } <span class="im">from</span> <span class="st">"@babulus/dsl"</span><span class="op">;</span></span>
<span id="cb10-2"><a href="#cb10-2" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb10-3"><a href="#cb10-3" aria-hidden="true" tabindex="-1"></a><span class="im">export</span> <span class="im">default</span> <span class="fu">defineVideo</span>((video) <span class="kw">=&gt;</span> {</span>
<span id="cb10-4"><a href="#cb10-4" aria-hidden="true" tabindex="-1"></a>  video<span class="op">.</span><span class="fu">composition</span>(<span class="st">"Product Demo"</span><span class="op">,</span> (composition) <span class="kw">=&gt;</span> {</span>
<span id="cb10-5"><a href="#cb10-5" aria-hidden="true" tabindex="-1"></a>    composition<span class="op">.</span><span class="fu">meta</span>({ fps<span class="op">:</span> <span class="dv">30</span><span class="op">,</span> width<span class="op">:</span> <span class="dv">1920</span><span class="op">,</span> height<span class="op">:</span> <span class="dv">1080</span> })<span class="op">;</span></span>
<span id="cb10-6"><a href="#cb10-6" aria-hidden="true" tabindex="-1"></a>    composition<span class="op">.</span><span class="fu">voiceover</span>({ provider<span class="op">:</span> <span class="st">"elevenlabs"</span> })<span class="op">;</span></span>
<span id="cb10-7"><a href="#cb10-7" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb10-8"><a href="#cb10-8" aria-hidden="true" tabindex="-1"></a>    composition<span class="op">.</span><span class="fu">scene</span>(<span class="st">"introduction"</span><span class="op">,</span> (scene) <span class="kw">=&gt;</span> {</span>
<span id="cb10-9"><a href="#cb10-9" aria-hidden="true" tabindex="-1"></a>      scene<span class="op">.</span><span class="fu">title</span>(<span class="st">"Welcome to Our Product"</span>)<span class="op">;</span></span>
<span id="cb10-10"><a href="#cb10-10" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb10-11"><a href="#cb10-11" aria-hidden="true" tabindex="-1"></a>      <span class="co">// Build up the scene with components</span></span>
<span id="cb10-12"><a href="#cb10-12" aria-hidden="true" tabindex="-1"></a>      scene<span class="op">.</span><span class="at">components</span> <span class="op">=</span> [</span>
<span id="cb10-13"><a href="#cb10-13" aria-hidden="true" tabindex="-1"></a>        <span class="co">// Background (always behind)</span></span>
<span id="cb10-14"><a href="#cb10-14" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb10-15"><a href="#cb10-15" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"background"</span><span class="op">,</span></span>
<span id="cb10-16"><a href="#cb10-16" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"Background"</span><span class="op">,</span></span>
<span id="cb10-17"><a href="#cb10-17" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb10-18"><a href="#cb10-18" aria-hidden="true" tabindex="-1"></a>            gradient<span class="op">:</span> <span class="st">"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"</span></span>
<span id="cb10-19"><a href="#cb10-19" aria-hidden="true" tabindex="-1"></a>          }</span>
<span id="cb10-20"><a href="#cb10-20" aria-hidden="true" tabindex="-1"></a>        }<span class="op">,</span></span>
<span id="cb10-21"><a href="#cb10-21" aria-hidden="true" tabindex="-1"></a>        </span>
<span id="cb10-22"><a href="#cb10-22" aria-hidden="true" tabindex="-1"></a>        <span class="co">// Scene title (appears after 0.5s)</span></span>
<span id="cb10-23"><a href="#cb10-23" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb10-24"><a href="#cb10-24" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"scene-title"</span><span class="op">,</span></span>
<span id="cb10-25"><a href="#cb10-25" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb10-26"><a href="#cb10-26" aria-hidden="true" tabindex="-1"></a>          bindings<span class="op">:</span> {</span>
<span id="cb10-27"><a href="#cb10-27" aria-hidden="true" tabindex="-1"></a>            text<span class="op">:</span> <span class="st">"scene.title"</span></span>
<span id="cb10-28"><a href="#cb10-28" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb10-29"><a href="#cb10-29" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb10-30"><a href="#cb10-30" aria-hidden="true" tabindex="-1"></a>            fontSize<span class="op">:</span> <span class="dv">64</span><span class="op">,</span></span>
<span id="cb10-31"><a href="#cb10-31" aria-hidden="true" tabindex="-1"></a>            fontWeight<span class="op">:</span> <span class="dv">800</span><span class="op">,</span></span>
<span id="cb10-32"><a href="#cb10-32" aria-hidden="true" tabindex="-1"></a>            color<span class="op">:</span> <span class="st">"#ffffff"</span><span class="op">,</span></span>
<span id="cb10-33"><a href="#cb10-33" aria-hidden="true" tabindex="-1"></a>            textAlign<span class="op">:</span> <span class="st">"center"</span><span class="op">,</span></span>
<span id="cb10-34"><a href="#cb10-34" aria-hidden="true" tabindex="-1"></a>            position<span class="op">:</span> { x<span class="op">:</span> <span class="dv">960</span><span class="op">,</span> y<span class="op">:</span> <span class="dv">300</span> }</span>
<span id="cb10-35"><a href="#cb10-35" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb10-36"><a href="#cb10-36" aria-hidden="true" tabindex="-1"></a>          timing<span class="op">:</span> {</span>
<span id="cb10-37"><a href="#cb10-37" aria-hidden="true" tabindex="-1"></a>            startSec<span class="op">:</span> <span class="fl">0.5</span></span>
<span id="cb10-38"><a href="#cb10-38" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb10-39"><a href="#cb10-39" aria-hidden="true" tabindex="-1"></a>          zIndex<span class="op">:</span> <span class="dv">10</span></span>
<span id="cb10-40"><a href="#cb10-40" aria-hidden="true" tabindex="-1"></a>        }<span class="op">,</span></span>
<span id="cb10-41"><a href="#cb10-41" aria-hidden="true" tabindex="-1"></a>        </span>
<span id="cb10-42"><a href="#cb10-42" aria-hidden="true" tabindex="-1"></a>        <span class="co">// Subtitle showing active cue text</span></span>
<span id="cb10-43"><a href="#cb10-43" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb10-44"><a href="#cb10-44" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"subtitle"</span><span class="op">,</span></span>
<span id="cb10-45"><a href="#cb10-45" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"Subtitle"</span><span class="op">,</span></span>
<span id="cb10-46"><a href="#cb10-46" aria-hidden="true" tabindex="-1"></a>          bindings<span class="op">:</span> {</span>
<span id="cb10-47"><a href="#cb10-47" aria-hidden="true" tabindex="-1"></a>            text<span class="op">:</span> <span class="st">"cue.text"</span></span>
<span id="cb10-48"><a href="#cb10-48" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb10-49"><a href="#cb10-49" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb10-50"><a href="#cb10-50" aria-hidden="true" tabindex="-1"></a>            fontSize<span class="op">:</span> <span class="dv">28</span><span class="op">,</span></span>
<span id="cb10-51"><a href="#cb10-51" aria-hidden="true" tabindex="-1"></a>            color<span class="op">:</span> <span class="st">"#e0e7ff"</span><span class="op">,</span></span>
<span id="cb10-52"><a href="#cb10-52" aria-hidden="true" tabindex="-1"></a>            textAlign<span class="op">:</span> <span class="st">"center"</span><span class="op">,</span></span>
<span id="cb10-53"><a href="#cb10-53" aria-hidden="true" tabindex="-1"></a>            position<span class="op">:</span> { x<span class="op">:</span> <span class="dv">960</span><span class="op">,</span> y<span class="op">:</span> <span class="dv">900</span> }</span>
<span id="cb10-54"><a href="#cb10-54" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb10-55"><a href="#cb10-55" aria-hidden="true" tabindex="-1"></a>          zIndex<span class="op">:</span> <span class="dv">20</span></span>
<span id="cb10-56"><a href="#cb10-56" aria-hidden="true" tabindex="-1"></a>        }<span class="op">,</span></span>
<span id="cb10-57"><a href="#cb10-57" aria-hidden="true" tabindex="-1"></a>        </span>
<span id="cb10-58"><a href="#cb10-58" aria-hidden="true" tabindex="-1"></a>        <span class="co">// Progress bar (always on top)</span></span>
<span id="cb10-59"><a href="#cb10-59" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb10-60"><a href="#cb10-60" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"progress"</span><span class="op">,</span></span>
<span id="cb10-61"><a href="#cb10-61" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"ProgressBar"</span><span class="op">,</span></span>
<span id="cb10-62"><a href="#cb10-62" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb10-63"><a href="#cb10-63" aria-hidden="true" tabindex="-1"></a>            position<span class="op">:</span> <span class="st">"bottom"</span><span class="op">,</span></span>
<span id="cb10-64"><a href="#cb10-64" aria-hidden="true" tabindex="-1"></a>            height<span class="op">:</span> <span class="dv">6</span></span>
<span id="cb10-65"><a href="#cb10-65" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb10-66"><a href="#cb10-66" aria-hidden="true" tabindex="-1"></a>          zIndex<span class="op">:</span> <span class="dv">100</span></span>
<span id="cb10-67"><a href="#cb10-67" aria-hidden="true" tabindex="-1"></a>        }<span class="op">,</span></span>
<span id="cb10-68"><a href="#cb10-68" aria-hidden="true" tabindex="-1"></a>        </span>
<span id="cb10-69"><a href="#cb10-69" aria-hidden="true" tabindex="-1"></a>        <span class="co">// Watermark (bottom-left corner)</span></span>
<span id="cb10-70"><a href="#cb10-70" aria-hidden="true" tabindex="-1"></a>        {</span>
<span id="cb10-71"><a href="#cb10-71" aria-hidden="true" tabindex="-1"></a>          id<span class="op">:</span> <span class="st">"watermark"</span><span class="op">,</span></span>
<span id="cb10-72"><a href="#cb10-72" aria-hidden="true" tabindex="-1"></a>          type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb10-73"><a href="#cb10-73" aria-hidden="true" tabindex="-1"></a>          props<span class="op">:</span> {</span>
<span id="cb10-74"><a href="#cb10-74" aria-hidden="true" tabindex="-1"></a>            text<span class="op">:</span> <span class="st">"© 2026 Acme Corp"</span><span class="op">,</span></span>
<span id="cb10-75"><a href="#cb10-75" aria-hidden="true" tabindex="-1"></a>            fontSize<span class="op">:</span> <span class="dv">16</span><span class="op">,</span></span>
<span id="cb10-76"><a href="#cb10-76" aria-hidden="true" tabindex="-1"></a>            fontWeight<span class="op">:</span> <span class="dv">400</span><span class="op">,</span></span>
<span id="cb10-77"><a href="#cb10-77" aria-hidden="true" tabindex="-1"></a>            color<span class="op">:</span> <span class="st">"rgba(255,255,255,0.4)"</span><span class="op">,</span></span>
<span id="cb10-78"><a href="#cb10-78" aria-hidden="true" tabindex="-1"></a>            position<span class="op">:</span> { x<span class="op">:</span> <span class="dv">30</span><span class="op">,</span> y<span class="op">:</span> <span class="dv">1020</span> }</span>
<span id="cb10-79"><a href="#cb10-79" aria-hidden="true" tabindex="-1"></a>          }<span class="op">,</span></span>
<span id="cb10-80"><a href="#cb10-80" aria-hidden="true" tabindex="-1"></a>          zIndex<span class="op">:</span> <span class="dv">50</span></span>
<span id="cb10-81"><a href="#cb10-81" aria-hidden="true" tabindex="-1"></a>        }</span>
<span id="cb10-82"><a href="#cb10-82" aria-hidden="true" tabindex="-1"></a>      ]<span class="op">;</span></span>
<span id="cb10-83"><a href="#cb10-83" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb10-84"><a href="#cb10-84" aria-hidden="true" tabindex="-1"></a>      <span class="co">// Add voiceover cues</span></span>
<span id="cb10-85"><a href="#cb10-85" aria-hidden="true" tabindex="-1"></a>      scene<span class="op">.</span><span class="fu">cue</span>(<span class="st">"intro-1"</span><span class="op">,</span> (cue) <span class="kw">=&gt;</span> {</span>
<span id="cb10-86"><a href="#cb10-86" aria-hidden="true" tabindex="-1"></a>        cue<span class="op">.</span><span class="fu">voice</span>((v) <span class="kw">=&gt;</span> {</span>
<span id="cb10-87"><a href="#cb10-87" aria-hidden="true" tabindex="-1"></a>          v<span class="op">.</span><span class="fu">say</span>(<span class="st">"Welcome to our revolutionary product."</span>)<span class="op">;</span></span>
<span id="cb10-88"><a href="#cb10-88" aria-hidden="true" tabindex="-1"></a>        })<span class="op">;</span></span>
<span id="cb10-89"><a href="#cb10-89" aria-hidden="true" tabindex="-1"></a>      })<span class="op">;</span></span>
<span id="cb10-90"><a href="#cb10-90" aria-hidden="true" tabindex="-1"></a></span>
<span id="cb10-91"><a href="#cb10-91" aria-hidden="true" tabindex="-1"></a>      scene<span class="op">.</span><span class="fu">cue</span>(<span class="st">"intro-2"</span><span class="op">,</span> (cue) <span class="kw">=&gt;</span> {</span>
<span id="cb10-92"><a href="#cb10-92" aria-hidden="true" tabindex="-1"></a>        cue<span class="op">.</span><span class="fu">voice</span>((v) <span class="kw">=&gt;</span> {</span>
<span id="cb10-93"><a href="#cb10-93" aria-hidden="true" tabindex="-1"></a>          v<span class="op">.</span><span class="fu">say</span>(<span class="st">"Let me show you what makes it special."</span>)<span class="op">;</span></span>
<span id="cb10-94"><a href="#cb10-94" aria-hidden="true" tabindex="-1"></a>        })<span class="op">;</span></span>
<span id="cb10-95"><a href="#cb10-95" aria-hidden="true" tabindex="-1"></a>      })<span class="op">;</span></span>
<span id="cb10-96"><a href="#cb10-96" aria-hidden="true" tabindex="-1"></a>    })<span class="op">;</span></span>
<span id="cb10-97"><a href="#cb10-97" aria-hidden="true" tabindex="-1"></a>  })<span class="op">;</span></span>
<span id="cb10-98"><a href="#cb10-98" aria-hidden="true" tabindex="-1"></a>})<span class="op">;</span></span></code></pre></div>

<h2 id="best-practices">Best Practices</h2>
<h3 id="component-organization">Component Organization</h3>
<ul>
<li><strong>Order by zIndex</strong>: List components from back to front for clarity</li>
<li><strong>Unique IDs</strong>: Use descriptive, unique IDs for each component</li>
<li><strong>Consistent Naming</strong>: Use kebab-case for component IDs</li>
</ul>

<h3 id="data-binding-usage">Data Binding Usage</h3>
<ul>
<li><strong>Scene Title</strong>: Use <code>scene.title</code> binding for scene titles</li>
<li><strong>Cue Text</strong>: Use <code>cue.text</code> for subtitles that follow voice</li>
<li><strong>Static Content</strong>: Use explicit <code>text</code> prop for watermarks, logos</li>
</ul>

<h3 id="performance-tips">Performance Tips</h3>
<ul>
<li><strong>Minimize Components</strong>: Only add components you need</li>
<li><strong>Use Timing</strong>: Hide components when not needed using timing</li>
<li><strong>Reuse Types</strong>: Use same component type with different props</li>
</ul>

<h2 id="troubleshooting">Troubleshooting</h2>
<h3 id="component-not-appearing">Component Not Appearing</h3>
<ul>
<li>Check <code>visible</code> property is not set to <code>false</code></li>
<li>Verify <code>timing.startSec</code> and <code>timing.endSec</code> are correct</li>
<li>Check component <code>type</code> matches registered component name</li>
<li>Ensure <code>components</code> array is assigned to scene</li>
</ul>

<h3 id="data-binding-not-working">Data Binding Not Working</h3>
<ul>
<li>Verify binding syntax: <code>"scene.title"</code>, <code>"cue.text"</code>, etc.</li>
<li>Check that bound data exists (scene has title, cue has text)</li>
<li>Ensure <code>bindings</code> object is used, not <code>props</code></li>
</ul>

<h3 id="wrong-layering-order">Wrong Layering Order</h3>
<ul>
<li>Check <code>zIndex</code> values (higher = front)</li>
<li>Background component should have negative zIndex</li>
<li>Progress bar should have highest zIndex</li>
</ul>

<h3 id="scene-is-blank">Scene is Blank</h3>
<ul>
<li><strong>This is expected!</strong> Scenes are blank by default</li>
<li>Add components to <code>scene.components</code> array</li>
<li>Start with a Background component to see something on screen</li>
</ul>

<h2 id="migration-from-markup">Migration from Markup</h2>
<p>If you have older videos using <code>.markup()</code>, here's how to migrate to components:</p>

<h3 id="before-markup-based">Before (Markup-based)</h3>
<div class="sourceCode" id="cb11"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb11-1"><a href="#cb11-1" aria-hidden="true" tabindex="-1"></a>scene<span class="op">.</span><span class="fu">markup</span>({</span>
<span id="cb11-2"><a href="#cb11-2" aria-hidden="true" tabindex="-1"></a>  visualStyle<span class="op">:</span> <span class="st">"modern"</span><span class="op">,</span></span>
<span id="cb11-3"><a href="#cb11-3" aria-hidden="true" tabindex="-1"></a>  primaryGradient<span class="op">:</span> <span class="st">"linear-gradient(135deg, #667eea, #764ba2)"</span></span>
<span id="cb11-4"><a href="#cb11-4" aria-hidden="true" tabindex="-1"></a>})<span class="op">;</span></span></code></pre></div>

<h3 id="after-component-based">After (Component-based)</h3>
<div class="sourceCode" id="cb12"><pre class="sourceCode typescript"><code class="sourceCode typescript"><span id="cb12-1"><a href="#cb12-1" aria-hidden="true" tabindex="-1"></a>scene<span class="op">.</span><span class="at">components</span> <span class="op">=</span> [</span>
<span id="cb12-2"><a href="#cb12-2" aria-hidden="true" tabindex="-1"></a>  {</span>
<span id="cb12-3"><a href="#cb12-3" aria-hidden="true" tabindex="-1"></a>    id<span class="op">:</span> <span class="st">"bg"</span><span class="op">,</span></span>
<span id="cb12-4"><a href="#cb12-4" aria-hidden="true" tabindex="-1"></a>    type<span class="op">:</span> <span class="st">"Background"</span><span class="op">,</span></span>
<span id="cb12-5"><a href="#cb12-5" aria-hidden="true" tabindex="-1"></a>    props<span class="op">:</span> {</span>
<span id="cb12-6"><a href="#cb12-6" aria-hidden="true" tabindex="-1"></a>      gradient<span class="op">:</span> <span class="st">"linear-gradient(135deg, #667eea, #764ba2)"</span></span>
<span id="cb12-7"><a href="#cb12-7" aria-hidden="true" tabindex="-1"></a>    }</span>
<span id="cb12-8"><a href="#cb12-8" aria-hidden="true" tabindex="-1"></a>  }<span class="op">,</span></span>
<span id="cb12-9"><a href="#cb12-9" aria-hidden="true" tabindex="-1"></a>  {</span>
<span id="cb12-10"><a href="#cb12-10" aria-hidden="true" tabindex="-1"></a>    id<span class="op">:</span> <span class="st">"title"</span><span class="op">,</span></span>
<span id="cb12-11"><a href="#cb12-11" aria-hidden="true" tabindex="-1"></a>    type<span class="op">:</span> <span class="st">"Title"</span><span class="op">,</span></span>
<span id="cb12-12"><a href="#cb12-12" aria-hidden="true" tabindex="-1"></a>    bindings<span class="op">:</span> { text<span class="op">:</span> <span class="st">"scene.title"</span> }</span>
<span id="cb12-13"><a href="#cb12-13" aria-hidden="true" tabindex="-1"></a>  }<span class="op">,</span></span>
<span id="cb12-14"><a href="#cb12-14" aria-hidden="true" tabindex="-1"></a>  {</span>
<span id="cb12-15"><a href="#cb12-15" aria-hidden="true" tabindex="-1"></a>    id<span class="op">:</span> <span class="st">"subtitle"</span><span class="op">,</span></span>
<span id="cb12-16"><a href="#cb12-16" aria-hidden="true" tabindex="-1"></a>    type<span class="op">:</span> <span class="st">"Subtitle"</span><span class="op">,</span></span>
<span id="cb12-17"><a href="#cb12-17" aria-hidden="true" tabindex="-1"></a>    bindings<span class="op">:</span> { text<span class="op">:</span> <span class="st">"cue.text"</span> }</span>
<span id="cb12-18"><a href="#cb12-18" aria-hidden="true" tabindex="-1"></a>  }<span class="op">,</span></span>
<span id="cb12-19"><a href="#cb12-19" aria-hidden="true" tabindex="-1"></a>  {</span>
<span id="cb12-20"><a href="#cb12-20" aria-hidden="true" tabindex="-1"></a>    id<span class="op">:</span> <span class="st">"progress"</span><span class="op">,</span></span>
<span id="cb12-21"><a href="#cb12-21" aria-hidden="true" tabindex="-1"></a>    type<span class="op">:</span> <span class="st">"ProgressBar"</span></span>
<span id="cb12-22"><a href="#cb12-22" aria-hidden="true" tabindex="-1"></a>  }</span>
<span id="cb12-23"><a href="#cb12-23" aria-hidden="true" tabindex="-1"></a>]<span class="op">;</span></span></code></pre></div>

<h2 id="next-steps">Next Steps</h2>
<ul>
<li><strong>Explore Built-in Components</strong>: Try different props and styling</li>
<li><strong>Create Custom Layouts</strong>: Experiment with positioning and layering</li>
<li><strong>Use Data Binding</strong>: Make components dynamic with scene/cue data</li>
<li><strong>Build Templates</strong>: Create reusable component sets for consistent branding</li>
</ul>

<h2 id="support">Support</h2>
<p>For questions or issues:</p>
<ul>
<li>Check the troubleshooting section above</li>
<li>Review example videos in the test-projects folder</li>
<li>Consult the DSL reference documentation</li>
</ul>
`
} as const;
