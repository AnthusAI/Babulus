export const componentsTypographyDoc = {
  slug: ["components", "typography"],
  title: "Typography Themes",
  description: "Named eyebrow/headline/subhead font sets that overlay any layout",
  category: "Developer Reference",
  html: `
<h1>Typography Themes</h1>
<p>Fonts are packaged as themes with three semantic roles: <code>--font-eyebrow</code>, <code>--font-headline</code>, <code>--font-subhead</code>. Apply via CSS vars or a wrapper class; layouts stay typography-agnostic.</p>

<h2>How to Apply</h2>
<pre><code>.theme-classic-news {
  --font-eyebrow: "Gill Sans", Arial, sans-serif;
  --font-headline: "Helvetica Neue", Arial, sans-serif;
  --font-subhead: Arial, sans-serif;
}</code></pre>

<h2>Live Previews</h2>
<p>Previews use the Studio preview system (no rendered MP4). Generate preview artifacts before viewing.</p>
<ul>
  <li><strong>Font Pairings Menu (A/B/C screens)</strong><br/>
    <iframe src="/docs-preview/font-pairings-menu" width="100%" height="600" style="border:0;" loading="lazy"></iframe>
  </li>
  <li><strong>Menu (typography applied to BulletListScreen)</strong><br/>
    <iframe src="/docs-preview/menu" width="100%" height="600" style="border:0;" loading="lazy"></iframe>
  </li>
</ul>

<h2>Theme Catalog (from Menu demo)</h2>
<h3>A — Broadcast Classics</h3>
<ol>
  <li><strong>Classic News</strong> — Gill Sans / Helvetica Neue Bold / Arial. Neutral news tone.</li>
  <li><strong>Authority</strong> — Franklin Gothic / Impact / Trebuchet. Urgent promos.</li>
  <li><strong>Documentary</strong> — Lucida Grande / Trebuchet / Gill Sans. Warm narration.</li>
  <li><strong>Serif Accent</strong> — Helvetica Neue / Georgia Bold / Source Sans. Trust/heritage.</li>
  <li><strong>Headline+Caption</strong> — Avenir Next / Arial Black / Segoe UI. Big caps + captions.</li>
  <li><strong>Sports Ticker</strong> — Roboto Condensed / Oswald / Inter. High-tempo tickers.</li>
  <li><strong>Debate</strong> — Verdana set. Neutral, screen-optimized.</li>
  <li><strong>Magazine</strong> — Avenir Next / Didot-Bodoni / Helvetica Neue. Elegant features.</li>
  <li><strong>Finance</strong> — Gill Sans / Futura / Segoe UI. Data clarity.</li>
  <li><strong>Weather</strong> — Nunito Sans / Montserrat / Open Sans. Friendly rounded.</li>
  <li><strong>Ticker Serif</strong> — Gill Sans / Merriweather / Source Sans. Broadcast + heritage.</li>
  <li><strong>Tech Desk</strong> — SF Pro set. Platform default.</li>
</ol>

<h3>B — Modern Sans & Slab</h3>
<ol>
  <li><strong>Modern Grotesk</strong> — Inter for all roles. UI-native.</li>
  <li><strong>Slab Partner</strong> — Roboto + Roboto Slab.</li>
  <li><strong>Humanist</strong> — Segoe UI set. Warm, readable.</li>
  <li><strong>Heritage</strong> — Helvetica eyebrow; Times headline; Arial subhead. Short quotes.</li>
  <li><strong>Condensed</strong> — Roboto Condensed / Arial Narrow / Roboto.</li>
  <li><strong>Display</strong> — Gill Sans Ultra Bold headline; Gill Sans eyebrow/sub.</li>
  <li><strong>Rounded</strong> — Nunito + Varela Round.</li>
  <li><strong>Slate</strong> — Avenir family.</li>
  <li><strong>Hybrid</strong> — Montserrat eyebrow/sub; Playfair headline.</li>
  <li><strong>Geo Sans</strong> — Poppins set.</li>
  <li><strong>Slate Serif</strong> — Inter eyebrow/sub; Charter headline.</li>
  <li><strong>Studio Default</strong> — SF Pro set.</li>
</ol>

<h3>C — History / Cinema / Trends</h3>
<ol>
  <li><strong>History</strong> — Gill Sans eyebrow; Garamond headline; Helvetica Neue sub.</li>
  <li><strong>Cinema</strong> — Avenir eyebrow; Futura headline; Avenir sub.</li>
  <li><strong>Current Trend</strong> — Helvetica Neue set.</li>
  <li><strong>Minimal Serif</strong> — Montserrat eyebrow; Baskerville headline; Inter sub.</li>
  <li><strong>Broadcast Quote</strong> — Segoe eyebrow/sub; Merriweather headline.</li>
  <li><strong>Lower Third</strong> — Franklin Gothic set.</li>
  <li><strong>Pop Culture</strong> — Montserrat eyebrow; Bebas Neue headline; Open Sans sub.</li>
  <li><strong>Luxury</strong> — Trajan headline; Optima eyebrow; Garamond sub.</li>
  <li><strong>News Quote</strong> — Gill Sans eyebrow; Georgia headline; Inter sub.</li>
  <li><strong>Data Viz</strong> — DIN set.</li>
  <li><strong>Esports</strong> — Orbitron eyebrow; Russo One headline; Roboto sub.</li>
  <li><strong>Lifestyle</strong> — Nunito eyebrow/sub; Recoleta headline.</li>
</ol>

<h2>When to Choose</h2>
<ul>
  <li><strong>Hard news / corporate:</strong> Classic News, Authority, Finance, Tech Desk.</li>
  <li><strong>Promo / hype:</strong> Authority, Display, Pop Culture, Cinema.</li>
  <li><strong>Longform / docu:</strong> Documentary, Serif Accent, Magazine, History.</li>
  <li><strong>Data / UI overlays:</strong> Tech Desk, Data Viz, Modern Grotesk, Geo Sans.</li>
<li><strong>Quotes / lower-thirds:</strong> Broadcast Quote, News Quote, Lower Third, Heritage.</li>
<li><strong>Friendly / lifestyle:</strong> Rounded, Weather, Lifestyle.</li>
</ul>
`,
};
