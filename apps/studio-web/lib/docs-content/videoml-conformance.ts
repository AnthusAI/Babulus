import type { DocsEntry } from "@/lib/docs-registry";

export const videomlConformanceDoc: DocsEntry = {
  slug: ["videoml-conformance"],
  title: "VideoML Conformance",
  description: "Versioning rules and conformance checklist for the VideoML standard",
  category: "Standards",
  html: `
<h1 id="videoml-conformance">VideoML Conformance</h1>
<p><strong>Status:</strong> Draft. This defines how to claim conformance with the VideoML standard.</p>

<hr />

<h2 id="versioning">Versioning</h2>
<ul>
  <li>Standard versions are semantic: <code>major.minor.patch</code>.</li>
  <li>Breaking changes increment <strong>major</strong>.</li>
  <li>New optional features increment <strong>minor</strong>.</li>
  <li>Bugfixes and clarifications increment <strong>patch</strong>.</li>
</ul>

<h2 id="conformance-levels">Conformance Levels</h2>
<ul>
  <li><strong>Core</strong>: Must support XML parsing, root, scenes, cues, temporal layout, and timeline API.</li>
  <li><strong>Interactive</strong>: Adds inline JS (<code>&lt;script&gt;</code>, <code>on:*</code>).</li>
  <li><strong>Live</strong>: Adds unbounded timeline, open-ended scenes, cut-to-next semantics.</li>
</ul>

<h2 id="required-elements">Required Elements</h2>
<ul>
  <li><code>&lt;vml&gt;</code> root</li>
  <li><code>&lt;scene&gt;</code>, <code>&lt;layer&gt;</code></li>
  <li><code>&lt;sequence&gt;</code>, <code>&lt;stack&gt;</code></li>
</ul>

<h2 id="required-attributes">Required Attributes</h2>
<ul>
  <li><code>id</code> on <code>&lt;vml&gt;</code> and <code>&lt;scene&gt;</code></li>
  <li><code>fps</code>, <code>width</code>, <code>height</code> on <code>&lt;vml&gt;</code></li>
</ul>

<h2 id="timeline-api">Timeline API</h2>
<ul>
  <li><code>window.timeline.frame</code></li>
  <li><code>window.timeline.time</code></li>
  <li><code>window.timeline.fps</code></li>
  <li><code>window.timelines</code></li>
</ul>

<h2 id="events">Lifecycle Events</h2>
<ul>
  <li><code>timeline:tick</code></li>
  <li><code>scene:start</code>, <code>scene:end</code></li>
  <li><code>cue:start</code>, <code>cue:end</code></li>
</ul>

<h2 id="recording">Recording Rules</h2>
<ul>
  <li>Recording is the XML state (effects), not event triggers.</li>
  <li>Open-ended scenes must be finalized before export.</li>
  <li>Optional <code>&lt;events&gt;</code> metadata may be present and must be ignored by playback.</li>
  <li>Subtrees marked <code>data-videoml-ignore=\"true\"</code> may be excluded from recording.</li>
</ul>
`,
};
