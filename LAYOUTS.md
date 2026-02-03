# Standard Layouts (Agent Cheat Sheet)

All layouts are full‑frame flex containers with an optional debug frame (`debugLayout`/`frame` toggle) that renders dashed borders and labels for every region. Layouts are composable with typography and color themes (see `TYPEFACES.md`, `COLORS.md`).

## Layout Catalog

| Layout | Purpose | Key Props | Notes / When to use |
| --- | --- | --- | --- |
| **BulletListScreen** | Header (label/eyebrow/title/subtitle/logo) + bullet list filling the remaining flex space. | `label`, `eyebrow`, `title` (req), `subtitle?`, `logoUrl?/logoAlt?/logoWidth?/logoHeight?`, `align: 'left'|'center'`, `bullets` (passes to `BulletListComponent`), `background`, `padding`, `gap`, `debugLayout`. | Standard “feature list” slide; supports Lucide/unicode bullets via `bullets.bulletIcon`. |
| **FlexPage** | Generic page shell used by BulletListScreen; header + content flex area. | Same header props as above, plus `contentDirection`, `contentGap`, `children[]` (component specs). | Base for composing custom screens. |
| **TitleSlide** | Centered/vertical‑aligned title & subtitle. | `title` (req), `subtitle?`, `verticalAlign`, `padding`, `entrance/exit`. | Simple opener/section break. |
| **TwoColumn** | Side‑by‑side content with ratios. | `ratio`, `gap`, `verticalAlign`, `left/right` nodes, `staggerDelayFrames`. | Comparisons, A/B explainers. |
| **Grid** | N‑item grid with stagger reveal. | `columns`, `rows?`, `items[]`, `staggerPattern`, `itemEntrance`. | Galleries, icon boards. |
| **Sidebar** | Main + sidebar rail. | `sidebarPosition`, `sidebarWidth`, `gap`, `mainEntrance`, `sidebarEntrance`. | Agenda + notes, stats rail. |
| **SplitScreen** | 50/50 (or ratio) split horizontally/vertically. | `direction`, `ratio`, `divider`. | Before/after, interview/quote. |
| **ChapterHeading** | Large chapter number + title/subtitle. | `number`, `title`, `layout`, `numberEntrance`, `titleEntrance`. | Section titles. |
| **QuoteCard** | (Existing) quote/pull card. | — | Use with typography themes for quotes. |

## Demo Videos (open locally)
- Menu (BulletListScreen with debug frames): `open public/babulus/menu-auto.mp4`
- Bullet Playground (icon/bullet spacing): `open public/babulus/bullet-playground-full.mp4`
- Component Showcase (multi-layout tour): `open public/babulus/component-showcase-preview.mp4`

## Debug Frame
- Enable with `debugLayout: true` (or scene `frame` flag) to show dashed borders + labels:
  - Page: “FlexPage root”
  - Header: “Header” (shows label/eyebrow/title/subtitle/logo area)
  - Content: “Content”
  - Children: title‑cased component name (e.g., “Bullet List Component”)

## Composition Guidelines
- Keep layout choice separate from typography (`TYPEFACES.md`) and color theme (`COLORS.md`); treat them as orthogonal layers.
- For TV/room‑scale readability: prefer larger padding + spacing; keep line lengths short; use `justify: 'space-between'` in bullets for vertical distribution.
- Logos: use `logoUrl` + `logoFit="contain"` to avoid distortion; reserve ~140–180 px width in header. 
