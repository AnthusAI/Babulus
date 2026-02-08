import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section, Callout } from "../components";

const IndexPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        pill="Draft Standard"
        eyebrow="VideoML"
        title="A declarative standard for programmable video"
        subtitle="VideoML is a proposed XML-based standard that describes scenes, timing, and media behavior in a portable, tool-agnostic way."
      />

      <Section>
        <div className="grid two">
          <div>
            <h2>Why VideoML</h2>
            <p>
              Video workflows are fragmented across timelines, templates, and
              code. VideoML proposes a shared language for describing scenes,
              cues, and render intent so tools can interoperate.
            </p>
            <p>
              The goal is a stable, readable specification that supports
              generation, playback, and long-term archival.
            </p>
          </div>
          <div>
            <h2>What it describes</h2>
            <ul>
              <li>Scenes and timelines</li>
              <li>Audio, music, and effects cues</li>
              <li>Declarative layout and timing rules</li>
              <li>Composable components and metadata</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="alt">
        <h2>Example: a minimal scene</h2>
        <p>This is a tiny example of VideoML-style structure.</p>
        <pre className="code-block">
{`<vml id="intro" fps="30" width="1920" height="1080">
  <scene id="opening" title="Hello">
    <cue id="voice">
      <voice>Welcome to VideoML.</voice>
      <pause seconds="0.4s" />
      <voice>Declarative video, finally.</voice>
    </cue>
  </scene>
</vml>`}
        </pre>
      </Section>

      <Section>
        <div className="grid two">
          <div>
            <h2>Spec first, tooling second</h2>
            <p>
              The spec is designed to be implementation-agnostic. A reference
              player will demonstrate the runtime model while other tools can
              target the same schema.
            </p>
          </div>
          <Callout tone="info">
            <strong>Next step:</strong> We are drafting the core spec and
            preparing the reference player as a standalone NPM module.
          </Callout>
        </div>
      </Section>
    </Layout>
  );
};

export default IndexPage;

export const Head: HeadFC = () => <title>VideoML</title>;
