import type { DocsEntry } from "@/lib/docs-registry";

export const liveVomDoc: DocsEntry = {
  slug: ["live-vom"],
  title: "Live VOM & Temporal Layout",
  description: "Time as a layout axis, live timelines, and DOM-like updates for video",
  category: "Developer Reference",
  html: `
<h1>Live VOM &amp; Temporal Layout</h1>
<p>This page is both documentation and a test bed. It demonstrates the new temporal layout model (time as a layout axis), live timelines that never stop, DOM-like edits, named actions, and synchronized multi-screen playback.</p>

<hr />

<h2>Temporal reflow: auto duration from children</h2>
<p>A sequence of timed elements without an explicit scene duration. The scene sizes itself to the sum of its children.</p>
<div class="docs-live" data-docs-live="temporal-reflow" data-w="1280" data-h="720" data-autoplay="true"></div>

<hr />

<h2>Sequence vs. stack</h2>
<p>Sequence lays out children back-to-back. Stack overlays children in parallel.</p>
<div class="docs-live" data-docs-live="sequence-stack" data-w="1280" data-h="720"></div>

<hr />

<h2>Live open-ended scene + cut</h2>
<p>The clock never stops. The current scene stays open-ended until you add the next scene.</p>
<div class="docs-live" data-docs-live="live-open-ended" data-w="1280" data-h="720"></div>

<hr />

<h2>Live DOM edits</h2>
<p>Updates to visible elements are immediate, just like editing a DOM node in a browser.</p>
<div class="docs-live" data-docs-live="live-dom-edit" data-w="1280" data-h="720"></div>

<hr />

<h2>Named actions</h2>
<p>Named actions dispatch events to components without inline JavaScript.</p>
<div class="docs-live" data-docs-live="named-actions" data-w="1280" data-h="720"></div>

<hr />

<h2>Multi-screen sync</h2>
<p>Multiple screens share the same clock for synchronized playback.</p>
<div class="docs-live" data-docs-live="multi-screen-sync" data-w="1280" data-h="720"></div>
`,
};
