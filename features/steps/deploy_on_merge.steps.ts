import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let source = "";

const deployJob = () => source.slice(source.indexOf("\n  deploy:"));

Given("the CI workflow", () => {
  source = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
});

Given("the deploy role template", () => {
  source = readFileSync(join(process.cwd(), "infra/github-deploy/template.yml"), "utf8");
});

Then("the deploy job needs the {string} job", (job: string) => {
  assert.match(deployJob(), new RegExp(`needs: ${job}\\b`));
});

Then("the deploy job runs only for a push to main", () => {
  assert.match(deployJob(), /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
});

Then("the deploy job may request a GitHub identity token", () => {
  assert.match(deployJob(), /id-token: write/);
});

Then("the deploy job takes its AWS role and app from repository variables", () => {
  assert.match(deployJob(), /role-to-assume: \$\{\{ vars\.AMPLIFY_DEPLOY_ROLE_ARN \}\}/);
  assert.match(deployJob(), /app-id: \$\{\{ vars\.AMPLIFY_APP_ID \}\}/);
});

Then("the role trusts only the main branch of this repository", () => {
  assert.match(source, /:sub: !Sub repo:AnthusAI@\$\{GitHubOwnerId\}\/Babulus@\$\{GitHubRepoId\}:ref:refs\/heads\/main\n/);
  assert.doesNotMatch(source, /StringLike/);
});

Then("the role may only start and read Amplify jobs on the main branch", () => {
  const actions = [...source.matchAll(/- (\w+:\w+)\n/g)].map((match) => match[1]).sort();
  assert.deepEqual(actions, ["amplify:GetJob", "amplify:StartJob"]);
  assert.match(source, /apps\/\$\{AmplifyAppId\}\/branches\/main\/jobs\/\*/);
});
