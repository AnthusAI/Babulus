# VideoML Design System

This design system provides a comprehensive set of styles, components, and patterns for building the VideoML specification site with a modern standards-body aesthetic.

## Design Principles

1. **Clarity First**: Information should be easy to find and understand
2. **Professional**: Standards-body aesthetic with technical credibility
3. **Engaging**: Not boring - use visual hierarchy, examples, and clear narratives
4. **Accessible**: High contrast, clear typography, semantic HTML
5. **Consistent**: Reusable patterns and components throughout

## Color Palette

### Primary Colors
- **Primary Blue**: `#0066cc` - Links, CTAs, interactive elements
- **Primary Dark**: `#004d99` - Hover states
- **Primary Light**: `#3388dd` - Accents

### Accent Colors
- **Purple Accent**: `#7c3aed` - Code, special highlights
- **Success Green**: `#059669` - Success states, positive callouts
- **Warning Orange**: `#d97706` - Warnings, important notes
- **Error Red**: `#dc2626` - Errors, deprecated features

### Neutrals
- **Gray Scale**: `gray-50` through `gray-900` for text, backgrounds, and borders

### Usage
```css
color: var(--color-primary);
background: var(--color-bg-secondary);
border: 1px solid var(--color-border);
```

## Typography

### Font Stacks
- **Sans-serif**: System fonts for readability
- **Monospace**: SF Mono, Consolas for code

### Scale
- **6xl**: Hero titles (60px)
- **5xl**: Page titles (48px)
- **4xl**: Section headers (36px)
- **3xl**: Large headers (30px)
- **2xl**: Medium headers (24px)
- **xl**: Small headers (20px)
- **lg**: Large body (18px)
- **base**: Body text (16px)
- **sm**: Small text (14px)
- **xs**: Tiny text (12px)

### Usage
```tsx
<h1 style={{ fontSize: "var(--font-size-5xl)" }}>Page Title</h1>
<p style={{ fontSize: "var(--font-size-lg)" }}>Large body text</p>
```

## Spacing System

Consistent spacing using a scale from `xs` to `5xl`:
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px
- **4xl**: 96px
- **5xl**: 128px

### Usage
```tsx
<div style={{ padding: "var(--space-xl)", marginBottom: "var(--space-2xl)" }}>
```

## Components

### Layout
The main site layout with navigation and footer.

```tsx
import { Layout } from "../components/Layout";

<Layout>
  {/* Your page content */}
</Layout>
```

### Hero
Eye-catching header section for pages.

```tsx
import { Hero } from "../components/Hero";

<Hero
  title="Page Title"
  subtitle="Optional description"
  gradient={true}  // Purple gradient background
  centered={true}
/>
```

### CodeBlock
Syntax-highlighted code with copy button.

```tsx
import { CodeBlock } from "../components/CodeBlock";

<CodeBlock
  code={xmlString}
  language="xml"
  title="example.xml"
  showLineNumbers={true}
/>
```

### Callout
Highlighted information boxes.

```tsx
import { Callout } from "../components/Callout";

<Callout type="info" title="Important">
  This is important information to highlight.
</Callout>
```

**Types**: `info`, `warning`, `success`, `note`, `error`

### FeatureCard
Card component for features or navigation.

```tsx
import { FeatureCard } from "../components/FeatureCard";

<FeatureCard
  icon="🎯"
  title="Feature Name"
  description="Feature description"
  link="/path"  // Optional
/>
```

## Content Styling

For documentation pages, use the content styles:

```tsx
import "../styles/content.css";

<article className="article content-page">
  <h1>Specification</h1>
  <h2>Core Concepts</h2>
  <p>Your content here...</p>

  <div className="example-box">
    <div className="example-header">Example</div>
    <div className="example-content">
      <CodeBlock code={example} />
    </div>
  </div>
</article>
```

