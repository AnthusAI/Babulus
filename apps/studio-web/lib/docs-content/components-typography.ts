import type { DocsEntry } from "@/lib/docs-registry";

type FontPreview = {
  eyebrow: string;
  headline: string;
  subhead: string;
  eyebrowFont: string;
  headlineFont: string;
  subheadFont: string;
};

const fontFallbacks: Array<[RegExp, string]> = [
  [
    /helvetica|neue|arial|verdana|trebuchet|lucida|sf pro|segoe|avenir/i,
    'var(--font-preview-sans), system-ui, sans-serif',
  ],
  [
    /gill sans|franklin|source sans|open sans|nunito/i,
    'var(--font-preview-humanist), var(--font-preview-sans), sans-serif',
  ],
  [/oswald|din|narrow|condensed/i, 'var(--font-preview-condensed), sans-serif'],
  [/impact|bebas|ultra bold/i, 'var(--font-preview-display), sans-serif'],
  [/futura|poppins|geometric|montserrat/i, 'var(--font-preview-sans), sans-serif'],
  [/roboto slab|slab/i, 'var(--font-preview-slab), serif'],
  [/merriweather/i, 'var(--font-preview-serif), serif'],
  [
    /didot|bodoni|baskerville|garamond|charter|trajan|recoleta|cooper|bookman|optima|times new roman/i,
    'var(--font-preview-serif), serif',
  ],
  [/varela round/i, 'var(--font-preview-rounded), sans-serif'],
  [/orbitron/i, 'var(--font-preview-scifi), sans-serif'],
  [/russo/i, 'var(--font-preview-gaming), sans-serif'],
];

const applyFontFallback = (stack: string) => {
  for (const [pattern, replacement] of fontFallbacks) {
    if (pattern.test(stack)) {
      return replacement;
    }
  }
  return stack;
};

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;");

