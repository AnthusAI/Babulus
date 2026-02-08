import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { Layout, Hero, Section, Callout } from "../../components";
import { githubBlobUrl } from "../../lib/github";

const VmlStandardPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      <Hero
        eyebrow="Standard"
        title="VideoML Language Standard"
        subtitle="Declarative XML for time-based scenes, cues, and media. Draft v0.1."
        links={[
          { label: "View page source", href: githubBlobUrl("apps/videoml-org/src/pages/docs/standard.tsx") },
          { label: "View parser (xml.ts)", href: githubBlobUrl("packages/videoml-player/src/xml.ts") },
          { label: "View web component", href: githubBlobUrl("packages/videoml-player/src/web-component.ts") },
        ]}
      />

      <Section>
        <h2>Canonical Root</h2>
        <p>
          Every VideoML document starts with <code>&lt;vml&gt;</code>. The root
          describes video metadata and declares the timeline.
        </p>
        <pre className="code-block">
{`<vml id="intro" title="Intro" fps="30" width="1920" height="1080">
  <scene id="scene-1">
    <cue id="line-1"><voice>Hello world.</voice></cue>
  </scene>
</vml>`}
        </pre>
        <Callout tone="info">
          VideoML treats time as a layout axis. Add a scene and the video grows
          in time, just like adding a div grows a page in space.
        </Callout>
      </Section>

      <Section tone="alt">
        <h2>Temporal Layout</h2>
        <ul>
          <li><strong>sequence</strong> plays children back-to-back.</li>
          <li><strong>stack</strong> plays children in parallel.</li>
          <li><strong>duration</strong> accepts frames (f), seconds (s), or ms.</li>
        </ul>
        <pre className="code-block">
{`<sequence>
  <scene duration="3s">...</scene>
  <scene duration="2s">...</scene>
</sequence>

<stack>
  <layer duration="10s">...</layer>
  <audio src="music.wav" duration="8s" />
</stack>`}
        </pre>
      </Section>

      <Section>
        <h2>Scenes, Cues, and Voice</h2>
        <p>
          Scenes are the top-level timeline segments. Cues are the atomic timing
          units inside a scene. Voice cues synthesize narration when rendering.
        </p>
        <pre className="code-block">
{`<scene id="overview">
  <cue id="intro">
    <voice>Hello. This is a cue.</voice>
  </cue>
  <cue id="detail" start="intro.end + 0.5s">
    <voice>Timed relative to the previous cue.</voice>
  </cue>
</scene>`}
        </pre>
      </Section>

      <Section tone="alt">
        <h2>Timeline API</h2>
        <p>
          Players expose a timeline object with frame/time state and events for
          scene/cue transitions.
        </p>
        <pre className="code-block">
{`window.timeline.frame
window.timeline.time

window.addEventListener('scene:start', (e) => {
  console.log(e.detail.sceneId)
})`}
        </pre>
      </Section>

      <Section>
        <h2>Inline Scripts</h2>
        <p>
          Inline scripts may listen to timeline events or mutate the VOM. The
          player re-binds handlers when DOM changes are detected.
        </p>
        <pre className="code-block">
{`<vml>
  <script>
    window.addEventListener('cue:start', (e) => {
      console.log('Cue started', e.detail.cueId)
    })
  </script>
</vml>`}
        </pre>
      </Section>
    </Layout>
  );
};

export default VmlStandardPage;

export const Head: HeadFC = () => <title>VideoML Standard</title>;
