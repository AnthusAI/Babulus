import type { DocsEntry } from "@/lib/docs-registry";
import { COLOR_SCHEMES } from "@/lib/theme/color-schemes";

const renderPaletteSwatches = (scheme: (typeof COLOR_SCHEMES)[number]) => `
  <div class="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
    ${[
      ["Background", scheme.palette.bg],
      ["Surface", scheme.palette.surface],
      ["Surface+", scheme.palette.surfaceStrong],
      ["Text", scheme.palette.text],
      ["Text Muted", scheme.palette.textMuted],
      ["Primary", scheme.palette.primary],
      ["Secondary", scheme.palette.secondary],
      ["Muted", scheme.palette.muted],
      ["More Muted", scheme.palette.mutedMore],
    ]
      .map(
        ([label, color]) => `
      <div class="flex flex-col gap-2">
        <div class="h-16 w-full rounded-xl" style="background:${color};"></div>
        <div class="text-xs font-medium text-muted-foreground">${label}</div>
        <div class="text-xs text-muted-foreground">${color}</div>
      </div>
    `,
      )
      .join("")}
  </div>
`;

const schemeCards = COLOR_SCHEMES
  .map(
    (scheme) => `
      <div class="rounded-2xl bg-muted/40 p-4">
        <div class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">${scheme.name}</div>
        <div class="text-sm text-muted-foreground">${scheme.description}</div>
        ${renderPaletteSwatches(scheme)}
      </div>
    `,
  )
  .join("");

export const componentsColorsDoc: DocsEntry = {
  slug: ["components", "colors"],
  title: "Color Schemes",
  description: "Radix-based light/dark palettes for layouts; keep color schemes independent from typography",
  category: "Developer Reference",
  html: `
<h1>Color Schemes</h1>
<p>Each scheme is a Radix-inspired palette with gentle contrast. Avoid pure black/white; backgrounds stay inward of the scale and text avoids full-white.</p>

<h2>Scheme Catalog</h2>
<div class="grid gap-6">
  ${schemeCards}
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
