export const roadmapDoc = {
  slug: ["roadmap"],
  title: "Babulus — Roadmap (Alpha → Beta)",
  description:
    "Current status, priorities, and what's coming next",
  category: "Roadmap",
  html: `
<h1 id="babulus-roadmap-alpha-to-beta">Babulus — Roadmap (Alpha → Beta)</h1>
<p><strong>Audience:</strong> mixed (technical + non-technical)</p>
<p><strong>Status:</strong> Alpha</p>

<hr />

<h2 id="what-alpha-is">What Alpha is</h2>
<p>Alpha is about proving the end-to-end loop is real and reliable:</p>
<ul>
  <li>edit → generate → preview → render → publish</li>
  <li>deterministic outputs (approvals mean something)</li>
  <li>cost control (iteration doesn’t burn quotas)</li>
  <li>security boundaries hold (multi-tenant isolation)</li>
</ul>

<hr />

<h2 id="what-we-consider-done">What we consider “done” for Alpha</h2>
<ul>
  <li>A user can create a project, edit a video, generate assets, preview reliably, render a final MP4, and publish/share it.</li>
  <li>The system remains portable: projects are files/folders, artifacts are inspectable.</li>
  <li>It works repeatedly, not just once.</li>
</ul>

<hr />

<h2 id="current-priorities">Current priorities (Alpha gates)</h2>

<h3 id="gate-1-generation-reliability">Gate 1 — Generation reliability</h3>
<p>Generation is the heart of making preview meaningful. The system needs to reliably produce:</p>
<ul>
  <li>voiceover audio segments</li>
  <li>script/timeline artifacts</li>
  <li>consistent storage of outputs for preview</li>
</ul>

<h3 id="gate-2-render-pipeline">Gate 2 — Render pipeline</h3>
<p>To be publish-ready, Babulus needs a reliable path to MP4 outputs (frames + encoding) that can run as a worker job.</p>

<h3 id="gate-3-publishing-verification">Gate 3 — Publishing verification</h3>
<p>Publishing should produce stable shareable outputs (URLs + access policy). The focus is verification and polish, not adding new complexity.</p>

<hr />

<h2 id="beta-shape">Beta shape (after the loop is reliable)</h2>
<p>Once the alpha loop is stable, beta is about speed and ergonomics—without breaking the “DNA”:</p>
<ul>
  <li><strong>Live preview from source</strong>: reduce the “generate to see changes” loop time.</li>
  <li><strong>Import resolution</strong>: make <code>_*.babulus.ts</code> utilities first-class in projects.</li>
  <li><strong>Better approval workflows</strong>: operationalize “autonomy with gates”.</li>
  <li><strong>Local folders + sync</strong>: enable a desktop/local workflow that mirrors the cloud folder model.</li>
  <li><strong>Publishing integrations</strong>: distribute and track outcomes, then feed them back into topic selection and iteration.</li>
</ul>

<hr />

<h2 id="longer-term">Longer-term direction</h2>
<ul>
  <li>A production-grade agent loop that runs continuously with minimal supervision.</li>
  <li>A portable project format that can move between cloud, local, and teams.</li>
  <li>A publishing engine that turns outcomes into better future drafts.</li>
</ul>

<hr />

<h2 id="related-docs">Related docs</h2>
<ul>
  <li><a href="/docs/introduction">Introduction</a></li>
  <li><a href="/docs/technical">Technical overview</a></li>
</ul>
`.trim(),
} as const;

