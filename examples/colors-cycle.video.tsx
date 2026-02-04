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
    primary: string;
    secondary: string;
    muted: string;
    mutedMore: string;
  };
};

const themes: ColorTheme[] = [
  {
    id: 'cool-dark',
    label: 'Dark Mode',
    title: 'Cool Dark',
    subtitle: 'Indigo + magenta accents for studio control rooms and tech explainers.',
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
    label: 'Dark Mode',
    title: 'Warm Dark',
    subtitle: 'Warm neutrals with pink-blue accents for cinematic stories.',
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
    id: 'neutral-dark',
    label: 'Dark Mode',
    title: 'Neutral Dark',
    subtitle: 'Balanced charcoal palette that keeps contrast gentle.',
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
  {
    id: 'cool-light',
    label: 'Light Mode',
    title: 'Cool Light',
    subtitle: 'Indigo base with magenta-blue accents for clean broadcast layouts.',
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
    id: 'warm-light',
    label: 'Light Mode',
    title: 'Warm Light',
    subtitle: 'Warm base with pink-blue accents for promos and human stories.',
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
    id: 'neutral-light',
    label: 'Light Mode',
    title: 'Neutral Light',
    subtitle: 'Clean slate palette for general-purpose layouts.',
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
          '--color-primary': theme.palette.primary,
          '--color-secondary': theme.palette.secondary,
          '--color-muted': theme.palette.muted,
          '--color-muted-more': theme.palette.mutedMore,
        },
      });

      s.layer('content', { timing: { startSec: start, endSec: end } }, (l) => {
        l.layout('FlexPage', {
          headerAlign: 'center',
          label: theme.label,
          eyebrow: 'Color Scheme',
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
