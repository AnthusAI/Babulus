import React from "react";
import { defineVideo } from "../src/dsl/builder";

const schemes = [
  {
    id: "cool-dark",
    label: "Cool Dark",
    color: {
      bg: "#0b0f1f",
      text: "#eef1ff",
      textMuted: "#c8cff6",
      primary: "#ff5ec4",
      secondary: "#6a7dff",
      surface: "#151b32",
      surfaceStrong: "#1e2645",
    },
    font: {
      eyebrow: "var(--font-preview-humanist), sans-serif",
      headline: "var(--font-preview-sans), sans-serif",
      subhead: "var(--font-preview-humanist), sans-serif",
    },
  },
  {
    id: "neutral-dark",
    label: "Neutral Dark",
    color: {
      bg: "#0f0f0e",
      text: "#f5f5f4",
      textMuted: "#c7c2bc",
      primary: "#ff5ec4",
      secondary: "#5f7bff",
      surface: "#171615",
      surfaceStrong: "#211f1e",
    },
    font: {
      eyebrow: "var(--font-preview-sans), sans-serif",
      headline: "var(--font-preview-serif), serif",
      subhead: "var(--font-preview-sans), sans-serif",
    },
  },
  {
    id: "warm-dark",
    label: "Warm Dark",
    color: {
      bg: "#1b1207",
      text: "#ffe7c4",
      textMuted: "#f2c89a",
      primary: "#ff5ec4",
      secondary: "#5b8cff",
      surface: "#24180b",
      surfaceStrong: "#2f210f",
    },
    font: {
      eyebrow: "var(--font-preview-humanist), sans-serif",
      headline: "var(--font-preview-display), sans-serif",
      subhead: "var(--font-preview-humanist), sans-serif",
    },
  },
  {
    id: "cool-light",
    label: "Cool Light",
    color: {
      bg: "#f5f7ff",
      text: "#1f2d5c",
      textMuted: "#4f5d88",
      primary: "#d948b8",
      secondary: "#4d6bff",
      surface: "#e9edff",
      surfaceStrong: "#dfe4ff",
    },
    font: {
      eyebrow: "var(--font-preview-humanist), sans-serif",
      headline: "var(--font-preview-sans), sans-serif",
      subhead: "var(--font-preview-humanist), sans-serif",
    },
  },
  {
    id: "neutral-light",
    label: "Neutral Light",
    color: {
      bg: "#f4f3f1",
      text: "#2a2623",
      textMuted: "#5a534d",
      primary: "#d948b8",
      secondary: "#556eff",
      surface: "#e9e7e4",
      surfaceStrong: "#dedbd7",
    },
    font: {
      eyebrow: "var(--font-preview-sans), sans-serif",
      headline: "var(--font-preview-serif), serif",
      subhead: "var(--font-preview-sans), sans-serif",
    },
  },
  {
    id: "warm-light",
    label: "Warm Light",
    color: {
      bg: "#fff5ee",
      text: "#5a2f13",
      textMuted: "#84533b",
      primary: "#d948b8",
      secondary: "#5177ff",
      surface: "#ffe9db",
      surfaceStrong: "#f9dcc6",
    },
    font: {
      eyebrow: "var(--font-preview-humanist), sans-serif",
      headline: "var(--font-preview-display), sans-serif",
      subhead: "var(--font-preview-humanist), sans-serif",
    },
  },
];

const colorTypeScenes = [
  {
    schemeId: "cool-dark",
    eyebrow: "Cool Dark",
    title: "Humanist Sans",
    subtitle: "Friendly, readable UI copy",
  },
  {
    schemeId: "neutral-dark",
    eyebrow: "Neutral Dark",
    title: "Modern Serif",
    subtitle: "Editorial weight with clarity",
  },
  {
    schemeId: "warm-dark",
    eyebrow: "Warm Dark",
    title: "Display Contrast",
    subtitle: "Bold headlines with character",
  },
  {
    schemeId: "cool-light",
    eyebrow: "Cool Light",
    title: "Geometric Sans",
    subtitle: "Clean, precise, and modern",
  },
  {
    schemeId: "neutral-light",
    eyebrow: "Neutral Light",
    title: "Studio Serif",
    subtitle: "Balanced warmth for narration",
  },
  {
    schemeId: "warm-light",
    eyebrow: "Warm Light",
    title: "Soft Display",
    subtitle: "Friendly tone for storytelling",
  },
];

const featureGroups = [
  {
    title: "AI Automation",
    subtitle: "Speech, timing, and rendering",
    items: ["AI voiceover", "Auto timing", "Scene orchestration"],
  },
  {
    title: "Design System",
    subtitle: "Reusable layouts + themes",
    items: ["Standard layouts", "Typography schemes", "Color schemes"],
  },
  {
    title: "Production Ready",
    subtitle: "Scale content without timelines",
    items: ["Versioned videos", "Batch rendering", "Agent-friendly"],
  },
];

const findScheme = (id: string) => schemes.find((scheme) => scheme.id === id) ?? schemes[0];

const gridCards = [
  "Story",
  "Charts",
  "Quotes",
  "Steps",
  "Metrics",
  "Highlights",
];

const hold = (scene: any, id: string, seconds: number) => {
  scene.cue(id, (cue: any) => {
    cue.voice((v: any) => {
      v.pause(seconds);
    });
  });
};

