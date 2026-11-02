# Typography Themes (Agent & Dev Guide)

Fonts are packaged as **themes** that can be applied on top of any layout. Keep layouts, colors, and typography independent. Themes expose three semantic roles:
- `--font-eyebrow`
- `--font-headline`
- `--font-subhead`

Apply via a class or inline CSS vars (example below). Pair with `COLORS.md` tokens and any layout from `LAYOUTS.md`.

## How to apply
```css
.type-broadcast {
  --font-eyebrow: "Gill Sans", Arial, sans-serif;
  --font-headline: "Helvetica Neue", Arial, sans-serif;
  --font-subhead: Arial, sans-serif;
}
```
In React/DSL: set `styles` or wrapper class that defines the vars, then let components inherit.

## Theme Catalog (mirrors the Typography preview reel)

### A — Broadcast Classics
1. **Classic News** — Eyebrow Gill Sans; Headline Helvetica Neue Bold; Subhead Arial. Use for neutral newsy tone, lower-thirds.
2. **Authority** — Eyebrow Franklin Gothic; Headline Impact; Subhead Trebuchet. Loud urgency, promos.
3. **Documentary** — Eyebrow Lucida Grande; Headline Trebuchet MS; Subhead Gill Sans. Warm, approachable narration.
4. **Serif Accent** — Eyebrow Helvetica Neue; Headline Georgia Bold; Subhead Source Sans Pro. Trust/heritage.
5. **Headline+Caption** — Eyebrow Avenir Next; Headline Arial Black; Subhead Segoe UI. Big caps + small captions.
6. **Sports Ticker** — Eyebrow Roboto Condensed; Headline Oswald; Subhead Inter. High-tempo tickers.
7. **Debate** — Eyebrow Verdana; Headline Verdana Bold; Subhead Lucida Sans. Neutral, screen-optimized.
8. **Magazine** — Eyebrow Avenir Next; Headline Didot/Bodoni; Subhead Helvetica Neue. Elegant longform.
9. **Finance** — Eyebrow Gill Sans; Headline Futura Bold; Subhead Segoe UI. Geometric clarity for data.
10. **Weather** — Eyebrow Nunito Sans; Headline Montserrat SemiBold; Subhead Open Sans. Friendly, rounded.
11. **Ticker Serif** — Eyebrow Gill Sans; Headline Merriweather Bold; Subhead Source Sans. Broadcast + heritage.
12. **Tech Desk** — Eyebrow SF Pro Text; Headline SF Pro Display; Subhead system-ui. Neutral platform default.

### B — Modern Sans & Slab
1. **Modern Grotesk** — Inter for all roles. UI-native, crisp overlays.
2. **Slab Partner** — Roboto Sans + Roboto Slab. Pair slab headlines with sans body.
3. **Humanist** — Segoe UI for all roles. Warm, readable captions.
4. **Heritage** — Helvetica eyebrow; Times New Roman headline; Arial subhead. Short quotes/chyrons.
5. **Condensed** — Roboto Condensed eyebrow; Arial Narrow headline; Roboto subhead. Dense tickers.
6. **Display** — Gill Sans Ultra Bold headline; Gill Sans eyebrow/sub. Poster/promos.
7. **Rounded** — Nunito + Varela Round. Soft, friendly tone.
8. **Slate** — Avenir family. Premium balance.
9. **Hybrid** — Montserrat eyebrow/sub; Playfair Display headline. Elegant serif + sans body.
10. **Geo Sans** — Poppins for all. Perfect circles, clear caps.
11. **Slate Serif** — Inter eyebrow/sub; Charter headline. Dense yet legible.
12. **Studio Default** — SF Pro set. Apple broadcast baseline.

### C — History / Cinema / Trends
1. **History** — Gill Sans eyebrow; Garamond headline; Helvetica Neue sub. Classic film energy.
2. **Cinema** — Avenir eyebrow; Futura headline; Avenir sub. Kubrick-esque authority.
3. **Current Trend** — Helvetica Neue everywhere. Swiss clarity.
4. **Minimal Serif** — Montserrat eyebrow; Baskerville headline; Inter sub. Soft contrast luxe.
5. **Broadcast Quote** — Segoe eyebrow/sub; Merriweather headline. For pull-quotes.
6. **Lower Third** — Franklin Gothic set. Name keys, straps.
7. **Pop Culture** — Montserrat eyebrow; Bebas Neue headline; Open Sans sub. Promo hype.
8. **Luxury** — Trajan headline; Optima eyebrow; Garamond sub. Trailer vibes.
9. **News Quote** — Gill Sans eyebrow; Georgia headline; Inter sub. On-air quotes.
10. **Data Viz** — DIN set. Charts/labels.
11. **Esports** — Orbitron eyebrow; Russo One headline; Roboto sub. Techno slab hybrid.
12. **Lifestyle** — Nunito eyebrow/sub; Recoleta headline. Friendly curves.

## Guidance: when to pick which
- **Hard news / corporate:** Classic News, Authority, Finance, Tech Desk.
- **Promo / hype:** Authority, Display, Pop Culture, Cinema.
- **Longform / docu:** Documentary, Serif Accent, Magazine, History.
- **Data / UI overlays:** Tech Desk, Data Viz, Modern Grotesk, Geo Sans.
- **Quotes / lower-thirds:** Broadcast Quote, News Quote, Lower Third, Heritage.
- **Family-friendly / lifestyle:** Rounded, Weather, Lifestyle.

## Live Preview (Studio docs)
- Typography reel (3s per theme): `/docs-preview/typeface-themes`

## CSS Snippet Library
Create a theme class per name; example:
```css
.theme-classic-news {
  --font-eyebrow: "Gill Sans", Arial, sans-serif;
  --font-headline: "Helvetica Neue", Arial, sans-serif;
  --font-subhead: Arial, sans-serif;
}
```
Keep themes in a shared stylesheet so layouts stay typography-agnostic.
