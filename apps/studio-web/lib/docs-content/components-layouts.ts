import type { DocsEntry } from "@/lib/docs-registry";

export const componentsLayoutsDoc: DocsEntry = {
  slug: ["components", "layouts"],
  title: "Standard Layouts",
  description: "Full-frame flex layouts with debug frames, ready to combine with typography and color themes",
  category: "Designers",
  html: `
<h1>Standard Layouts</h1>
<p>All layouts are full-frame flex containers. Enable <code>debugLayout</code> (or the scene <code>frame</code> flag) to reveal dashed borders and labels for every region.</p>

<h2>Layouts</h2>
<p>Each layout below includes a live preview. These are interactive previews (not rendered MP4s).</p>

<h3>Title Screen</h3>
<p>Centered/vertically aligned title & subtitle; configurable entrances.</p>
<div class="docs-preview" data-docs-preview="title-slide-demo" data-w="1920" data-h="1080" data-theme-controls="true"></div>

<h3>Chapter Heading</h3>
<p>Large chapter number with layouts.</p>
<div class="docs-preview" data-docs-preview="chapter-heading-demo" data-w="1920" data-h="1080" data-theme-controls="true"></div>

<h3>Content Screen</h3>
<p>Reusable header + single content area. Title, subtitle, eyebrow, and logo are optional.</p>
<div class="docs-preview" data-docs-preview="content-layout-demo" data-w="1920" data-h="1080" data-theme-controls="true"></div>

<h3>Two Column Screen</h3>
<p>Header + two columns. Supports animated column ratios.</p>
<div class="docs-preview" data-docs-preview="two-column-demo" data-w="1920" data-h="1080" data-theme-controls="true"></div>

<h3>Three Column Screen</h3>
<p>Header + three columns for wide-screen dashboards.</p>
<div class="docs-preview" data-docs-preview="three-column-demo" data-w="1920" data-h="1080" data-theme-controls="true"></div>

<h3>Grid Screen</h3>
<p>Header + multi-tile grid. Use for dashboards or menus.</p>
<div class="docs-preview" data-docs-preview="grid-screen-demo" data-w="1920" data-h="1080" data-theme-controls="true"></div>

<h2>Debug Frame Labels</h2>
<ul>
  <li>Page: “FlexPage root”</li>
  <li>Header: “Header” (shows label/eyebrow/title/subtitle/logo)</li>
  <li>Content: “Content”</li>
  <li>Children: title-cased component name (e.g., “Bullet List Component”)</li>
</ul>

<h2>Composition Guidelines</h2>
<ul>
  <li>Keep layouts independent from typography and color themes.</li>
  <li>For TV/room viewing: larger padding and spacing; prefer <code>justify="space-between"</code> for vertical distribution in vertical stacks.</li>
  <li>Logos: use <code>logoFit="contain"</code> to avoid distortion.</li>
</ul>
`,
};