const withThemeVars = (scheme: typeof schemes[number]) => ({
  vars: {
    "--color-bg": scheme.color.bg,
    "--color-bg-subtle": scheme.color.surface,
    "--color-surface": scheme.color.surface,
    "--color-surface-strong": scheme.color.surfaceStrong,
    "--color-surface-2": scheme.color.surfaceStrong,
    "--color-text": scheme.color.text,
    "--color-text-muted": scheme.color.textMuted,
    "--color-primary": scheme.color.primary,
    "--color-secondary": scheme.color.secondary,
    "--color-accent": scheme.color.primary,
    "--color-accent-2": scheme.color.secondary,
    "--color-muted": scheme.color.textMuted,
    "--color-muted-more": scheme.color.textMuted,
    "--font-eyebrow": scheme.font.eyebrow,
    "--font-headline": scheme.font.headline,
    "--font-subhead": scheme.font.subhead,
  },
});

export default defineVideo(
  "Home Elevator Preview",
  { fps: 30, width: 1920, height: 1080 },
  (c) => {
    c.scene("intro", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("TitleSlide", {
          title: "Code Your Videos",
          subtitle: "(AI is really good at it!)",
          verticalAlign: "center",
          horizontalAlign: "center",
          entranceStartFrame: -999,
        });
      });
      hold(s, "hold-intro", 2);
    });

    c.scene("quote", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("QuoteCard", {
          quote: "AI agents make all our YouTube videos for us now.",
        });
      });
      hold(s, "hold-quote", 4);
    });

    c.scene("chapter-layouts", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("ChapterHeading", {
          number: "01",
          title: "Layouts",
          subtitle: "Composable screens in seconds",
          layout: "side-by-side",
        });
      });
      hold(s, "hold-chapter-layouts", 2);
    });

    c.scene("layout-content", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("ContentScreen", {
          eyebrow: "Content Screen",
          title: "Single column canvas",
          subtitle: "Fill the space below the header",
          headerAlign: "left",
          content: {
            type: "PlaceholderPanel",
            id: "content",
            flex: 1,
            props: { label: "Content Area", text: "Drop in any component" },
          },
        });
      });
      hold(s, "hold-layout-content", 2);
    });

    c.scene("layout-two-column", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("TwoColumnScreen", {
          eyebrow: "Two Column Screen",
          title: "Balanced layout",
          subtitle: "Side-by-side storytelling",
          headerAlign: "left",
          left: {
            type: "PlaceholderPanel",
            id: "left",
            flex: 1,
            props: { label: "Left Panel", text: "Charts, visuals" },
          },
          right: {
            type: "PlaceholderPanel",
            id: "right",
            flex: 1,
            props: { label: "Right Panel", text: "Narrative copy" },
          },
        });
      });
      hold(s, "hold-layout-two-column", 2);
    });

    c.scene("layout-three-column", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("ThreeColumnScreen", {
          eyebrow: "Three Column Screen",
          title: "Structured comparisons",
          subtitle: "Multiple streams at once",
          headerAlign: "left",
          columns: [
            {
              type: "PlaceholderPanel",
              id: "col-1",
              flex: 1,
              props: { label: "Column One", text: "Inputs" },
            },
            {
              type: "PlaceholderPanel",
              id: "col-2",
              flex: 1,
              props: { label: "Column Two", text: "Processing" },
            },
            {
              type: "PlaceholderPanel",
              id: "col-3",
              flex: 1,
              props: { label: "Column Three", text: "Outputs" },
            },
          ],
        });
      });
      hold(s, "hold-layout-three-column", 2);
    });

    c.scene("layout-grid", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("GridScreen", {
          eyebrow: "Grid Screen",
          title: "Modular tiles",
          subtitle: "Arrange multiple panels fast",
          headerAlign: "left",
          grid: {
            columns: 3,
            items: gridCards.map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  borderRadius: 20,
                  background: "var(--color-surface-strong)",
                  color: "var(--color-text)",
                  fontSize: 28,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            )),
          },
        });
      });
      hold(s, "hold-layout-grid", 2);
    });

    c.scene("chapter-colors", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("ChapterHeading", {
          number: "02",
          title: "Colors & Typefaces",
          subtitle: "Six schemes, one system",
          layout: "side-by-side",
        });
      });
      hold(s, "hold-chapter-colors", 2);
    });

    colorTypeScenes.forEach((entry, index) => {
      c.scene(`color-type-${index + 1}`, (s) => {
        const scheme = findScheme(entry.schemeId);
        s.styles(withThemeVars(scheme));
        s.layer("content", {}, (l) => {
          l.layout("TitleSlide", {
            eyebrow: entry.eyebrow,
            title: entry.title,
            subtitle: entry.subtitle,
            verticalAlign: "center",
            horizontalAlign: "center",
            entranceStartFrame: -999,
          });
        });
        hold(s, `hold-color-type-${index + 1}`, 2);
      });
    });

    c.scene("chapter-features", (s) => {
      s.styles(withThemeVars(schemes[0]));
      s.layer("content", {}, (l) => {
        l.layout("ChapterHeading", {
          number: "03",
          title: "Features",
          subtitle: "Built for fast video teams",
          layout: "side-by-side",
        });
      });
      hold(s, "hold-chapter-features", 2);
    });

    featureGroups.forEach((group, index) => {
      c.scene(`features-${index + 1}`, (s) => {
        s.styles(withThemeVars(schemes[0]));
        s.layer("content", {}, (l) => {
          l.layout("BulletListScreen", {
            eyebrow: "Feature Group",
            title: group.title,
            subtitle: group.subtitle,
            align: "left",
            bullets: {
              items: group.items,
              bulletStyle: "icon",
              bulletIcon: { kind: "lucide", name: "check", color: "var(--color-secondary)", strokeWidth: 3, size: 34 },
              fontSize: 52,
              lineHeight: 1.35,
              spacing: 42,
              textColor: "var(--color-text)",
              justify: "start",
            },
          });
        });
        hold(s, `hold-features-${index + 1}`, 2);
      });
    });
  },
);
