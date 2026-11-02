export type TypographyScheme = {
  id: string;
  name: string;
  vars: {
    eyebrow: string;
    headline: string;
    subhead: string;
  };
};

export const TYPOGRAPHY_SCHEMES: TypographyScheme[] = [
  {
    id: "classic-news",
    name: "Classic News",
    vars: {
      eyebrow: "var(--font-preview-humanist), sans-serif",
      headline: "var(--font-preview-sans), sans-serif",
      subhead: "var(--font-preview-humanist), sans-serif",
    },
  },
  {
    id: "authority",
    name: "Authority",
    vars: {
      eyebrow: "var(--font-preview-humanist), sans-serif",
      headline: "var(--font-preview-display), sans-serif",
      subhead: "var(--font-preview-humanist), sans-serif",
    },
  },
  {
    id: "modern-grotesk",
    name: "Modern Grotesk",
    vars: {
      eyebrow: "var(--font-preview-sans), sans-serif",
      headline: "var(--font-preview-sans), sans-serif",
      subhead: "var(--font-preview-sans), sans-serif",
    },
  },
  {
    id: "slab-partner",
    name: "Slab Partner",
    vars: {
      eyebrow: "var(--font-preview-humanist), sans-serif",
      headline: "var(--font-preview-slab), serif",
      subhead: "var(--font-preview-humanist), sans-serif",
    },
  },
  {
    id: "cinema",
    name: "Cinema",
    vars: {
      eyebrow: "var(--font-preview-sans), sans-serif",
      headline: "var(--font-preview-serif), serif",
      subhead: "var(--font-preview-sans), sans-serif",
    },
  },
  {
    id: "sci-fi",
    name: "Sci-Fi",
    vars: {
      eyebrow: "var(--font-preview-scifi), sans-serif",
      headline: "var(--font-preview-gaming), sans-serif",
      subhead: "var(--font-preview-sans), sans-serif",
    },
  },
];
