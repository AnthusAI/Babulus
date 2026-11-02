export const introductionDoc = {
  slug: ["introduction"],
  title: "Babulus Introduction",
  description:
    "What Babulus is, what problems it solves, and who should use it",
  category: "Overview",
  html: `
<h1 id="babulus-introduction">Babulus — Introduction</h1>
<p><strong>Status:</strong> Alpha</p>

<hr />

<h2 id="the-simple-idea">The simple idea</h2>
<p>Babulus is a system that produces videos <strong>for you</strong>—reliably, repeatedly, and on schedule—without requiring you to be the bottleneck for every step.</p>
<p>Instead of “a tool you use to make videos,” it’s closer to a <strong>production machine</strong>: you decide how hands-on to be, and you step in at approval points where taste and brand judgment matter.</p>

<hr />

<h2 id="what-problem-it-solves">What problem it solves</h2>
<p>Publishing high-quality video content regularly is hard because the process is fragile:</p>
<ul>
  <li>It’s easy to lose consistency across videos (tone, pacing, visuals, music).</li>
  <li>It’s expensive to iterate (time and external services).</li>
  <li>It becomes dependent on one person who “knows how everything works.”</li>
  <li>It’s hard to outsource without losing quality, brand voice, or control.</li>
</ul>
<p>Babulus is designed to turn that into a dependable pipeline: drafts, revisions, approvals, and outputs that keep moving forward.</p>

<hr />

<h2 id="what-you-get">What you get</h2>
<p>At a practical level, Babulus produces:</p>
<ul>
  <li><strong>Consistent story structure</strong> (scenes and beats, narration-first).</li>
  <li><strong>Deterministic previews</strong> (the same inputs produce the same output, so approvals mean something).</li>
  <li><strong>Reusable assets</strong> (voice segments, SFX, music beds, rendered video outputs).</li>
  <li><strong>Portability</strong> (projects are files and folders, not locked inside a proprietary editor).</li>
  <li><strong>A machine that keeps running</strong>—you step back, and the pipeline still produces.</li>
</ul>

<hr />

<h2 id="the-core-dna-narration-first">The core DNA: narration-first</h2>
<p>Babulus is narration-first because narration is the backbone of most marketing content:</p>
<ul>
  <li>It sets pacing.</li>
  <li>It defines visual beats.</li>
  <li>It’s fast for humans to review.</li>
</ul>
<p>That means review is simpler: you can judge the story and pacing early, before you sink time into final rendering.</p>

<hr />

<h2 id="autonomy-with-approval-gates">Autonomy with approval gates</h2>
<p>The goal isn’t to remove humans. The goal is to use humans where they are uniquely valuable:</p>
<ul>
  <li><strong>Humans</strong>: brand voice, taste, messaging, approvals.</li>
  <li><strong>Agents</strong>: drafting, revisions, repetitive generation tasks, keeping the pipeline moving.</li>
</ul>
<p>So the machine runs continuously, and you step in when something needs approval or a directional correction.</p>

<hr />

<h2 id="portable-by-design">Portable by design</h2>
<p>Babulus treats projects as exportable <strong>files and folders</strong>. The intent is: you can take your work with you, and your production pipeline doesn’t disappear if you change tools or vendors.</p>
<p>This “video as code” approach is what makes the system stable, reviewable, and agent-friendly.</p>

<hr />

<h2 id="who-should-care">Who should care</h2>
<ul>
  <li><strong>Creators</strong> who want consistency and output without burnout.</li>
  <li><strong>Marketing teams</strong> who want predictable publishing and brand coherence.</li>
  <li><strong>Founders</strong> who want a scalable content engine that isn’t dependent on one person.</li>
  <li><strong>Agencies</strong> who want repeatable production with inspection and portability.</li>
</ul>

<hr />

<h2 id="what-alpha-means">What Alpha means</h2>
<p>Alpha is about validating the loop end-to-end: edit → generate → preview → render → publish.</p>
<p>The key question is not “is the plan correct?” It’s “does the system reliably produce publish-ready outputs while keeping humans out of the weeds?”</p>

<hr />

<h2 id="recommended-reading">Recommended reading</h2>
<ul>
  <li><a href="/docs/technical">Technical overview</a></li>
  <li><a href="/docs/roadmap">Roadmap</a></li>
</ul>
`.trim(),
} as const;