### Article Classes
- `.article` - Main content wrapper
- `.content-page` - Standard page width
- `.content-page-wide` - Wider layout
- `.example-box` - Bordered example container
- `.toc` - Table of contents styling
- `.status-badge` - Draft/Stable/Deprecated badges

### Spec Sections
For numbered specification sections:

```tsx
<div className="spec-section">
  <span className="spec-section-number">3.1.4</span>
  <h3>Section Title</h3>
</div>
```

### Tables
Tables are automatically styled in `.article`:

```tsx
<table>
  <thead>
    <tr>
      <th>Attribute</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>duration</code></td>
      <td className="param-type">string</td>
      <td>Scene duration (e.g., "3s", "500ms")</td>
    </tr>
  </tbody>
</table>
```

## Layout Patterns

### Section with Container
```tsx
const sectionStyles: React.CSSProperties = {
  padding: "var(--space-5xl) 0",
};

const containerStyles: React.CSSProperties = {
  maxWidth: "var(--max-width-xl)",
  margin: "0 auto",
  padding: "0 var(--space-lg)",
};

<section style={sectionStyles}>
  <div style={containerStyles}>
    {/* Content */}
  </div>
</section>
```

### Feature Grid
```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "var(--space-2xl)",
}}>
  <FeatureCard {...} />
  <FeatureCard {...} />
  <FeatureCard {...} />
</div>
```

### Two-Column Comparison
```tsx
<div className="two-column">
  <div>{/* Left column */}</div>
  <div>{/* Right column */}</div>
</div>
```

## Best Practices

### Content Pages
1. Start with a Hero component
2. Use clear section headings
3. Break up text with callouts and code examples
4. Add visual hierarchy with spacing
5. Use tables for structured data
6. Include examples liberally

### Code Examples
1. Always use CodeBlock component for multi-line code
2. Provide context before the code
3. Explain key points after the code
4. Use callouts to highlight important details

### Navigation
1. Keep nav items focused and clear
2. Use consistent naming across pages
3. Group related content logically

### Typography
1. Use semantic HTML (h1, h2, h3, etc.)
2. Don't skip heading levels
3. Keep line length readable (max-width-lg)
4. Use text hierarchy to guide reading

### Color Usage
1. Use primary blue for interactive elements
2. Use purple for code/technical content
3. Use green for success, orange for warnings
4. Keep high contrast for accessibility
5. Use grays for text hierarchy

### Spacing
1. Be generous with whitespace
2. Use consistent spacing within sections
3. Increase spacing between major sections
4. Don't cram content together

## Example Page Structure

```tsx
import * as React from "react";
import type { PageProps } from "gatsby";
import { Layout, Hero, CodeBlock, Callout } from "../components";
import "../styles/content.css";

const ExamplePage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        title="Page Title"
        subtitle="Clear, engaging description"
      />

      <article className="article content-page">
        <section style={{ padding: "var(--space-5xl) 0" }}>
          <h2>Section Heading</h2>
          <p>Introduction to this section...</p>

          <CodeBlock code={example} language="xml" />

          <Callout type="info">
            Key point to remember
          </Callout>
        </section>

        <section style={{
          padding: "var(--space-5xl) 0",
          background: "var(--color-bg-secondary)"
        }}>
          <h2>Another Section</h2>
          {/* More content */}
        </section>
      </article>
    </Layout>
  );
};

export default ExamplePage;
```

## Responsive Design

All components are mobile-responsive:
- Navigation collapses on mobile
- Grids become single-column
- Typography scales down
- Spacing adjusts appropriately

Test on mobile sizes when building pages.

## Next Steps for Content Creation

When building specification and documentation pages:

1. **Start with structure**: Use Hero, then sections
2. **Add narrative**: Write engaging introductions
3. **Show examples**: Use CodeBlock liberally
4. **Highlight key points**: Use Callouts
5. **Make it scannable**: Use headings, lists, tables
6. **Test readability**: Check on different screen sizes

The design system is ready. Focus on creating great content - the styling will handle itself!