const typefaceThemes = [
  // A — Broadcast Classics
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Classic News',
    description: 'Neutral, authoritative news tone. Use for anchors, headlines, and steady narration.',
    preview: {
      eyebrow: 'Classic News',
      headline: 'Helvetica Neue Bold',
      subhead: 'Clear, objective delivery.',
      eyebrowFont: 'Gill Sans, Arial, sans-serif',
      headlineFont: '"Helvetica Neue", Arial, sans-serif',
      subheadFont: 'Arial, sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Authority',
    description: 'High-impact urgency for promos, alerts, and breaking updates.',
    preview: {
      eyebrow: 'Authority',
      headline: 'Impact Heavy',
      subhead: 'Punchy for urgent lower-thirds.',
      eyebrowFont: '"Franklin Gothic Medium", Arial, sans-serif',
      headlineFont: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
      subheadFont: '"Trebuchet MS", sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Documentary',
    description: 'Warm, readable narration style for long-form storytelling.',
    preview: {
      eyebrow: 'Documentary',
      headline: 'Trebuchet MS',
      subhead: 'Friendly, legible narration.',
      eyebrowFont: '"Lucida Grande", sans-serif',
      headlineFont: '"Trebuchet MS", sans-serif',
      subheadFont: '"Gill Sans", sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Serif Accent',
    description: 'Trustworthy headlines with a classic serif emphasis.',
    preview: {
      eyebrow: 'Serif Accent',
      headline: 'Georgia Bold',
      subhead: 'Trustworthy editorial tone.',
      eyebrowFont: '"Helvetica Neue", Arial, sans-serif',
      headlineFont: 'Georgia, "Times New Roman", serif',
      subheadFont: '"Source Sans 3", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Headline + Caption',
    description: 'Big uppercase headlines with compact caption subheads.',
    preview: {
      eyebrow: 'Headline+Caption',
      headline: 'Arial Black',
      subhead: 'Big caps, compact support.',
      eyebrowFont: '"Avenir Next", Arial, sans-serif',
      headlineFont: '"Arial Black", Gadget, sans-serif',
      subheadFont: '"Segoe UI", sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Sports Ticker',
    description: 'Condensed, fast-paced overlays for live score and stats.',
    preview: {
      eyebrow: 'Sports Ticker',
      headline: 'Oswald Bold',
      subhead: 'Condensed, high-urgency.',
      eyebrowFont: '"Roboto Condensed", Arial, sans-serif',
      headlineFont: 'Oswald, "Arial Narrow", sans-serif',
      subheadFont: '"Inter", system-ui, sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Debate',
    description: 'Screen-optimized neutral set for multi-speaker segments.',
    preview: {
      eyebrow: 'Debate',
      headline: 'Verdana Bold',
      subhead: 'Neutral, screen-optimized.',
      eyebrowFont: '"Verdana", sans-serif',
      headlineFont: 'Verdana, Geneva, sans-serif',
      subheadFont: '"Lucida Sans", sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Magazine',
    description: 'Elegant feature feel for editorial and brand stories.',
    preview: {
      eyebrow: 'Magazine',
      headline: 'Bodoni Poster',
      subhead: 'Elegant with contrast.',
      eyebrowFont: '"Avenir Next", sans-serif',
      headlineFont: '"Didot", "Bodoni MT", serif',
      subheadFont: '"Helvetica Neue", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Finance',
    description: 'Clean data clarity for numbers, tickers, and charts.',
    preview: {
      eyebrow: 'Finance',
      headline: 'Futura Bold',
      subhead: 'Geometric clarity.',
      eyebrowFont: '"Gill Sans", sans-serif',
      headlineFont: 'Futura, "Century Gothic", sans-serif',
      subheadFont: '"Segoe UI", sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Weather',
    description: 'Friendly rounded tone for forecast and explainer panels.',
    preview: {
      eyebrow: 'Weather',
      headline: 'Montserrat SemiBold',
      subhead: 'Rounded, inviting tone.',
      eyebrowFont: '"Nunito Sans", sans-serif',
      headlineFont: 'Montserrat, "Arial Rounded MT Bold", sans-serif',
      subheadFont: '"Open Sans", sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Ticker Serif',
    description: 'Mix of broadcast sans with heritage serif for credibility.',
    preview: {
      eyebrow: 'Ticker Serif',
      headline: 'Merriweather Bold',
      subhead: 'Broadcast + heritage.',
      eyebrowFont: '"Gill Sans", sans-serif',
      headlineFont: 'Merriweather, Georgia, serif',
      subheadFont: '"Source Sans 3", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    section: 'Broadcast Classics',
    name: 'Tech Desk',
    description: 'Platform-native fonts for clean product demos.',
    preview: {
      eyebrow: 'Tech Desk',
      headline: 'SF Pro Display Bold',
      subhead: 'Modern system default.',
      eyebrowFont: '"SF Pro Text", system-ui, sans-serif',
      headlineFont: '"SF Pro Display", system-ui, sans-serif',
      subheadFont: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    },
  },
  // B — Modern Sans & Slab
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Modern Grotesk',
    description: 'Unified sans stack for UI-first explainer content.',
    preview: {
      eyebrow: 'Modern Grotesk',
      headline: 'Inter Black',
      subhead: 'UI-native for crisp overlays.',
      eyebrowFont: '"Inter", system-ui, sans-serif',
      headlineFont: '"Inter", system-ui, sans-serif',
      subheadFont: '"Inter", system-ui, sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Slab Partner',
    description: 'Slab headline with clean sans subheads for contrast.',
    preview: {
      eyebrow: 'Slab Partner',
      headline: 'Roboto Slab Bold',
      subhead: 'Pair with sans eyebrow.',
      eyebrowFont: '"Roboto", sans-serif',
      headlineFont: '"Roboto Slab", serif',
      subheadFont: '"Roboto", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Humanist',
    description: 'Warm humanist sans for friendly explainers.',
    preview: {
      eyebrow: 'Humanist',
      headline: 'Segoe UI Bold',
      subhead: 'Warm, readable captions.',
      eyebrowFont: '"Segoe UI", sans-serif',
      headlineFont: '"Segoe UI", sans-serif',
      subheadFont: '"Segoe UI", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Heritage',
    description: 'Classic serif headline with neutral sans support.',
    preview: {
      eyebrow: 'Heritage',
      headline: 'Times Bold',
      subhead: 'Short quotes / chyrons.',
      eyebrowFont: '"Helvetica Neue", Arial, sans-serif',
      headlineFont: '"Times New Roman", serif',
      subheadFont: '"Arial", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Condensed',
    description: 'Tight, tall headlines for data-heavy overlays.',
    preview: {
      eyebrow: 'Condensed',
      headline: 'Arial Narrow Bold',
      subhead: 'Great for dense tickers.',
      eyebrowFont: '"Roboto Condensed", sans-serif',
      headlineFont: '"Arial Narrow Bold", sans-serif',
      subheadFont: '"Roboto", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Display',
    description: 'Bold display headline for promos and hero frames.',
    preview: {
      eyebrow: 'Display',
      headline: 'Gill Sans Ultra Bold',
      subhead: 'Poster feel for promos.',
      eyebrowFont: '"Gill Sans", sans-serif',
      headlineFont: '"Gill Sans Ultra Bold", sans-serif',
      subheadFont: '"Lucida Sans", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Rounded',
    description: 'Friendly rounded style for approachable messaging.',
    preview: {
      eyebrow: 'Rounded',
      headline: 'Varela Round',
      subhead: 'Soft edges, friendly tone.',
      eyebrowFont: '"Nunito", sans-serif',
      headlineFont: '"Varela Round", "Arial Rounded MT Bold", sans-serif',
      subheadFont: '"Nunito Sans", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Slate',
    description: 'Professional, understated sans stack for docs.',
    preview: {
      eyebrow: 'Slate',
      headline: 'Avenir Heavy',
      subhead: 'Premium, balanced weight.',
      eyebrowFont: '"Avenir Next", sans-serif',
      headlineFont: 'Avenir, "Avenir Next", sans-serif',
      subheadFont: '"Avenir Next", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Hybrid',
    description: 'Modern sans paired with a high-contrast serif headline.',
    preview: {
      eyebrow: 'Hybrid',
      headline: 'Playfair Display Bold',
      subhead: 'Elegant serif + sans body.',
      eyebrowFont: '"Montserrat", sans-serif',
      headlineFont: '"Playfair Display", serif',
      subheadFont: '"Montserrat", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Geo Sans',
    description: 'Geometric sans for bold tech stories.',
    preview: {
      eyebrow: 'Geo Sans',
      headline: 'Poppins Bold',
      subhead: 'Perfect circles, clear caps.',
      eyebrowFont: '"Poppins", sans-serif',
      headlineFont: '"Poppins", sans-serif',
      subheadFont: '"Poppins", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Slate Serif',
    description: 'Serif headline with neutral sans for contrast.',
    preview: {
      eyebrow: 'Slate Serif',
      headline: 'Charter Bold',
      subhead: 'Dense yet legible.',
      eyebrowFont: '"Inter", sans-serif',
      headlineFont: 'Charter, "Bookman", serif',
      subheadFont: '"Inter", sans-serif',
    },
  },
  {
    group: 'B',
    section: 'Modern Sans & Slab',
    name: 'Studio Default',
    description: 'Default UI feel for clean product walkthroughs.',
    preview: {
      eyebrow: 'Studio Default',
      headline: 'SF Pro Bold',
      subhead: 'Apple broadcast baseline.',
      eyebrowFont: '"SF Pro Text", system-ui, sans-serif',
      headlineFont: '"SF Pro Display", system-ui, sans-serif',
      subheadFont: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    },
  },
  // C — History / Cinema / Trends
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'History',
    description: 'Classic documentary tone with serif headline.',
    preview: {
      eyebrow: 'History',
      headline: 'Garamond Bold',
      subhead: 'Classic film title energy.',
      eyebrowFont: '"Gill Sans", sans-serif',
      headlineFont: 'Garamond, "Adobe Garamond", serif',
      subheadFont: '"Helvetica Neue", Arial, sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Cinema',
    description: 'Futura headline with modern cinematic pacing.',
    preview: {
      eyebrow: 'Cinema',
      headline: 'Futura Extra Bold',
      subhead: 'Kubrick-esque authority.',
      eyebrowFont: '"Avenir Next", sans-serif',
      headlineFont: 'Futura, "Century Gothic", sans-serif',
      subheadFont: '"Avenir Next", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Current Trend',
    description: 'Contemporary sans stack for modern explainers.',
    preview: {
      eyebrow: 'Current Trend',
      headline: 'Neue Haas Grotesk',
      subhead: 'Swiss clarity, everywhere.',
      eyebrowFont: '"Helvetica Neue", Arial, sans-serif',
      headlineFont: '"Helvetica Neue", Arial, sans-serif',
      subheadFont: '"Helvetica Neue", Arial, sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Minimal Serif',
    description: 'Clean serif headline with modern sans support.',
    preview: {
      eyebrow: 'Minimal Serif',
      headline: 'Canela Alt',
      subhead: 'Soft contrast, luxe feel.',
      eyebrowFont: '"Montserrat", sans-serif',
      headlineFont: '"Baskerville", "Times New Roman", serif',
      subheadFont: '"Inter", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Broadcast Quote',
    description: 'Quote frames with serif emphasis and neutral sans.',
    preview: {
      eyebrow: 'Broadcast Quote',
      headline: 'Quote Card',
      subhead: 'Pair with new QuoteCard layout.',
      eyebrowFont: '"Segoe UI", sans-serif',
      headlineFont: '"Merriweather", serif',
      subheadFont: '"Segoe UI", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Lower Third',
    description: 'Classic lower-third stack for nameplates.',
    preview: {
      eyebrow: 'Lower Third',
      headline: 'Franklin Gothic Demi',
      subhead: 'Great for name keys.',
      eyebrowFont: '"Franklin Gothic Medium", Arial, sans-serif',
      headlineFont: '"Franklin Gothic Demi", Arial, sans-serif',
      subheadFont: '"Inter", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Pop Culture',
    description: 'High energy display for entertainment content.',
    preview: {
      eyebrow: 'Pop Culture',
      headline: 'Bebas Neue',
      subhead: 'Tall condensed for promos.',
      eyebrowFont: '"Montserrat", sans-serif',
      headlineFont: '"Bebas Neue", "Oswald", sans-serif',
      subheadFont: '"Open Sans", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Luxury',
    description: 'Elegant serif with refined supporting sans.',
    preview: {
      eyebrow: 'Luxury',
      headline: 'Trajan Pro',
      subhead: 'Movie trailer vibes.',
      eyebrowFont: '"Optima", serif',
      headlineFont: 'Trajan, "Times New Roman", serif',
      subheadFont: '"Garamond", serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'News Quote',
    description: 'Quote-heavy segments with clear serif headline.',
    preview: {
      eyebrow: 'News Quote',
      headline: 'Serif Pull',
      subhead: 'Short pithy pull-quotes.',
      eyebrowFont: '"Gill Sans", sans-serif',
      headlineFont: '"Georgia", serif',
      subheadFont: '"Inter", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Data Viz',
    description: 'Technical, condensed numerics for charts.',
    preview: {
      eyebrow: 'Data Viz',
      headline: 'DIN Condensed Bold',
      subhead: 'Labels in charts/tickers.',
      eyebrowFont: '"DIN Alternate", sans-serif',
      headlineFont: '"DIN Condensed", sans-serif',
      subheadFont: '"Inter", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Esports',
    description: 'Futuristic display for gaming highlight reels.',
    preview: {
      eyebrow: 'Esports',
      headline: 'Russo One',
      subhead: 'Techno slab hybrid.',
      eyebrowFont: '"Orbitron", sans-serif',
      headlineFont: '"Russo One", sans-serif',
      subheadFont: '"Roboto", sans-serif',
    },
  },
  {
    group: 'C',
    section: 'History / Cinema / Trends',
    name: 'Lifestyle',
    description: 'Soft, approachable vibe for wellness & lifestyle.',
    preview: {
      eyebrow: 'Lifestyle',
      headline: 'Recoleta Alt',
      subhead: 'Friendly curves.',
      eyebrowFont: '"Nunito", sans-serif',
      headlineFont: '"Recoleta", "Cooper Black", serif',
      subheadFont: '"Nunito Sans", sans-serif',
    },
  },
];

const sections = Array.from(new Set(typefaceThemes.map((t) => t.section)));

const buildThemeList = (section: string) => {
  const items = typefaceThemes.filter((theme) => theme.section === section);
  const groupLabel = items[0]?.group ? `Option ${items[0].group} — ${section}` : section;
  return `
    <h3>${groupLabel}</h3>
    <div class="grid gap-8">
      ${items
        .map((theme) => {
          const payload = escapeAttribute(
            JSON.stringify({
              eyebrow: theme.preview.eyebrow,
              headline: theme.preview.headline,
              subhead: theme.preview.subhead,
              eyebrowFont: applyFontFallback(theme.preview.eyebrowFont),
              headlineFont: applyFontFallback(theme.preview.headlineFont),
              subheadFont: applyFontFallback(theme.preview.subheadFont),
            }),
          );
          return `
            <div class="rounded-2xl bg-muted/40 p-4">
              <div class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">${theme.name}</div>
              <div class="mb-4 text-sm text-muted-foreground">${theme.description}</div>
              <div data-typography-preview="true" data-payload='${payload}'></div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
};

export const componentsTypographyDoc: DocsEntry = {
  slug: ["components", "typography"],
  title: "Typography Schemes",
  description: "Named eyebrow/headline/subhead font sets that overlay any layout",
  category: "Developer Reference",
  html: `
<h1>Typography Schemes</h1>
<p>Typeface schemes are packaged as CSS variables (<code>--font-eyebrow</code>, <code>--font-headline</code>, <code>--font-subhead</code>) so layouts stay typography-agnostic.</p>

<h2>Scheme Catalog</h2>
${sections.map((section) => buildThemeList(section)).join('')}

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
