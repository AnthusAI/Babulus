import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section, Callout } from "../components";

const DocsPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        eyebrow="Generated Docs"
        title="API and usage documentation (coming soon)"
        subtitle="These docs will be generated from the reference player package and published here."
      />

      <Section>
        <h2>What will live here</h2>
        <ul>
          <li>Runtime types and interfaces</li>
          <li>Player initialization and playback APIs</li>
          <li>Schema validation and tooling hooks</li>
        </ul>
      </Section>

      <Section tone="alt">
        <h2>Integration plan</h2>
        <ol>
          <li>Extract the player into its own NPM module.</li>
          <li>Generate API docs (TypeDoc or equivalent).</li>
          <li>Export Markdown/JSON and ingest into Gatsby.</li>
          <li>Publish versioned docs alongside the spec.</li>
        </ol>
        <Callout tone="info">
          This page is a placeholder until the player package is split and its
          docs can be generated automatically.
        </Callout>
      </Section>
    </Layout>
  );
};

export default DocsPage;

export const Head: HeadFC = () => <title>VideoML Docs</title>;
