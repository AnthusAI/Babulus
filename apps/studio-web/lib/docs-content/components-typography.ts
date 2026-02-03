const typefaceThemes = [
  // A — Broadcast Classics
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Classic News',
    description: 'Neutral, authoritative news tone. Use for anchors, headlines, and steady narration.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Authority',
    description: 'High-impact urgency for promos, alerts, and breaking updates.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Documentary',
    description: 'Warm, readable narration style for long-form storytelling.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Serif Accent',
    description: 'Trustworthy headlines with a classic serif emphasis.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Headline + Caption',
    description: 'Big uppercase headlines with compact caption subheads.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Sports Ticker',
    description: 'Condensed, fast-paced overlays for live score and stats.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Debate',
    description: 'Screen-optimized neutral set for multi-speaker segments.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Magazine',
    description: 'Elegant feature feel for editorial and brand stories.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Finance',
    description: 'Clean data clarity for numbers, tickers, and charts.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Weather',
    description: 'Friendly rounded tone for forecast and explainer panels.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Ticker Serif',
    description: 'Mix of broadcast sans with heritage serif for credibility.',
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Tech Desk',
    description: 'Platform-native fonts for clean product demos.',
  },
  // B — Modern Sans & Slab
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Modern Grotesk',
    description: 'Unified sans stack for UI-first explainer content.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Slab Partner',
    description: 'Slab headline with clean sans subheads for contrast.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Humanist',
    description: 'Warm humanist sans for friendly explainers.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Heritage',
    description: 'Classic serif headline with neutral sans support.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Condensed',
    description: 'Tight, tall headlines for data-heavy overlays.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Display',
    description: 'Bold display headline for promos and hero frames.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Rounded',
    description: 'Friendly rounded style for approachable messaging.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Slate',
    description: 'Professional, understated sans stack for docs.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Hybrid',
    description: 'Modern sans paired with a high-contrast serif headline.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Geo Sans',
    description: 'Geometric sans for bold tech stories.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Slate Serif',
    description: 'Serif headline with neutral sans for contrast.',
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Studio Default',
    description: 'Default UI feel for clean product walkthroughs.',
  },
  // C — History / Cinema / Trends
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'History',
    description: 'Classic documentary tone with serif headline.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Cinema',
    description: 'Futura headline with modern cinematic pacing.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Current Trend',
    description: 'Contemporary sans stack for modern explainers.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Minimal Serif',
    description: 'Clean serif headline with modern sans support.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Broadcast Quote',
    description: 'Quote frames with serif emphasis and neutral sans.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Lower Third',
    description: 'Classic lower-third stack for nameplates.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Pop Culture',
    description: 'High energy display for entertainment content.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Luxury',
    description: 'Elegant serif with refined supporting sans.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'News Quote',
    description: 'Quote-heavy segments with clear serif headline.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Data Viz',
    description: 'Technical, condensed numerics for charts.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Esports',
    description: 'Futuristic display for gaming highlight reels.',
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Lifestyle',
    description: 'Soft, approachable vibe for wellness & lifestyle.',
  },
];

const sections = Array.from(new Set(typefaceThemes.map((t) => t.section)));

const buildThemeList = (section: string, startIndex: number) => {
  const items = typefaceThemes.filter((theme) => theme.section === section);
  return `
    <h3>${section}</h3>
    <div class="grid gap-8">
      ${items
        .map((theme) => {
          const index = typefaceThemes.findIndex((t) => t.name === theme.name);
          const time = index * 3;
          return `
            <div class="rounded-2xl bg-muted/40 p-4">
              <div class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">${theme.name}</div>
              <div class="mb-4 text-sm text-muted-foreground">${theme.description}</div>
              <iframe src="/docs-preview/typeface-themes?t=${time}&controls=0&w=1280&h=720" width="100%" height="220" style="border:0;border-radius:16px;" loading="lazy"></iframe>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
};

export const componentsTypographyDoc = {
  slug: ["components", "typography"],
  title: "Typography Themes",
  description: "Named eyebrow/headline/subhead font sets that overlay any layout",
  category: "Developer Reference",
  html: `
<h1>Typography Themes</h1>
<p>Typeface themes are packaged as CSS variables (<code>--font-eyebrow</code>, <code>--font-headline</code>, <code>--font-subhead</code>) so layouts stay typography-agnostic.</p>

<h2>Theme Preview Reel</h2>
<p>Each theme appears for three seconds in a standard title layout. The subtitle describes the intended use.</p>
<iframe src="/docs-preview/typeface-themes?autoplay=1" width="100%" height="600" style="border:0;border-radius:18px;" loading="lazy"></iframe>

<h2>Theme Catalog</h2>
${sections.map((section) => buildThemeList(section, 0)).join('')}

<h2>How to Apply</h2>
<pre><code>.theme-classic-news {
  --font-eyebrow: "Gill Sans", "Helvetica Neue", Arial, sans-serif;
  --font-headline: "Helvetica Neue", Arial, sans-serif;
  --font-subhead: Arial, "Helvetica Neue", sans-serif;
}</code></pre>

<h2>When to Choose</h2>
<ul>
  <li><strong>Hard news / corporate:</strong> Classic News, Authority, Finance, Tech Desk.</li>
  <li><strong>Promo / hype:</strong> Authority, Display, Pop Culture, Cinema.</li>
  <li><strong>Longform / docu:</strong> Documentary, Serif Accent, Magazine, History.</li>
  <li><strong>Data / UI overlays:</strong> Tech Desk, Data Viz, Modern Grotesk, Geo Sans.</li>
  <li><strong>Quotes / lower-thirds:</strong> Broadcast Quote, News Quote, Lower Third, Heritage.</li>
  <li><strong>Friendly / lifestyle:</strong> Rounded, Weather, Lifestyle.</li>
</ul>
`,
};
