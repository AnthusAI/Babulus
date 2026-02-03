const colorThemes = [
  {
    id: 'cool-light',
    name: 'Cool Light',
    description: 'Calm indigo palette for broadcast + tech explainers.',
  },
  {
    id: 'cool-dark',
    name: 'Cool Dark',
    description: 'Low-contrast indigo dark for studio control rooms.',
  },
  {
    id: 'warm-light',
    name: 'Warm Light',
    description: 'Warm amber for promos, calls-to-action, and highlights.',
  },
  {
    id: 'warm-dark',
    name: 'Warm Dark',
    description: 'Soft warm darks for cinematic stories and brand warmth.',
  },
  {
    id: 'neutral-light',
    name: 'Neutral Light',
    description: 'Balanced slate palette for general-purpose layouts.',
  },
  {
    id: 'neutral-dark',
    name: 'Neutral Dark',
    description: 'Muted charcoal tones with gentle contrast.',
  },
];

export const componentsColorsDoc = {
  slug: ["components", "colors"],
  title: "Color Themes",
  description: "Radix-based light/dark palettes for layouts; keep colors independent from typography",
  category: "Developer Reference",
  html: `
<h1>Color Themes</h1>
<p>Each theme is a Radix-inspired palette with gentle contrast. Avoid pure black/white; backgrounds stay in the 1–3 range and text in 11–12.</p>

<h2>Theme Preview Reel</h2>
<p>Each theme appears for three seconds with swatches for background, surfaces, and accents.</p>
<iframe src="/docs-preview/color-themes?autoplay=1" width="100%" height="520" style="border:0;border-radius:18px;" loading="lazy"></iframe>

<h2>Theme Catalog</h2>
<div class="grid gap-8">
  ${colorThemes
    .map((theme, index) => {
      const time = index * 3;
      return `
        <div class="rounded-2xl bg-muted/40 p-4">
          <div class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">${theme.name}</div>
          <div class="mb-4 text-sm text-muted-foreground">${theme.description}</div>
          <iframe src="/docs-preview/color-themes?t=${time}&controls=0&w=1280&h=720" width="100%" height="220" style="border:0;border-radius:16px;" loading="lazy"></iframe>
        </div>
      `;
    })
    .join('')}
</div>

<h2>Tokens per theme</h2>
<ul>
  <li><code>--color-bg</code>, <code>--color-bg-subtle</code></li>
  <li><code>--color-surface</code>, <code>--color-surface-strong</code></li>
  <li><code>--color-text</code>, <code>--color-text-muted</code></li>
  <li><code>--color-accent</code>, <code>--color-accent-strong</code></li>
  <li><code>--color-border</code> (use sparingly; prefer surface contrast)</li>
</ul>

<h2>Example CSS</h2>
<pre><code>.theme-cool-dark {
  --color-bg: #0b0f1f;
  --color-bg-subtle: #141a2f;
  --color-surface: #1f2743;
  --color-surface-strong: #2a3458;
  --color-text: #eef1ff;
  --color-text-muted: #c7cffd;
  --color-accent: #6a7dff;
  --color-accent-strong: #8394ff;
}</code></pre>

<h2>Usage notes</h2>
<ul>
  <li>Prefer background contrast over borders.</li>
  <li>Match with typography: Cool ↔ Broadcast/Tech, Neutral ↔ Data Viz, Warm ↔ Promo.</li>
</ul>
`,
};
