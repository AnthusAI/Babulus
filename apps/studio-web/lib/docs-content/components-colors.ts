export const componentsColorsDoc = {
  slug: ["components", "colors"],
  title: "Color Themes",
  description: "Radix-based light/dark palettes for layouts; keep colors independent from typography",
  category: "Developer Reference",
  html: `
<h1>Color Themes</h1>
<p>Use Radix Colors for predictable light/dark palettes. Define CSS vars per theme and keep colors separate from layouts and typography.</p>

<h2>Tokens per theme</h2>
<ul>
  <li><code>--color-bg</code>, <code>--color-bg-subtle</code></li>
  <li><code>--color-surface</code>, <code>--color-surface-strong</code></li>
  <li><code>--color-text</code>, <code>--color-text-muted</code></li>
  <li><code>--color-accent</code>, <code>--color-accent-strong</code></li>
  <li><code>--color-border</code> (use sparingly; prefer surface contrast)</li>
  <li>Optional shadows are flat/hard only (no soft glows); gradients discouraged per brand policy.</li>
</ul>

<h2>Theme Families</h2>
<ul>
  <li><strong>Cool</strong> (blue/indigo) — light: Radix indigo/blue scale; dark: indigoDark. Good with Broadcast/Tech typography.</li>
  <li><strong>Neutral</strong> (slate/gray) — light/dark slate. Good for Data Viz or minimal docs.</li>
  <li><strong>Warm</strong> (amber) — light/dark amber. Use for promos or alerts; keep backgrounds in 1–3 range, accents at 9–10.</li>
  <li><strong>Forest</strong> (teal/green) — light/dark teal. Trust/data/sustainability.</li>
</ul>

<h2>Live Previews</h2>
<p>Previews use the Studio preview system (no rendered MP4). Generate preview artifacts before viewing.</p>
<ul>
  <li><strong>Component Showcase (multiple surfaces + accents)</strong><br/>
    <iframe src="/docs-preview/component-showcase" width="100%" height="600" style="border:0;" loading="lazy"></iframe>
  </li>
  <li><strong>Menu (neutral background + accent labels)</strong><br/>
    <iframe src="/docs-preview/menu" width="100%" height="600" style="border:0;" loading="lazy"></iframe>
  </li>
</ul>

<h2>Example CSS</h2>
<pre><code>.theme-cool-dark {
  --color-bg: hsl(var(--indigo1-dark));
  --color-bg-subtle: hsl(var(--indigo2-dark));
  --color-surface: hsl(var(--indigo3-dark));
  --color-surface-strong: hsl(var(--indigo4-dark));
  --color-text: hsl(var(--indigo12-dark));
  --color-text-muted: hsl(var(--indigo11-dark));
  --color-accent: hsl(var(--indigo9-dark));
  --color-accent-strong: hsl(var(--indigo10-dark));
  --color-border: hsl(var(--indigo6-dark));
}</code></pre>

<h2>Usage notes</h2>
<ul>
<li>Prefer background contrast over borders.</li>
<li>Match with typography: Cool ↔ Broadcast/Tech, Neutral ↔ Data Viz, Warm ↔ Promo, Forest ↔ Sustainability/Data.</li>
</ul>
`,
};
