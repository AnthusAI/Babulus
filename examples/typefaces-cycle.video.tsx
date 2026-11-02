import { defineVideo } from '../src/dsl/builder';

const baseVars = {
  '--color-bg': '#f4f1ec',
  '--color-text': '#211f1b',
  '--color-text-muted': '#5c5650',
};

type TypefaceTheme = {
  group: 'A' | 'B' | 'C';
  family: string;
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  fonts: {
    eyebrow: string;
    headline: string;
    subhead: string;
  };
};

const themes: TypefaceTheme[] = [
  // A — Broadcast Classics
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Classic News',
    eyebrow: 'Broadcast Classics',
    title: 'Classic News',
    subtitle: 'Neutral, authoritative news tone. Use for anchors, headlines, and steady narration.',
    fonts: {
      eyebrow: '"Gill Sans", "Helvetica Neue", Arial, sans-serif',
      headline: '"Helvetica Neue", Arial, sans-serif',
      subhead: 'Arial, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Authority',
    eyebrow: 'Broadcast Classics',
    title: 'Authority',
    subtitle: 'High-impact urgency for promos, alerts, and breaking updates.',
    fonts: {
      eyebrow: '"Franklin Gothic", "Arial Black", Arial, sans-serif',
      headline: 'Impact, "Arial Black", sans-serif',
      subhead: '"Trebuchet MS", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Documentary',
    eyebrow: 'Broadcast Classics',
    title: 'Documentary',
    subtitle: 'Warm, readable narration style for long-form storytelling.',
    fonts: {
      eyebrow: '"Lucida Grande", "Trebuchet MS", sans-serif',
      headline: '"Trebuchet MS", "Lucida Grande", sans-serif',
      subhead: '"Gill Sans", "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Serif Accent',
    eyebrow: 'Broadcast Classics',
    title: 'Serif Accent',
    subtitle: 'Trustworthy headlines with a classic serif emphasis.',
    fonts: {
      eyebrow: '"Helvetica Neue", Arial, sans-serif',
      headline: 'Georgia, "Times New Roman", serif',
      subhead: '"Source Sans Pro", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Headline + Caption',
    eyebrow: 'Broadcast Classics',
    title: 'Headline + Caption',
    subtitle: 'Big uppercase headlines with compact caption subheads.',
    fonts: {
      eyebrow: '"Avenir Next", "Helvetica Neue", sans-serif',
      headline: '"Arial Black", Impact, sans-serif',
      subhead: '"Segoe UI", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Sports Ticker',
    eyebrow: 'Broadcast Classics',
    title: 'Sports Ticker',
    subtitle: 'Condensed, fast-paced overlays for live score and stats.',
    fonts: {
      eyebrow: '"Roboto Condensed", "Helvetica Neue", sans-serif',
      headline: '"Oswald", "Roboto Condensed", sans-serif',
      subhead: 'Inter, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Debate',
    eyebrow: 'Broadcast Classics',
    title: 'Debate',
    subtitle: 'Screen-optimized neutral set for multi-speaker segments.',
    fonts: {
      eyebrow: 'Verdana, Arial, sans-serif',
      headline: 'Verdana, Arial, sans-serif',
      subhead: 'Verdana, Arial, sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Magazine',
    eyebrow: 'Broadcast Classics',
    title: 'Magazine',
    subtitle: 'Elegant feature feel for editorial and brand stories.',
    fonts: {
      eyebrow: '"Avenir Next", "Helvetica Neue", sans-serif',
      headline: '"Didot", "Bodoni 72", serif',
      subhead: '"Helvetica Neue", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Finance',
    eyebrow: 'Broadcast Classics',
    title: 'Finance',
    subtitle: 'Clean data clarity for numbers, tickers, and charts.',
    fonts: {
      eyebrow: '"Gill Sans", "Helvetica Neue", sans-serif',
      headline: 'Futura, "Helvetica Neue", sans-serif',
      subhead: '"Segoe UI", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Weather',
    eyebrow: 'Broadcast Classics',
    title: 'Weather',
    subtitle: 'Friendly rounded tone for forecast and explainer panels.',
    fonts: {
      eyebrow: '"Nunito Sans", "Segoe UI", sans-serif',
      headline: 'Montserrat, "Nunito Sans", sans-serif',
      subhead: '"Open Sans", "Segoe UI", sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Ticker Serif',
    eyebrow: 'Broadcast Classics',
    title: 'Ticker Serif',
    subtitle: 'Mix of broadcast sans with heritage serif for credibility.',
    fonts: {
      eyebrow: '"Gill Sans", "Helvetica Neue", sans-serif',
      headline: 'Merriweather, Georgia, serif',
      subhead: '"Source Sans Pro", Arial, sans-serif',
    },
  },
  {
    group: 'A',
    family: 'Broadcast Classics',
    name: 'Tech Desk',
    eyebrow: 'Broadcast Classics',
    title: 'Tech Desk',
    subtitle: 'Platform-native fonts for clean product demos.',
    fonts: {
      eyebrow: '"SF Pro Text", "Segoe UI", sans-serif',
      headline: '"SF Pro Display", "Segoe UI", sans-serif',
      subhead: '"SF Pro Text", "Segoe UI", sans-serif',
    },
  },
  // B — Modern Sans & Slab
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Modern Grotesk',
    eyebrow: 'Modern Sans & Slab',
    title: 'Modern Grotesk',
    subtitle: 'Unified sans stack for UI-first explainer content.',
    fonts: {
      eyebrow: 'Inter, "Helvetica Neue", sans-serif',
      headline: 'Inter, "Helvetica Neue", sans-serif',
      subhead: 'Inter, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Slab Partner',
    eyebrow: 'Modern Sans & Slab',
    title: 'Slab Partner',
    subtitle: 'Slab headline with clean sans subheads for contrast.',
    fonts: {
      eyebrow: 'Roboto, "Helvetica Neue", sans-serif',
      headline: '"Roboto Slab", Georgia, serif',
      subhead: 'Roboto, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Humanist',
    eyebrow: 'Modern Sans & Slab',
    title: 'Humanist',
    subtitle: 'Warm humanist sans for friendly explainers.',
    fonts: {
      eyebrow: '"Segoe UI", Arial, sans-serif',
      headline: '"Segoe UI", Arial, sans-serif',
      subhead: '"Segoe UI", Arial, sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Heritage',
    eyebrow: 'Modern Sans & Slab',
    title: 'Heritage',
    subtitle: 'Classic serif headline with neutral sans support.',
    fonts: {
      eyebrow: '"Helvetica Neue", Arial, sans-serif',
      headline: '"Times New Roman", Georgia, serif',
      subhead: 'Arial, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Condensed',
    eyebrow: 'Modern Sans & Slab',
    title: 'Condensed',
    subtitle: 'Tight, tall headlines for data-heavy overlays.',
    fonts: {
      eyebrow: '"Roboto Condensed", "Helvetica Neue", sans-serif',
      headline: '"Arial Narrow", "Roboto Condensed", sans-serif',
      subhead: 'Roboto, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Display',
    eyebrow: 'Modern Sans & Slab',
    title: 'Display',
    subtitle: 'Bold display headline for promos and hero frames.',
    fonts: {
      eyebrow: '"Gill Sans", "Helvetica Neue", sans-serif',
      headline: '"Gill Sans Ultra Bold", Impact, sans-serif',
      subhead: '"Gill Sans", "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Rounded',
    eyebrow: 'Modern Sans & Slab',
    title: 'Rounded',
    subtitle: 'Friendly rounded style for approachable messaging.',
    fonts: {
      eyebrow: '"Nunito", "Segoe UI", sans-serif',
      headline: '"Varela Round", "Nunito", sans-serif',
      subhead: '"Nunito", "Segoe UI", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Slate',
    eyebrow: 'Modern Sans & Slab',
    title: 'Slate',
    subtitle: 'Professional, understated sans stack for docs.',
    fonts: {
      eyebrow: '"Avenir Next", "Helvetica Neue", sans-serif',
      headline: '"Avenir Next", "Helvetica Neue", sans-serif',
      subhead: '"Avenir Next", "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Hybrid',
    eyebrow: 'Modern Sans & Slab',
    title: 'Hybrid',
    subtitle: 'Modern sans paired with a high-contrast serif headline.',
    fonts: {
      eyebrow: 'Montserrat, "Helvetica Neue", sans-serif',
      headline: '"Playfair Display", Georgia, serif',
      subhead: 'Montserrat, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Geo Sans',
    eyebrow: 'Modern Sans & Slab',
    title: 'Geo Sans',
    subtitle: 'Geometric sans for bold tech stories.',
    fonts: {
      eyebrow: 'Poppins, "Helvetica Neue", sans-serif',
      headline: 'Poppins, "Helvetica Neue", sans-serif',
      subhead: 'Poppins, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Slate Serif',
    eyebrow: 'Modern Sans & Slab',
    title: 'Slate Serif',
    subtitle: 'Serif headline with neutral sans for contrast.',
    fonts: {
      eyebrow: 'Inter, "Helvetica Neue", sans-serif',
      headline: 'Charter, Georgia, serif',
      subhead: 'Inter, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'B',
    family: 'Modern Sans & Slab',
    name: 'Studio Default',
    eyebrow: 'Modern Sans & Slab',
    title: 'Studio Default',
    subtitle: 'Default UI feel for clean product walkthroughs.',
    fonts: {
      eyebrow: '"SF Pro Text", "Segoe UI", sans-serif',
      headline: '"SF Pro Display", "Segoe UI", sans-serif',
      subhead: '"SF Pro Text", "Segoe UI", sans-serif',
    },
  },
  // C — History / Cinema / Trends
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'History',
    eyebrow: 'History / Cinema / Trends',
    title: 'History',
    subtitle: 'Classic documentary tone with serif headline.',
    fonts: {
      eyebrow: '"Gill Sans", "Helvetica Neue", sans-serif',
      headline: 'Garamond, "Times New Roman", serif',
      subhead: '"Helvetica Neue", Arial, sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Cinema',
    eyebrow: 'History / Cinema / Trends',
    title: 'Cinema',
    subtitle: 'Futura headline with modern cinematic pacing.',
    fonts: {
      eyebrow: '"Avenir Next", "Helvetica Neue", sans-serif',
      headline: 'Futura, "Avenir Next", sans-serif',
      subhead: '"Avenir Next", "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Current Trend',
    eyebrow: 'History / Cinema / Trends',
    title: 'Current Trend',
    subtitle: 'Contemporary sans stack for modern explainers.',
    fonts: {
      eyebrow: '"Helvetica Neue", Arial, sans-serif',
      headline: '"Helvetica Neue", Arial, sans-serif',
      subhead: '"Helvetica Neue", Arial, sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Minimal Serif',
    eyebrow: 'History / Cinema / Trends',
    title: 'Minimal Serif',
    subtitle: 'Clean serif headline with modern sans support.',
    fonts: {
      eyebrow: 'Montserrat, "Helvetica Neue", sans-serif',
      headline: 'Baskerville, Georgia, serif',
      subhead: 'Inter, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Broadcast Quote',
    eyebrow: 'History / Cinema / Trends',
    title: 'Broadcast Quote',
    subtitle: 'Quote frames with serif emphasis and neutral sans.',
    fonts: {
      eyebrow: '"Segoe UI", Arial, sans-serif',
      headline: 'Merriweather, Georgia, serif',
      subhead: '"Segoe UI", Arial, sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Lower Third',
    eyebrow: 'History / Cinema / Trends',
    title: 'Lower Third',
    subtitle: 'Classic lower-third stack for nameplates.',
    fonts: {
      eyebrow: '"Franklin Gothic", Arial, sans-serif',
      headline: '"Franklin Gothic", Arial, sans-serif',
      subhead: '"Franklin Gothic", Arial, sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Pop Culture',
    eyebrow: 'History / Cinema / Trends',
    title: 'Pop Culture',
    subtitle: 'High energy display for entertainment content.',
    fonts: {
      eyebrow: 'Montserrat, "Helvetica Neue", sans-serif',
      headline: '"Bebas Neue", "Arial Black", sans-serif',
      subhead: '"Open Sans", Arial, sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Luxury',
    eyebrow: 'History / Cinema / Trends',
    title: 'Luxury',
    subtitle: 'Elegant serif with refined supporting sans.',
    fonts: {
      eyebrow: 'Optima, "Helvetica Neue", sans-serif',
      headline: 'Trajan, "Times New Roman", serif',
      subhead: 'Garamond, "Times New Roman", serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'News Quote',
    eyebrow: 'History / Cinema / Trends',
    title: 'News Quote',
    subtitle: 'Quote-heavy segments with clear serif headline.',
    fonts: {
      eyebrow: '"Gill Sans", "Helvetica Neue", sans-serif',
      headline: 'Georgia, "Times New Roman", serif',
      subhead: 'Inter, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Data Viz',
    eyebrow: 'History / Cinema / Trends',
    title: 'Data Viz',
    subtitle: 'Technical, condensed numerics for charts.',
    fonts: {
      eyebrow: 'DIN, "Helvetica Neue", sans-serif',
      headline: 'DIN, "Helvetica Neue", sans-serif',
      subhead: 'DIN, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Esports',
    eyebrow: 'History / Cinema / Trends',
    title: 'Esports',
    subtitle: 'Futuristic display for gaming highlight reels.',
    fonts: {
      eyebrow: 'Orbitron, "Helvetica Neue", sans-serif',
      headline: '"Russo One", "Arial Black", sans-serif',
      subhead: 'Roboto, "Helvetica Neue", sans-serif',
    },
  },
  {
    group: 'C',
    family: 'History / Cinema / Trends',
    name: 'Lifestyle',
    eyebrow: 'History / Cinema / Trends',
    title: 'Lifestyle',
    subtitle: 'Soft, approachable vibe for wellness & lifestyle.',
    fonts: {
      eyebrow: 'Nunito, "Segoe UI", sans-serif',
      headline: 'Recoleta, Georgia, serif',
      subhead: 'Nunito, "Segoe UI", sans-serif',
    },
  },
];

export default defineVideo('Typeface Themes', { fps: 30, width: 1920, height: 1080 }, (c) => {
  themes.forEach((theme, index) => {
    const start = index * 3;
    const end = start + 3;

    c.scene(`theme-${index}`, (s) => {
      s.styles({
        background: 'var(--color-bg, #f4f1ec)',
        color: 'var(--color-text, #211f1b)',
        vars: {
          ...baseVars,
          '--font-eyebrow': theme.fonts.eyebrow,
          '--font-headline': theme.fonts.headline,
          '--font-subhead': theme.fonts.subhead,
        },
      });

      s.layer('content', { timing: { startSec: start, endSec: end } }, (l) => {
        l.layout('FlexPage', {
          headerAlign: 'center',
          label: theme.group,
          eyebrow: theme.family,
          title: theme.title,
          subtitle: theme.subtitle,
          background: 'var(--color-bg, #f4f1ec)',
          padding: 96,
          gap: 36,
        });
      });

      s.cue(`preview-${index}`, () => {});
    });
  });
});
