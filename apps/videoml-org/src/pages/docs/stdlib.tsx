import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section, Callout } from "../../components";
import { githubBlobUrl } from "../../lib/github";

const StdlibPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        eyebrow="Standard Library"
        title="Layouts, Typography, Colors, Components"
        subtitle="Composable building blocks for on-brand VideoML scenes."
        links={[
          { label: "View page source", href: githubBlobUrl("apps/videoml-org/src/pages/docs/stdlib.tsx") },
          { label: "View stdlib components", href: githubBlobUrl("packages/videoml-stdlib/src/dom/components.ts") },
          { label: "View token sets", href: githubBlobUrl("packages/videoml-stdlib/src/tokens/index.ts") },
        ]}
      />

      <Section>
        <h2 id="layouts">Layouts</h2>
        <p>
          Layouts are full-frame components that define regions: header, content,
          columns, and grids. They keep structure consistent while allowing
          styling through tokens.
        </p>
        <pre className="code-block">
{`<scene id="layout-demo">
  <title-slide props='{"title":"Hello","subtitle":"From VideoML"}' />
</scene>`}
        </pre>
      </Section>

      <Section tone="alt">
        <h2>Typography</h2>
        <p>
          Typeface sets pair headline + subhead + eyebrow fonts. Use the sets to
          keep text hierarchy consistent across scenes.
        </p>
        <Callout tone="info">
          Typeface tokens are documented here; runtime fonts can be swapped per
          brand while keeping layout structure intact.
        </Callout>
      </Section>

      <Section>
        <h2>Color Schemes</h2>
        <p>
          Radix-inspired palettes keep contrast gentle (no pure black/white) and
          rely on surfaces instead of borders.
        </p>
        <pre className="code-block">
{`<scene styles='{"vars":{"--color-bg":"#0b0f1f","--color-text":"#eef1ff"}}'>
  <chapter-heading props='{"title":"Cool Dark"}' />
</scene>`}
        </pre>
      </Section>

      <Section tone="alt">
        <h2 id="components">Components</h2>
        <ul>
          <li>Title slides, lower thirds, callouts, bullet lists</li>
          <li>Charts and engine demos for motion proofing</li>
          <li>Progress bars and UI accents</li>
        </ul>
        <Callout tone="warn">
          Use frame-driven motion only; no CSS animations in deterministic
          render paths.
        </Callout>
      </Section>
    </Layout>
  );
};

export default StdlibPage;

export const Head: HeadFC = () => <title>VideoML Standard Library</title>;
