export const testCoverageDoc = {
  "slug": [
    "test-coverage"
  ],
  "title": "Test Coverage Monitoring",
  "description": "Test Coverage Monitoring",
  "category": "Quality",
  "html": "<h1 id=\"test-coverage-monitoring\">Test Coverage Monitoring</h1>\n<h2 id=\"goals\">Goals</h2>\n<ul>\n<li>Track coverage for core runtime code in <code>src/</code> and <code>packages/</code>.</li>\n<li>Use coverage gaps to prioritize test work, especially for spend-critical paths (pricing, telemetry, rendering).</li>\n</ul>\n<h2 id=\"how-to-run\">How to run</h2>\n<ul>\n<li><code>npm run bdd</code> (coverage included)</li>\n<li><code>npm test</code> (coverage included)</li>\n<li><code>npm run coverage</code> (alias)</li>\n<li><code>npm run bdd:watch</code> (coverage after each run)</li>\n</ul>\n<p>Outputs:</p>\n<ul>\n<li><code>coverage/lcov.info</code></li>\n<li><code>coverage/coverage-summary.json</code></li>\n</ul>\n<h2 id=\"prioritization-workflow\">Prioritization workflow</h2>\n<ul>\n<li>After each feature batch, run coverage and list files at 0–30% coverage.</li>\n<li>Add BDD scenarios for the lowest‑coverage files that affect correctness or costs first.</li>\n<li>Record periodic baselines by copying <code>coverage/coverage-summary.json</code> into <code>docs/baselines/coverage-YYYYMMDD.json</code>.</li>\n</ul>"
} as const;
