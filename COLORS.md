# Color Themes (Radix-based, Light/Dark)

Use Radix Colors as the base palette. Themes define CSS vars for surface, text, and accent roles. Keep color themes independent from layouts and typography.

## Token Set
For each theme define:
- `--color-bg` / `--color-bg-subtle`
- `--color-surface` / `--color-surface-strong`
- `--color-text` / `--color-text-muted`
- `--color-accent` / `--color-accent-strong`
- `--color-border` (used sparingly; prefer background contrast)

## Theme Catalog

### Cool (Blue/Purple)
- Light: Radix `indigo` / `blue` scales; text near `indigo12` with softened contrasts.
- Dark: Radix `indigoDark`; use not-black background (`indigo1Dark` to `indigo3Dark`), accent `indigo9Dark`.

### Neutral (Gray)
- Light: Radix `slate`; calm grayscale for charts and neutral UI overlays.
- Dark: Radix `slateDark`; reduce contrast for TV-safe backgrounds.

### Warm (Amber/Orange)
- Light: Radix `amber`; accent for alerts or promos; keep backgrounds in `amber1-3`.
- Dark: Radix `amberDark`; accents `amber9Dark`, text `amber12Dark`.

### Forest (Green/Teal)
- Light: Radix `teal`; trustworthy/data viz.
- Dark: Radix `tealDark`; accent `teal9Dark`.

## Demo Videos
- Component Showcase (surfaces + accents in action): `open public/babulus/component-showcase-preview.mp4`
- Menu (neutral background, accent labels): `open public/babulus/menu-auto.mp4`

## Application
Example class:
```css
.theme-cool-dark {
  --color-bg: hsl(var(--indigo1-dark));
  --color-bg-subtle: hsl(var(--indigo2-dark));
  --color-surface: hsl(var(--indigo3-dark));
  --color-surface-strong: hsl(var(--indigo4-dark));
  --color-text: hsl(var(--indigo12-dark));
  --color-text-muted: hsl(var(--indigo11-dark));
  --color-accent: hsl(var(--indigo9-dark));
  --color-accent-strong: hsl(var(--indigo10-dark));
  --color-border: hsl(var(--indigo6-dark));
}
```
(Replace `--indigoX-dark` with actual Radix token values or import the Radix CSS variables file.)

## Usage Notes
- Prefer background contrast over borders; keep borders subtle (`--color-border`).
- Keep gradients disabled per brand policy; use flat fills from these tokens.
- Match themes with typography: e.g., Cool with Broadcast/Tech, Neutral with Data Viz, Warm with Promo, Forest with Sustainability/Data.
