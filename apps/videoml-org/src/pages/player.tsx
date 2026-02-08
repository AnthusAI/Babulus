import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section, Callout } from "../components";

const PlayerPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        eyebrow="Reference Player"
        title="A canonical implementation of the VideoML runtime"
        subtitle="The reference player validates the spec by providing a portable runtime model for playback, inspection, and tooling."
      />

      <Section>
        <h2>Responsibilities</h2>
        <ul>
          <li>Parse VideoML into a stable runtime object model</li>
          <li>Resolve timing, cues, and scene boundaries</li>
          <li>Expose inspection APIs for tools and validators</li>
          <li>Provide consistent playback behavior</li>
        </ul>
      </Section>

      <Section tone="alt">
        <h2>NPM Module (planned)</h2>
        <p>
          The player will be factored out of Babulus as a standalone package.
          This site will link to the module and its API docs when available.
        </p>
        <Callout tone="warn">
          Placeholder: module name, release cadence, and API surface are
          currently in planning.
        </Callout>
      </Section>
    </Layout>
  );
};

export default PlayerPage;

export const Head: HeadFC = () => <title>VideoML Player</title>;
