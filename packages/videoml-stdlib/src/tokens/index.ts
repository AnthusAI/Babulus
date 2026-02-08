export type ColorScheme = {
  id: string;
  name: string;
  description: string;
  palette: {
    bg: string;
    surface: string;
    surfaceStrong: string;
    text: string;
    textStrong: string;
    textMuted: string;
    primary: string;
    secondary: string;
    muted: string;
    mutedMore: string;
  };
};

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: "cool-light",
    name: "Cool Light",
    description: "Indigo base with magenta-blue accents for clean broadcast layouts.",
    palette: {
      bg: "#f5f7ff",
      surface: "#e9edff",
      surfaceStrong: "#dfe4ff",
      text: "#1f2d5c",
      textStrong: "#0b0f1f",
      textMuted: "#4f5d88",
      primary: "#d948b8",
      secondary: "#4d6bff",
      muted: "#8a97c0",
      mutedMore: "#b5bee0",
    },
  },
  {
    id: "cool-dark",
    name: "Cool Dark",
    description: "Indigo + magenta accents for studio control rooms and tech explainers.",
    palette: {
      bg: "#0b0f1f",
      surface: "#151b32",
      surfaceStrong: "#1e2645",
      text: "#eef1ff",
      textStrong: "#ffffff",
      textMuted: "#c8cff6",
      primary: "#ff5ec4",
      secondary: "#6a7dff",
      muted: "#9aa6d6",
      mutedMore: "#7d86b5",
    },
  },
  {
    id: "warm-light",
    name: "Warm Light",
    description: "Warm base with pink-blue accents for promos and human stories.",
    palette: {
      bg: "#fff5ee",
      surface: "#ffe9db",
      surfaceStrong: "#f9dcc6",
      text: "#5a2f13",
      textStrong: "#2b1306",
      textMuted: "#84533b",
      primary: "#d948b8",
      secondary: "#5177ff",
      muted: "#c6a18c",
      mutedMore: "#e1c7b8",
    },
  },
  {
    id: "warm-dark",
    name: "Warm Dark",
    description: "Warm neutrals with pink-blue accents for cinematic stories.",
    palette: {
      bg: "#1b1207",
      surface: "#24180b",
      surfaceStrong: "#2f210f",
      text: "#ffe7c4",
      textStrong: "#ffffff",
      textMuted: "#f2c89a",
      primary: "#ff5ec4",
      secondary: "#5b8cff",
      muted: "#b59473",
      mutedMore: "#947a5f",
    },
  },
  {
    id: "neutral-light",
    name: "Neutral Light",
    description: "Clean slate palette for general-purpose layouts.",
    palette: {
      bg: "#f4f3f1",
      surface: "#e9e7e4",
      surfaceStrong: "#dedbd7",
      text: "#2a2623",
      textStrong: "#0b0f0e",
      textMuted: "#5a534d",
      primary: "#d948b8",
      secondary: "#556eff",
      muted: "#9b948d",
      mutedMore: "#c9c3bd",
    },
  },
  {
    id: "neutral-dark",
    name: "Neutral Dark",
    description: "Balanced charcoal palette that keeps contrast gentle.",
    palette: {
      bg: "#0f0f0e",
      surface: "#171615",
      surfaceStrong: "#211f1e",
      text: "#f5f5f4",
      textStrong: "#ffffff",
      textMuted: "#c7c2bc",
      primary: "#ff5ec4",
      secondary: "#5f7bff",
      muted: "#9b948d",
      mutedMore: "#7c756f",
    },
  },
];
