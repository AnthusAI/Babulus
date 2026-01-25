# Babulus Branding Guidelines

## Core Philosophy
Babulus is a professional-grade video production platform, not a toy app. Our aesthetic mimics high-end Non-Linear Editors (NLEs) like Adobe Premiere or DaVinci Resolve, combined with the clean precision of a modern IDE.

**Key Vibe:** "Studio-Grade," "Reliable," "Scalable," "Precision."

## Color & Contrast Policy

### Softened Extremes
To avoid jarring contrast and improve readability during long sessions:
-   **Dark Mode Backgrounds:** Never use pure black (`#000000`). Use deep grays (~25% lightness / Slate 3-4) to reduce eye strain.
-   **Light Mode Text:** Never use pure black text on white. Use deep grays (~75-80% black / Slate 11-12).
-   **White Text:** Avoid 100% white (`#FFFFFF`) on dark backgrounds. Use off-white (~90-95% / Slate 12 or Sand 12).

### Studio UI Components
When embedding "Studio" UI elements into marketing pages (e.g., screenshots, diagrams, example components):
-   Use **50% Gray** backgrounds for the UI panels/chrome. This mimics the neutral gray workspace of professional video tools, which is designed to not interfere with color grading perception.

## Typography

### Weights & Legibility
Because we use lower contrast ratios (soft blacks/whites), we compensate with typography:
-   **Heavier Weights:** Prefer Medium (500) or Semibold (600) for body text where contrast is lower.
-   **Fatter Fonts:** Avoid thin/light fonts.
-   **Structure:** Use "Eyebrows" (uppercase, tracked out, small caps) above headlines to create hierarchy.

### Font Pairings (To be determined via Playground)
We are currently evaluating pairings that balance "Technical/Code" with "Creative/Video".
See `apps/studio-web/app/(public)/fonts/page.tsx` for the live playground.

## Layout
-   **Public/Marketing:** Standard scrolling web layout.
-   **Studio/App:** Fixed viewport, no scroll bounce (`overflow: hidden`), paned layout.
