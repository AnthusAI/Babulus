import type { DocsEntry } from "@/lib/docs-registry";

const colorSchemes = [
  {
    id: 'cool-light',
    name: 'Cool Light',
    description: 'Indigo base with magenta-blue accents for clean broadcast layouts.',
    palette: {
      bg: '#f5f7ff',
      surface: '#e9edff',
      surfaceStrong: '#dfe4ff',
      text: '#1f2d5c',
      textMuted: '#4f5d88',
      primary: '#d948b8',
      secondary: '#4d6bff',
      muted: '#8a97c0',
      mutedMore: '#b5bee0',
    },
  },
  {
    id: 'cool-dark',
    name: 'Cool Dark',
    description: 'Indigo + magenta accents for studio control rooms and tech explainers.',
    palette: {
      bg: '#0b0f1f',
      surface: '#151b32',
      surfaceStrong: '#1e2645',
      text: '#eef1ff',
      textMuted: '#c8cff6',
      primary: '#ff5ec4',
      secondary: '#6a7dff',
      muted: '#9aa6d6',
      mutedMore: '#7d86b5',
    },
  },
  {
    id: 'warm-light',
    name: 'Warm Light',
    description: 'Warm base with pink-blue accents for promos and human stories.',
    palette: {
      bg: '#fff5ee',
      surface: '#ffe9db',
      surfaceStrong: '#f9dcc6',
      text: '#5a2f13',
      textMuted: '#84533b',
      primary: '#d948b8',
      secondary: '#5177ff',
      muted: '#c6a18c',
      mutedMore: '#e1c7b8',
    },
  },
  {
    id: 'warm-dark',
    name: 'Warm Dark',
    description: 'Warm neutrals with pink-blue accents for cinematic stories.',
    palette: {
      bg: '#1b1207',
      surface: '#24180b',
      surfaceStrong: '#2f210f',
      text: '#ffe7c4',
      textMuted: '#f2c89a',
      primary: '#ff5ec4',
      secondary: '#5b8cff',
      muted: '#b59473',
      mutedMore: '#947a5f',
    },
  },
  {
    id: 'neutral-light',
    name: 'Neutral Light',
    description: 'Clean slate palette for general-purpose layouts.',
    palette: {
      bg: '#f4f3f1',
      surface: '#e9e7e4',
      surfaceStrong: '#dedbd7',
      text: '#2a2623',
      textMuted: '#5a534d',
      primary: '#d948b8',
      secondary: '#556eff',
      muted: '#9b948d',
      mutedMore: '#c9c3bd',
    },
  },
  {
    id: 'neutral-dark',
    name: 'Neutral Dark',
    description: 'Balanced charcoal palette that keeps contrast gentle.',
    palette: {
      bg: '#0f0f0e',
      surface: '#171615',
      surfaceStrong: '#211f1e',
      text: '#f5f5f4',
      textMuted: '#c7c2bc',
      primary: '#ff5ec4',
      secondary: '#5f7bff',
      muted: '#9b948d',
      mutedMore: '#7c756f',
    },
  },
];

const renderPaletteSwatches = (scheme: (typeof colorSchemes)[number]) => `
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
      .join('')}
  </div>
`;

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
  ${colorSchemes
    .map((scheme) => `
      <div class="rounded-2xl bg-muted/40 p-4">
        <div class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">${scheme.name}</div>
        <div class="text-sm text-muted-foreground">${scheme.description}</div>
        ${renderPaletteSwatches(scheme)}
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
