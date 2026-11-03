import { Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = () => readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");

/** The text of one top-level job in the CI workflow. */
function jobText(job: string): string {
  const source = workflow();
  const start = source.indexOf(`\n  ${job}:\n`);
  assert.ok(start >= 0, `the CI workflow has no "${job}" job`);
  const rest = source.slice(start + 1);
  const next = rest.slice(1).search(/\n  [a-z-]+:\n/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

Then("the {string} job runs on {string}", (job: string, runner: string) => {
  assert.match(jobText(job), new RegExp(`runs-on: ${runner}\\n`));
});

Then("the {string} job runs {string} in {string}", (job: string, command: string, directory: string) => {
  const text = jobText(job);
  const index = text.indexOf(`run: ${command}`);
  assert.ok(index >= 0, `the "${job}" job does not run ${command}`);
  assert.match(text.slice(0, index), new RegExp(`working-directory: ${directory}\\n[^]*$`));
});

Then("the {string} job writes a stub amplify_outputs.json", (job: string) => {
  assert.match(jobText(job), /cat > amplify_outputs\.json/);
});

Then("the {string} job does not use AWS credentials", (job: string) => {
  const text = jobText(job);
  assert.doesNotMatch(text, /aws-actions|role-to-assume|AWS_ACCESS_KEY|id-token/);
});

Then("the {string} job installs the Studio workspace from the lock file", (job: string) => {
  assert.match(jobText(job), /npm ci --workspace=apps\/studio-web/);
});

Then("the {string} job caches npm downloads and the Next.js build cache", (job: string) => {
  const text = jobText(job);
  assert.match(text, /cache: "npm"/);
  assert.match(text, /path: apps\/studio-web\/\.next\/cache/);
});
