export const babulusLanguageDesignDoc = {
  slug: ["babulus-language-design"],
  title: "Babulus Language Design - Live VOM (Alpha)",
  description: "**Status:** Alpha. This document captures the live VOM model and the current XML language.",
  category: "Developer Reference",
  html: `<h1 id="babulus-language-design--live-vom-alpha">Babulus Language Design - Live VOM (Alpha)</h1>
<p><strong>Status:</strong> Alpha. This document captures the live VOM model and the current XML language.</p>
<hr />
<h2 id="purpose">Purpose</h2>
<p>Babulus is an XML DSL for video composition. The XML is the canonical source of truth (the VOM), and rendering is a deterministic projection of that VOM over time.</p>
<hr />
<h2 id="canonical-source">Canonical Source</h2>
<ul>
<li>Canonical file type: <code>.babulus.xml</code></li>
<li>Stored in project folders: <code>org/{orgId}/projects/{projectId}/*.babulus.xml</code></li>
<li>Also stored as raw source text in <code>StoryboardVersion</code> records for version history.</li>
<li>Generated artifacts (script/timeline/audio) are derived outputs and not edited directly.</li>
</ul>
<h2 id="project-organization">Project Organization</h2>
<p>Projects are folders (S3 for web, local filesystem for desktop) containing:</p>
<ul>
<li><code>video-001.babulus.xml</code> - Video composition files (shown in UI)</li>
<li><code>_helpers.babulus.xml</code> - Utility code (hidden from video list, can be imported)</li>
<li><code>assets/logo.png</code> - User-uploaded assets (images, audio, video)</li>
</ul>
<hr />
<h2 id="timing-model">Timing Model (Time as Layout)</h2>
<p>Time is treated as a layout dimension. Elements can have temporal size, and containers grow to fit their children, similar to how a browser reflows DOM layout.</p>
<h3 id="durations">Durations</h3>
<ul>
<li><strong>Explicit:</strong> Set <code>duration="4s"</code> on a scene, layer, or component.</li>
<li><strong>Derived:</strong> If a container has sequential children, total duration is the sum of children.</li>
<li><strong>Open-ended:</strong> In live mode, scenes can omit <code>duration</code> until cut.</li>
</ul>
<h3 id="sequence-stack">Temporal Containers</h3>
<p>Babulus adds temporal containers to compose timing without manual math:</p>
<div class="sourceCode" id="cb-sequence"><pre class="sourceCode xml"><code class="sourceCode xml">
<span class="fu">&lt;sequence&gt;</span>
  <span class="fu">&lt;title-slide</span> duration=<span class="st">"2s"</span> <span class="fu">/&gt;</span>
  <span class="fu">&lt;bullet-list-screen</span> duration=<span class="st">"3s"</span> <span class="fu">/&gt;</span>
<span class="fu">&lt;/sequence&gt;</span>
</code></pre></div>
<p><code>&lt;sequence&gt;</code> plays children back-to-back. <code>&lt;stack&gt;</code> overlays children in parallel with a shared start.</p>
<hr />
<h2 id="live-mode-semantics">Live Mode Semantics</h2>
<p>Live mode treats the timeline as continuous. The player never stops, and scenes can stay open-ended until a user or agent cuts to the next scene.</p>
<ul>
<li><strong>Clock:</strong> <code>clockMode="live"</code> advances time indefinitely.</li>
<li><strong>Open-ended scenes:</strong> A scene can omit duration. It remains active until a new scene is appended.</li>
<li><strong>Cutting:</strong> When a new scene is appended, the current scene's duration is sealed to the cut time.</li>
<li><strong>Recording:</strong> The XML itself is the recording; it can be exported as <code>.babulus.xml</code>.</li>
</ul>
<div class="sourceCode" id="cb-live"><pre class="sourceCode xml"><code class="sourceCode xml">
<span class="fu">&lt;video</span> id=<span class="st">"live"</span> title=<span class="st">"Live Session"</span> recordedAt=<span class="st">"2026-02-05T06:36:19.852Z"</span> fps=<span class="st">"30"</span> width=<span class="st">"1920"</span> height=<span class="st">"1080"</span><span class="fu">&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"scene-001"</span> start=<span class="st">"0s"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;layer&gt;</span><span class="fu">&lt;title-slide</span> <span class="fu">/&gt;</span><span class="fu">&lt;/layer&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>
  <span class="fu">&lt;scene</span> id=<span class="st">"scene-002"</span> start=<span class="st">"2.6s"</span> duration=<span class="st">"1.8s"</span><span class="fu">&gt;</span>
    <span class="fu">&lt;layer&gt;</span><span class="fu">&lt;bullet-list-screen</span> <span class="fu">/&gt;</span><span class="fu">&lt;/layer&gt;</span>
  <span class="fu">&lt;/scene&gt;</span>
<span class="fu">&lt;/video&gt;</span>
</code></pre></div>
<hr />
<h2 id="timing-strategies">Timing Strategies</h2>
<p>Preview and generation can derive timing in different ways:</p>
<ul>
<li><strong>auto</strong>: derive duration from visual timing (sequence/stack) and fallback cues.</li>
<li><strong>live</strong>: allow open-ended scenes, suitable for live playback.</li>
</ul>
<hr />
<h2 id="scenes-and-cues">Scenes and Cues</h2>
<ul>
<li>A video is a sequence of scenes.</li>
<li>Cues are optional in live mode, but still used for narration and audio pipelines.</li>
<li>When audio is generated, cue timing can determine scene duration.</li>
</ul>
<hr />
<h2 id="determinism--rendering">Determinism &amp; Rendering</h2>
<ul>
<li>Preview and render outputs are deterministic given the same XML, assets, and toolchain.</li>
<li>Live mode is deterministic once recorded: the output XML is the recording.</li>
</ul>
<hr />
<h2 id="current-usage-in-studio">Current Usage in Studio</h2>
<ul>
<li>Editor panel holds XML source text (Monaco).</li>
<li>Preview can render directly from XML (VOM) without generated artifacts.</li>
<li>Generation still produces <code>script.json</code>, <code>timeline.json</code>, and audio for export.</li>
</ul>
<hr />
<h2 id="known-gaps-alpha">Known Gaps (Alpha)</h2>
<ul>
<li>No sandboxed resolver for <code>.babulus.xml</code> in the web app.</li>
<li>No AST validation of DSL in the UI (planned).</li>
<li>Import resolution for <code>_helpers.babulus.xml</code> style includes not implemented.</li>
<li>Asset path resolution from <code>./assets/*</code> references not built.</li>
</ul>
<hr />
<h2 id="execution-model">Execution Model</h2>
<p>Babulus code runs in two contexts with the same source:</p>
<p><strong>Client-side (Preview)</strong></p>
<ul>
<li>Fetch <code>.babulus.xml</code> from S3 (or local disk)</li>
<li>Parse and evaluate to show structure/timing</li>
<li>Use generated artifacts when available, or placeholders in live mode</li>
</ul>
<p><strong>Server-side (Generation/Render)</strong></p>
<ul>
<li>Fetch same <code>.babulus.xml</code> from S3 (or local disk)</li>
<li>Generate audio (TTS, music, effects) as needed</li>
<li>Produce final render artifacts</li>
</ul>
<hr />
<h2 id="next-steps-beta-oriented">Next Steps (Beta-oriented)</h2>
<ul>
<li>Implement temporal layout resolution across all containers (scene, layer, sequence, stack).</li>
<li>Add static validation with helpful errors (file/line/column).</li>
<li>Build import resolution for <code>_*.babulus.xml</code> utility modules.</li>
<li>Implement asset path resolution for <code>./assets/*</code> references.</li>
</ul>`,
} as const;
