import { defineVideo } from '../src/dsl/builder';

type ColorTheme = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  palette: {
    bg: string;
    surface: string;
    surfaceStrong: string;
    text: string;
    textMuted: string;
    accent: string;
    accentStrong: string;
  };
};

const themes: ColorTheme[] = [
  {
    id: 'cool-light',
    label: 'Cool · Light',
    title: 'Cool Light',
    subtitle: 'Calm indigo palette for broadcast + tech explainers.',
    palette: {
      bg: '#f8faff',
      surface: '#eef2ff',
      surfaceStrong: '#e0e7ff',
      text: '#1f2d5c',
      textMuted: '#4e5d8a',
      accent: '#5b70ff',
      accentStrong: '#4d5eff',
    },
  },
  {
    id: 'cool-dark',
    label: 'Cool · Dark',
    title: 'Cool Dark',
    subtitle: 'Low-contrast indigo dark for studio control rooms.',
    palette: {
      bg: '#0b0f1f',
      surface: '#141a2f',
      surfaceStrong: '#1f2743',
      text: '#eef1ff',
      textMuted: '#c7cffd',
      accent: '#6a7dff',
      accentStrong: '#8394ff',
    },
  },
  {
    id: 'warm-light',
    label: 'Warm · Light',
    title: 'Warm Light',
    subtitle: 'Warm amber for promos, calls-to-action, and highlights.',
    palette: {
      bg: '#fff8f1',
      surface: '#ffedd5',
      surfaceStrong: '#fde2b7',
      text: '#55310c',
      textMuted: '#8a5c2e',
      accent: '#f59e0b',
      accentStrong: '#d97706',
    },
  },
  {
    id: 'warm-dark',
    label: 'Warm · Dark',
    title: 'Warm Dark',
    subtitle: 'Soft warm darks for cinematic stories and brand warmth.',
    palette: {
      bg: '#1b1207',
      surface: '#26180a',
      surfaceStrong: '#332110',
      text: '#ffe7c4',
      textMuted: '#f4c999',
      accent: '#d97706',
      accentStrong: '#b45309',
    },
  },
  {
    id: 'neutral-light',
    label: 'Neutral · Light',
    title: 'Neutral Light',
    subtitle: 'Balanced slate palette for general-purpose layouts.',
    palette: {
      bg: '#f5f5f4',
      surface: '#ebe9e7',
      surfaceStrong: '#e1dedb',
      text: '#292524',
      textMuted: '#57534e',
      accent: '#64748b',
      accentStrong: '#475569',
    },
  },
  {
    id: 'neutral-dark',
    label: 'Neutral · Dark',
    title: 'Neutral Dark',
    subtitle: 'Muted charcoal tones with gentle contrast.',
    palette: {
      bg: '#0f0f0e',
      surface: '#181716',
      surfaceStrong: '#22201f',
      text: '#f5f5f4',
      textMuted: '#c5c2be',
      accent: '#94a3b8',
      accentStrong: '#cbd5e1',
    },
  },
];

export default defineVideo('Color Themes', { fps: 30, width: 1920, height: 1080 }, (c) => {
  themes.forEach((theme, index) => {
    const start = index * 3;
    const end = start + 3;

    c.scene(`color-${theme.id}`, (s) => {
      s.styles({
        background: theme.palette.bg,
        color: theme.palette.text,
        vars: {
          '--color-bg': theme.palette.bg,
          '--color-text': theme.palette.text,
          '--color-text-muted': theme.palette.textMuted,
        },
      });

      s.layer('content', { timing: { startSec: start, endSec: end } }, (l) => {
        l.layout('FlexPage', {
          headerAlign: 'left',
          label: theme.label,
          eyebrow: 'Radix Theme',
          title: theme.title,
          subtitle: theme.subtitle,
          background: theme.palette.bg,
          padding: 96,
          gap: 36,
          children: [
            {
              type: 'ColorThemeDemo',
              id: `${theme.id}-swatches`,
              flex: 1,
              props: { palette: theme.palette },
            },
          ],
        });
      });

      s.cue(`preview-${index}`, () => {});
    });
  });
});
