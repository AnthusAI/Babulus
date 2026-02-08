import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section } from "../../components";
import { githubBlobUrl } from "../../lib/github";

const DocsIndexPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        eyebrow="Documentation"
        title="VideoML Standard, Libraries, and CLI"
        subtitle="The canonical docs for the VideoML language, the standard library, and the reference tooling."
        links={[
          { label: "View this page source", href: githubBlobUrl("apps/videoml-org/src/pages/docs/index.tsx") },
        ]}
      />

      <Section>
        <h2 className="section-title">Language Standard</h2>
        <p className="section-subtitle">
          Normative reference for the XML syntax, timing model, and runtime
          behavior.
        </p>
        <div className="grid two card-grid">
          <a className="card" href="/docs/standard">
            <h3>VideoML Standard</h3>
            <p>Syntax, timing model, VOM, events, and inline behavior.</p>
          </a>
          <a className="card alt" href="/specs">
            <h3>Draft Spec Overview</h3>
            <p>High-level concepts and the conceptual model.</p>
          </a>
        </div>
      </Section>

      <Section tone="alt">
        <h2 className="section-title">Tooling</h2>
        <p className="section-subtitle">
          Reference implementations that validate the spec and make it usable.
        </p>
        <div className="grid two card-grid">
          <a className="card" href="/docs/cli">
            <h3>CLI Reference</h3>
            <p>Generate assets, render frames, and encode MP4s.</p>
          </a>
          <a className="card alt" href="/player">
            <h3>Reference Player</h3>
            <p>Canonical runtime for playback, inspection, and tooling.</p>
          </a>
        </div>
      </Section>

      <Section>
        <h2 className="section-title">Standard Library</h2>
        <p className="section-subtitle">
          Layouts, typefaces, colors, and UI components for building on-brand
          VideoML scenes.
        </p>
        <div className="grid two card-grid">
          <a className="card" href="/docs/stdlib#layouts">
            <h3>Layouts</h3>
            <p>Full-frame structures that define regions and composition.</p>
          </a>
          <a className="card alt" href="/docs/stdlib#components">
            <h3>Components</h3>
            <p>Title slides, callouts, lower thirds, and more.</p>
          </a>
        </div>
      </Section>

      <Section tone="alt">
        <h2 className="section-title">NPM Packages</h2>
        <p className="section-subtitle">
          Published modules for embedding, building, and rendering VideoML.
        </p>
        <div className="grid two card-grid">
          <a className="card" href="/docs/packages#videoml-player">
            <h3>@videoml/player</h3>
            <p>Web preview player and runtime mounting.</p>
          </a>
          <a className="card alt" href="/docs/packages#videoml-stdlib">
            <h3>@videoml/stdlib</h3>
            <p>Design system primitives and reusable components.</p>
          </a>
          <a className="card" href="/docs/packages#videoml-cli">
            <h3>@videoml/cli</h3>
            <p>CLI for generating and rendering VideoML outputs.</p>
          </a>
        </div>
      </Section>
    </Layout>
  );
};

export default DocsIndexPage;

export const Head: HeadFC = () => <title>VideoML Docs</title>;
