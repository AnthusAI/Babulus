# VideoML Website

Official website for the VideoML specification - an XML-based markup language for declarative video composition.

## Overview

This is a Gatsby-based static site showcasing the VideoML draft specification. The site features a modern, standards-body aesthetic with comprehensive documentation and examples.

**Status**: Design Complete ✅ | Content In Progress 🔄

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Serve production build
npm run serve

# Clean cache
npm run clean
```

Visit `http://localhost:8000` after running `npm run dev`.

### Monorepo (from repo root)

```bash
# Start dev server
npm run videoml:develop

# Build for production
npm run videoml:build

# Serve the production build
npm run videoml:serve
```

The repo root includes an `.nvmrc` to align Node versions in local and CI.

## Site Structure

```
/                    - Homepage with value proposition and examples
/specs               - Main specification page
/specs/core          - Core concepts
/specs/components    - Component reference
/specs/temporal-layout - Temporal layout system
/specs/timeline-api  - Timeline API reference
/specs/vom           - Video Object Model (VOM)
/design-showcase     - Design system component showcase
```

## Design System

This site uses a custom design system built for standards-body specifications. Key features:

- **Modern aesthetic**: Professional but engaging
- **Reusable components**: Layout, Hero, CodeBlock, Callout, FeatureCard
- **Design tokens**: CSS variables for consistency
- **Responsive**: Mobile-first, works on all devices
- **Accessible**: WCAG AA compliant
- **Fast**: No external dependencies, optimized for performance

### Documentation

- **`DESIGN_SYSTEM.md`** - Complete design system guide
- **`QUICK_REFERENCE.md`** - Code snippets and common patterns
- **`DESIGN_HANDOFF.md`** - Comprehensive handoff document
- **`HOMEPAGE_STRUCTURE.md`** - Homepage design breakdown

### Components

All components are in `src/components/`:

- **Layout** - Site wrapper with navigation and footer
- **Hero** - Page header section
- **CodeBlock** - Syntax-highlighted code with copy button
- **Callout** - Info/warning/success/note/error boxes
- **FeatureCard** - Feature cards for grids

Import from the barrel export:
```tsx
import { Layout, Hero, CodeBlock, Callout, FeatureCard } from "../components";
```

### Styles

- **`src/styles/global.css`** - Design tokens, typography, spacing
- **`src/styles/content.css`** - Article/documentation styles

## Creating New Pages

### Basic Page Template

```tsx
import * as React from "react";
import type { PageProps } from "gatsby";
import { Layout, Hero, CodeBlock, Callout } from "../components";
import "../styles/content.css";

const MyPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        title="Page Title"
        subtitle="Optional description"
      />

      <article className="article content-page">
        <section style={{ padding: "var(--space-5xl) 0" }}>
          <h2>Section Heading</h2>
          <p>Your content here...</p>

          <CodeBlock
            code={exampleCode}
            language="xml"
          />

          <Callout type="info">
            Important information
          </Callout>
        </section>
      </article>
    </Layout>
  );
};

export default MyPage;
```

### Design System Reference

Visit `/design-showcase` to see all components in action.

For code snippets and common patterns, see `QUICK_REFERENCE.md`.

## Project Structure

```
apps/videoml-org/
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/           # Gatsby pages (file-based routing)
│   └── styles/          # Global and content styles
├── gatsby-config.ts     # Gatsby configuration
├── package.json         # Dependencies and scripts
└── *.md                 # Documentation files
```

## Design Principles

1. **Clarity First** - Easy to read and understand
2. **Professional** - Standards-body credibility
3. **Engaging** - Not boring, uses examples and visuals
4. **Accessible** - High contrast, semantic HTML
5. **Consistent** - Design tokens ensure uniformity

## Color Palette

- **Primary**: `#0066cc` - Links, CTAs
- **Accent**: `#7c3aed` - Code, technical highlights
- **Success**: `#059669` - Positive states
- **Warning**: `#d97706` - Warnings
- **Error**: `#dc2626` - Errors, deprecated features
- **Grays**: `gray-50` to `gray-900` - Text and backgrounds

Access via CSS variables:
```css
color: var(--color-primary);
background: var(--color-bg-secondary);
```

## Typography

System font stack for performance:
- **Sans-serif**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, etc.
- **Monospace**: SF Mono, Monaco, Consolas, etc.

Scale: xs (12px) → 6xl (60px)

## Spacing System

Consistent 4px-based spacing:
- `--space-xs` = 4px
- `--space-sm` = 8px
- `--space-md` = 16px
- `--space-lg` = 24px
- `--space-xl` = 32px
- `--space-2xl` = 48px
- `--space-3xl` = 64px
- `--space-4xl` = 96px
- `--space-5xl` = 128px

## Contributing

When adding content:

1. **Use the Layout component** for consistent site structure
2. **Add Hero sections** to page headers
3. **Use CodeBlock** for all code examples
4. **Add Callouts** for important notes
5. **Apply content.css** with `className="article content-page"`
6. **Follow spacing patterns** from existing pages
7. **Reference QUICK_REFERENCE.md** for common snippets

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Modern CSS features used:
- CSS Variables
- Grid Layout
- Flexbox
- System Fonts

## Performance

Target metrics:
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Total Page Size: < 100KB (before content)

Optimizations:
- System fonts (no web font downloads)
- Minimal CSS payload
- No external dependencies
- Inline styles (tree-shakeable)

## Tech Stack

- **Gatsby 5** - Static site generator
- **React 18** - UI library
- **TypeScript** - Type safety
- **CSS Variables** - Design tokens

No CSS frameworks, no CSS-in-JS libraries, no UI component libraries. Everything is custom-built for VideoML.

## Links

- **GitHub**: https://github.com/AnthusAI/Babulus
- **VideoML Spec**: `/specs`
- **Design Showcase**: `/design-showcase`

---

**Design Status**: ✅ Complete
**Content Status**: 🔄 In Progress
**Launch Status**: 🔄 Pending Content

For questions about the design system, see `DESIGN_SYSTEM.md`.
For code snippets, see `QUICK_REFERENCE.md`.
For complete handoff info, see `DESIGN_HANDOFF.md`.
