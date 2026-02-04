const colorSchemes = [
  {
    id: 'cool-light',
    name: 'Cool Light',
    description: 'Indigo base with magenta-blue accents for clean broadcast layouts.',
  },
  {
    id: 'cool-dark',
    name: 'Cool Dark',
    description: 'Indigo + magenta accents for studio control rooms and tech explainers.',
  },
  {
    id: 'warm-light',
    name: 'Warm Light',
    description: 'Warm base with pink-blue accents for promos and human stories.',
  },
  {
    id: 'warm-dark',
    name: 'Warm Dark',
    description: 'Warm neutrals with pink-blue accents for cinematic stories.',
  },
  {
    id: 'neutral-light',
    name: 'Neutral Light',
    description: 'Clean slate palette for general-purpose layouts.',
  },
  {
    id: 'neutral-dark',
    name: 'Neutral Dark',
    description: 'Balanced charcoal palette that keeps contrast gentle.',
  },
];

export const componentsColorsDoc = {
  slug: ["components", "colors"],
  title: "Color Schemes",
  description: "Radix-based light/dark palettes for layouts; keep color schemes independent from typography",
  category: "Developer Reference",
  html: `
<h1>Color Schemes</h1>
<p>Each scheme is a Radix-inspired palette with gentle contrast. Avoid pure black/white; backgrounds stay inward of the scale and text avoids full-white.</p>

<h2>Color Scheme Preview</h2>
<p>Each scheme appears for three seconds. Dark modes play first, then light modes.</p>
<div class="docs-preview" data-docs-preview="colors-cycle" data-w="1920" data-h="1080"></div>

<h2>Scheme Catalog</h2>
<div class="grid gap-6">
  ${colorSchemes
    .map((scheme) => `
      <div class="rounded-2xl bg-muted/40 p-4">
        <div class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">${scheme.name}</div>
        <div class="text-sm text-muted-foreground">${scheme.description}</div>
      </div>
    `)
    .join('')}
</div>

<h2>Tokens per scheme</h2>
<ul>
  <li><code>--color-bg</code>, <code>--color-bg-subtle</code></li>
  <li><code>--color-surface</code>, <code>--color-surface-strong</code></li>
  <li><code>--color-text</code>, <code>--color-text-muted</code></li>
  <li><code>--color-primary</code>, <code>--color-secondary</code></li>
  <li><code>--color-muted</code>, <code>--color-muted-more</code></li>
  <li><code>--color-border</code> (use sparingly; prefer surface contrast)</li>
</ul>

<h2>Usage notes</h2>
<ul>
  <li>Prefer background contrast over borders.</li>
  <li>Use the same layout with different schemes to create brand variations.</li>
  <li>Match with typography: Cool ↔ Broadcast/Tech, Neutral ↔ Data Viz, Warm ↔ Promo.</li>
</ul>
`,
};
