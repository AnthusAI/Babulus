# VideoML Design System - Quick Reference

Quick copy-paste snippets for common patterns.

## Page Template

```tsx
import * as React from "react";
import type { PageProps } from "gatsby";
import { Layout, Hero, CodeBlock, Callout } from "../components";
import "../styles/content.css";

const PageName: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        title="Page Title"
        subtitle="Page description"
      />

      <article className="article content-page">
        <section style={{ padding: "var(--space-5xl) 0" }}>
          <h2>Section Title</h2>
          <p>Content goes here...</p>
        </section>
      </article>
    </Layout>
  );
};

export default PageName;
```

## Section with Background

```tsx
<section style={{
  padding: "var(--space-5xl) 0",
  background: "var(--color-bg-secondary)"
}}>
  <div style={{
    maxWidth: "var(--max-width-lg)",
    margin: "0 auto",
    padding: "0 var(--space-lg)"
  }}>
    <h2>Section Title</h2>
    <p>Content...</p>
  </div>
</section>
```

## Code Example with Callout

```tsx
const example = `<videoml>
  <scene id="intro" duration="3s">
    <text>Hello</text>
  </scene>
</videoml>`;

<>
  <CodeBlock code={example} language="xml" />
  <Callout type="info" title="Note">
    Important point about this example
  </Callout>
</>
```

## Feature Grid

```tsx
import { FeatureCard } from "../components";

<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "var(--space-2xl)"
}}>
  <FeatureCard
    icon="🎯"
    title="Feature Name"
    description="Feature description"
    link="/path"
  />
  {/* More cards... */}
</div>
```

## Attribute Table

```tsx
<table>
  <thead>
    <tr>
      <th>Attribute</th>
      <th>Type</th>
      <th>Required</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code className="param-name">duration</code></td>
      <td className="param-type">string</td>
      <td><span className="param-required">required</span></td>
      <td>Duration in time units (e.g., "3s", "500ms")</td>
    </tr>
    <tr>
      <td><code className="param-name">id</code></td>
      <td className="param-type">string</td>
      <td>optional</td>
      <td>Unique identifier</td>
    </tr>
  </tbody>
</table>
```

## Example Box

```tsx
<div className="example-box">
  <div className="example-header">Example: Basic Scene</div>
  <div className="example-content">
    <p>Description...</p>
    <CodeBlock code={example} language="xml" />
  </div>
</div>
```

## Side-by-Side Comparison

```tsx
<div className="two-column">
  <div>
    <h3>Before</h3>
    <pre>{`// Code before`}</pre>
    <p>Description</p>
  </div>
  <div>
    <h3>After</h3>
    <pre>{`// Code after`}</pre>
    <p>Description</p>
  </div>
</div>
```

## Status Badge

```tsx
<h2>
  Feature Name
  <span className="status-badge status-draft">Draft</span>
</h2>

{/* Options: status-draft, status-stable, status-deprecated */}
```

## Spec Section with Number

```tsx
<div className="spec-section">
  <span className="spec-section-number">3.1.4</span>
  <h3>Section Title</h3>
</div>
```

## Table of Contents

```tsx
<nav className="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><a href="#section-1">Section 1</a></li>
    <li><a href="#section-2">Section 2</a>
      <ul>
        <li><a href="#subsection-2-1">Subsection 2.1</a></li>
        <li><a href="#subsection-2-2">Subsection 2.2</a></li>
      </ul>
    </li>
  </ul>
</nav>
```

## All Callout Types

```tsx
<Callout type="info" title="Information">
  Informational content
</Callout>

<Callout type="note">
  General note (no custom title)
</Callout>

<Callout type="success" title="Success">
  Success or positive message
</Callout>

<Callout type="warning" title="Warning">
  Warning or caution
</Callout>

<Callout type="error" title="Error">
  Error or deprecated feature
</Callout>
```

## Hero Variants

```tsx
// Standard hero
<Hero
  title="Page Title"
  subtitle="Description"
/>

// Gradient hero (centered)
<Hero
  title="Page Title"
  subtitle="Description"
  gradient={true}
  centered={true}
/>
```

## Common Imports

```tsx
import * as React from "react";
import type { PageProps, HeadFC } from "gatsby";
import {
  Layout,
  Hero,
  CodeBlock,
  Callout,
  FeatureCard
} from "../components";
import "../styles/content.css";
```

## SEO Head

```tsx
export const Head: HeadFC = () => (
  <>
    <title>Page Title - VideoML</title>
    <meta
      name="description"
      content="Page description for search engines"
    />
  </>
);
```

## CSS Variables Reference

### Colors
```css
var(--color-primary)        /* #0066cc */
var(--color-accent)         /* #7c3aed */
var(--color-success)        /* #059669 */
var(--color-warning)        /* #d97706 */
var(--color-error)          /* #dc2626 */

var(--color-text-primary)   /* #111827 */
var(--color-text-secondary) /* #4b5563 */
var(--color-text-muted)     /* #6b7280 */

var(--color-bg-primary)     /* #ffffff */
var(--color-bg-secondary)   /* #f9fafb */
var(--color-border)         /* #e5e7eb */
```

### Typography
```css
var(--font-size-xs)   /* 12px */
var(--font-size-sm)   /* 14px */
var(--font-size-base) /* 16px */
var(--font-size-lg)   /* 18px */
var(--font-size-xl)   /* 20px */
var(--font-size-2xl)  /* 24px */
var(--font-size-3xl)  /* 30px */
var(--font-size-4xl)  /* 36px */
var(--font-size-5xl)  /* 48px */
var(--font-size-6xl)  /* 60px */
```

### Spacing
```css
var(--space-xs)   /* 4px */
var(--space-sm)   /* 8px */
var(--space-md)   /* 16px */
var(--space-lg)   /* 24px */
var(--space-xl)   /* 32px */
var(--space-2xl)  /* 48px */
var(--space-3xl)  /* 64px */
var(--space-4xl)  /* 96px */
var(--space-5xl)  /* 128px */
```

### Layout
```css
var(--max-width-sm)  /* 640px */
var(--max-width-md)  /* 768px */
var(--max-width-lg)  /* 1024px */
var(--max-width-xl)  /* 1280px */
var(--max-width-2xl) /* 1536px */
```

## Common Patterns

### Center Content
```tsx
<div style={{
  maxWidth: "var(--max-width-lg)",
  margin: "0 auto",
  padding: "0 var(--space-lg)"
}}>
```

### Card Style
```tsx
<div style={{
  padding: "var(--space-xl)",
  background: "var(--color-bg-secondary)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--color-border)"
}}>
```

### Section Spacing
```tsx
<section style={{ padding: "var(--space-5xl) 0" }}>
```

### Grid Layout
```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "var(--space-2xl)"
}}>
```

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Serve production build
npm run serve

# Clean cache
npm run clean
```

Visit `http://localhost:8000/design-showcase` to see all components in action.
