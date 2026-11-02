import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section, Callout } from "../components";

const SpecsPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        eyebrow="Specification"
        title="VideoML Draft Specification v0.1"
        subtitle="A high-level view of the schema and conceptual model. Detailed reference pages will expand each section."
      />

      <Section>
        <h2>Core Concepts</h2>
        <ul>
          <li>Compositions, scenes, and cues</li>
          <li>Temporal layout and duration resolution</li>
          <li>Reusable components and metadata</li>
        </ul>
        <Callout tone="info">
          Draft content placeholder: this section will include formal definitions
          and canonical examples.
        </Callout>
      </Section>

      <Section tone="alt">
        <h2>Components</h2>
        <ul>
          <li>Visual components: text, shapes, images, video</li>
          <li>Audio components: voice, music, effects</li>
          <li>Bindings and parameterization</li>
        </ul>
        <Callout tone="warn">
          Draft content placeholder: element reference tables and attribute
          semantics will live here.
        </Callout>
      </Section>

      <Section>
        <h2>Timing & Layout</h2>
        <ul>
          <li>Cues as the atomic timing unit</li>
          <li>Relative timing and nested timing scopes</li>
          <li>Timeline resolution and constraints</li>
        </ul>
        <Callout tone="info">
          Draft content placeholder: timing model, rules, and examples.
        </Callout>
      </Section>

      <Section tone="alt">
        <h2>Video Object Model (VOM)</h2>
        <p>
          The VOM describes the runtime representation of VideoML for players,
          renderers, and tooling.
        </p>
        <Callout tone="info">
          Draft content placeholder: VOM types and runtime lifecycle.
        </Callout>
      </Section>
    </Layout>
  );
};

export default SpecsPage;

export const Head: HeadFC = () => <title>VideoML Spec</title>;
