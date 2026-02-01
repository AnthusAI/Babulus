export const technicalDoc = {
  slug: ["technical"],
  title: "Babulus — Technical Overview",
  description:
    "System architecture: control plane, execution plane, and how they connect",
  category: "Developer Reference",
  html: `
<h1 id="babulus-technical-overview">Babulus — Technical Overview</h1>
<p><strong>Status:</strong> Alpha</p>

<hr />

<h2 id="top-level-architecture">Top-level architecture</h2>
<p>Babulus is intentionally split into two halves:</p>
<ul>
  <li><strong>Control plane (SaaS)</strong>: org/project/video state, versioning, approvals, runs, and UI.</li>
  <li><strong>Execution plane (workers)</strong>: generation and rendering jobs that produce artifacts.</li>
</ul>
<p>This separation keeps the UI safe/responsive and makes execution portable (cloud or local) without redesigning the product.</p>

<hr />

<h2 id="source-of-truth-video-as-code">Source of truth: “video as code”</h2>
<p>Babulus uses a TypeScript DSL (<code>.babulus.ts</code>) as the authoring surface. This is deliberate:</p>
<ul>
  <li><strong>Composable</strong>: utilities, imports, shared helpers.</li>
  <li><strong>Reviewable</strong>: diffs are real code diffs.</li>
  <li><strong>Agent-friendly</strong>: agents propose patches, not opaque edits.</li>
  <li><strong>Deterministic</strong>: artifacts are generated from source.</li>
</ul>
<p>See <a href="/docs/babulus-language-design">Babulus language design</a> for DSL details.</p>

<hr />

<h2 id="artifacts-and-determinism">Artifacts and determinism</h2>
<p>The system produces multiple artifacts because each has a job:</p>
<ul>
  <li><strong>Script JSON</strong>: scene/cue structure and timing (preview + render input).</li>
  <li><strong>Timeline JSON</strong>: audio tracks/mix metadata (render input).</li>
  <li><strong>Audio assets</strong>: voice segments, SFX, music beds, concatenations.</li>
  <li><strong>Frames</strong> and <strong>MP4</strong>: deterministic rendering outputs.</li>
</ul>
<p>Determinism matters because it makes approvals meaningful: “what you approved” is reproducible.</p>

<hr />

<h2 id="project-storage-unified-filesystem">Project storage: unified filesystem abstraction</h2>
<p>A project is modeled as a folder of files:</p>
<ul>
  <li><code>*.babulus.ts</code> (non-underscore): visible videos</li>
  <li><code>_*.babulus.ts</code>: utility files (hidden by default, importable)</li>
  <li><code>assets/</code>: uploaded media</li>
</ul>

<h3 id="cloud-storage-paths">Cloud storage paths</h3>
<pre><code>org/{orgId}/projects/{projectId}/
  ├── intro.babulus.ts
  ├── _helpers.babulus.ts
  └── assets/
      ├── logo.png
      └── music.wav</code></pre>

<p>Files are tracked with a <strong>ProjectFile</strong> model for metadata and security. See:</p>
<ul>
  <li><a href="/docs/project-storage/architecture">Project storage architecture</a></li>
  <li><a href="/docs/project-storage/quickstart">Project storage quickstart</a></li>
</ul>

<hr />

<h2 id="versioning-source-text-vs-files">Versioning: source text vs files</h2>
<p>Alpha straddles two representations on purpose:</p>
<ul>
  <li><strong>StoryboardVersion</strong> stores versioned source text (history + review).</li>
  <li><strong>ProjectFile</strong> stores the same source as a file (portability + workflow).</li>
</ul>
<p>This makes it possible to ship today while moving toward a cleaner “file-first” world where versions are derived from diffs and explicit checkpoints.</p>

<hr />

<h2 id="security-model">Security model (multi-tenant)</h2>
<p>Multi-tenancy is enforced with defense in depth:</p>
<ul>
  <li><strong>Application layer</strong>: server-side membership checks before file operations.</li>
  <li><strong>Delivery layer</strong>: CloudFront for stable delivery without opening S3 publicly.</li>
  <li><strong>Edge enforcement</strong>: JWT validation and org membership checks for CDN requests.</li>
</ul>
<p>See <a href="/docs/security-verification">Security verification</a> for the current testing plan.</p>

<hr />

<h2 id="execution-plane-jobs">Execution plane: jobs and workers</h2>
<p>Work is dispatched as jobs that run generation/rendering and upload artifacts back to storage.</p>

<h3 id="job-contract">Portable job contract</h3>
<p>The job shape is designed to be queue-friendly and portable across machines/providers. See <a href="/docs/worker-job-spec">Worker job spec</a>.</p>

<h3 id="generation-vs-rendering">Generation vs rendering</h3>
<ul>
  <li><strong>Generation</strong>: produces audio/timing artifacts (script/timeline/audio) that make previews meaningful.</li>
  <li><strong>Rendering</strong>: turns those artifacts into frames and MP4 outputs.</li>
</ul>

<h3 id="preview-model">Preview model (alpha)</h3>
<ul>
  <li>If artifacts exist, preview uses them.</li>
  <li>If artifacts don’t exist, preview may fall back to placeholder content.</li>
</ul>

<hr />

<h2 id="providers-caching-and-environments">Providers, caching, and environments</h2>
<p>External providers (TTS/music/SFX) are expensive, so Babulus treats cost control as a workflow feature:</p>
<ul>
  <li>environment-specific settings and outputs,</li>
  <li>segment reuse when unchanged,</li>
  <li>fast iteration in development, higher fidelity in production.</li>
</ul>
<p>See <a href="/docs/environments">Environments</a> and the provider guides under <a href="/docs">Docs</a>.</p>

<hr />

<h2 id="related-docs">Related docs</h2>
<ul>
  <li><a href="/docs/introduction">Introduction</a></li>
  <li><a href="/docs/roadmap">Roadmap</a></li>
</ul>
`.trim(),
} as const;

