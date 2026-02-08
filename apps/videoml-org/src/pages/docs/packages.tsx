import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section } from "../../components";
import { githubBlobUrl, githubTreeUrl } from "../../lib/github";

const PackagesPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        eyebrow="Packages"
        title="VideoML NPM Modules"
        subtitle="Reference implementations published as composable packages."
        links={[
          { label: "View page source", href: githubBlobUrl("apps/videoml-org/src/pages/docs/packages.tsx") },
          { label: "Browse /packages", href: githubTreeUrl("packages") },
        ]}
      />

      <Section>
        <h2 id="videoml-player">@videoml/player</h2>
        <p className="meta-links">
          Source:{" "}
          <a href={githubBlobUrl("packages/videoml-player/src/web-component.ts")} target="_blank" rel="noreferrer">
            web-component.ts
          </a>
          {" · "}
          <a href={githubBlobUrl("packages/videoml-player/src/runtime.ts")} target="_blank" rel="noreferrer">
            runtime.ts
          </a>
        </p>
        <p>
          Browser runtime + web component. Drop <code>&lt;vml-player&gt;</code>
          into any page to preview VideoML.
        </p>
        <pre className="code-block">
{`import { defineVmlPlayer } from "@videoml/player";

defineVmlPlayer();

// HTML
// <vml-player src="/videos/intro.babulus.xml" auto-play></vml-player>`}
        </pre>
      </Section>

      <Section tone="alt">
        <h2 id="videoml-stdlib">@videoml/stdlib</h2>
        <p className="meta-links">
          Source:{" "}
          <a href={githubBlobUrl("packages/videoml-stdlib/src/dom/components.ts")} target="_blank" rel="noreferrer">
            dom/components.ts
          </a>
          {" · "}
          <a href={githubBlobUrl("packages/videoml-stdlib/src/tokens/index.ts")} target="_blank" rel="noreferrer">
            tokens/index.ts
          </a>
        </p>
        <p>
          Standard library of layouts, typography, colors, and components with
          DOM + React parity.
        </p>
        <pre className="code-block">
{`import { registerVideoMLComponents } from "@videoml/stdlib/dom";
import { TitleSlideLayout } from "@videoml/stdlib/react";`}
        </pre>
      </Section>

      <Section>
        <h2 id="videoml-cli">@videoml/cli</h2>
        <p className="meta-links">
          Source:{" "}
          <a href={githubBlobUrl("packages/videoml-cli/src/cli.ts")} target="_blank" rel="noreferrer">
            cli.ts
          </a>
        </p>
        <p>Render VideoML to MP4 with the <code>vml</code> CLI.</p>
        <pre className="code-block">
{`vml generate content/intro.babulus.xml
vml render --script src/videos/intro/intro.script.json --frames .videoml/out/intro/frames --out intro.mp4`}
        </pre>
      </Section>
    </Layout>
  );
};

export default PackagesPage;

export const Head: HeadFC = () => <title>VideoML Packages</title>;
