export const componentsLayoutsDoc = {
  slug: ["components", "layouts"],
  title: "Standard Layouts",
  description: "Full-frame flex layouts with debug frames, ready to combine with typography and color themes",
  category: "Developer Reference",
  html: `
<h1>Standard Layouts</h1>
<p>All layouts are full-frame flex containers. Enable <code>debugLayout</code> (or the scene <code>frame</code> flag) to reveal dashed borders and labels for every region.</p>

<h2>Layouts</h2>
<p>Each layout below includes a live preview (Studio preview system, no rendered MP4). Ensure previews are generated into <code>apps/studio-web/public/preview</code>.</p>

<h3>TitleSlide</h3>
<p>Centered/vertically aligned title & subtitle; configurable entrances.</p>
<iframe src="/docs-preview/title-slide-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>ChapterHeading</h3>
<p>Large chapter number with layouts.</p>
<iframe src="/docs-preview/chapter-heading-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>QuoteCard</h3>
<p>Pull-quote card.</p>
<iframe src="/docs-preview/quote-card-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>TwoColumn</h3>
<p>Side-by-side content with ratios and stagger.</p>
<iframe src="/docs-preview/two-column-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>Grid</h3>
<p>N-item grid with stagger patterns.</p>
<iframe src="/docs-preview/grid-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>Sidebar</h3>
<p>Main + sidebar rail.</p>
<iframe src="/docs-preview/sidebar-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>SplitScreen</h3>
<p>Ratio split horizontal/vertical, optional divider.</p>
<iframe src="/docs-preview/split-screen-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>BulletListScreen</h3>
<p>Header (label/eyebrow/title/subtitle/logo) + bullet list filling remaining space. Props: <code>label</code>, <code>eyebrow</code>, <code>title</code>, <code>subtitle?</code>, <code>logoUrl?/logoAlt?/logoWidth?/logoHeight?</code>, <code>align</code>, <code>bullets</code> (pass-through to BulletListComponent), <code>background</code>, <code>padding</code>, <code>gap</code>, <code>debugLayout</code>.</p>
<iframe src="/docs-preview/bullet-options" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

<h3>FlexPage</h3>
<p>Base shell used by BulletListScreen; header + content flex area. Props: same header props, <code>contentDirection</code>, <code>contentGap</code>, <code>children[]</code> (component specs).</p>
<iframe src="/docs-preview/flex-page-demo" width="100%" height="600" style="border:0;" loading="lazy"></iframe>

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
  <li>For TV/room viewing: larger padding and spacing; prefer <code>justify="space-between"</code> for vertical distribution in bullet lists.</li>
  <li>Logos: use <code>logoFit="contain"</code> to avoid distortion.</li>
</ul>
`,
};
