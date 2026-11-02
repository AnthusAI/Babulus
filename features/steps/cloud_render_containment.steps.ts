import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const amplifyFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), "apps/studio-web/amplify", relativePath), "utf8");

const modelAuthorization = (schema: string, model: string) => {
  const start = schema.search(new RegExp(`^\\s*${model}: schema`, "m"));
  assert.notEqual(start, -1, `${model} model not found`);
  const auth = schema.indexOf(".authorization(", start);
  const end = schema.indexOf("\n    .", auth + 1);
  const close = schema.indexOf("\n\n", auth);
  return schema.slice(auth, end === -1 ? close : Math.min(end, close));
};

let source = "";

Given("the Studio backend definition", () => {
  source = amplifyFile("backend.ts");
});

Given("the Studio data schema", () => {
  source = amplifyFile("data/resource.ts");
});

// Comments explain what was removed; only code counts.
const withoutComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

Then("it imports no ECS, EC2, ECR or Batch constructs", () => {
  assert.doesNotMatch(
    withoutComments(source),
    /aws-cdk-lib\/aws-(ecs|ec2|ecr|batch)|FargateTaskDefinition|ecs\.Cluster/,
  );
});

Then("it grants no permission to run tasks or submit batch jobs", () => {
  assert.doesNotMatch(withoutComments(source), /ecs:RunTask|batch:SubmitJob|iam:PassRole/);
});

Then("it attaches no event source to any table", () => {
  assert.doesNotMatch(
    withoutComments(source),
    /DynamoEventSource|addEventSource|aws-lambda-event-sources/,
  );
});

Then("it creates no worker user, no custom resource and no password parameter", () => {
  assert.doesNotMatch(
    withoutComments(source),
    /CustomResource|custom-resources|AdminCreateUser|StringParameter|WORKER_PASSWORD|WORKER_EMAIL/,
  );
});

Then("none of the old render path files exist", () => {
  const gone = [
    "src/worker-ecs.ts",
    "src/worker-cloud.ts",
    "Dockerfile",
    "Dockerfile.render-worker",
    "scripts/deploy-ecs-infrastructure.sh",
    "apps/studio-web/amplify/functions/render-trigger",
    "apps/studio-web/amplify/functions/render-worker-credential",
  ];
  for (const path of gone) {
    assert.equal(existsSync(join(process.cwd(), path)), false, `${path} should be removed`);
  }
});

Given("the Studio web source", () => {
  try {
    source = execFileSync(
      "git",
      ["grep", "-h", "-E", "kind: *['\"]render['\"]", "--", "apps/studio-web", ":!apps/studio-web/tests"],
      { encoding: "utf8" },
    );
  } catch (error) {
    // git grep exits 1 when nothing matches, which is the passing case.
    if ((error as { status?: number }).status !== 1) throw error;
    source = "";
  }
});

Then("no code creates a job of kind {string}", (_kind: string) => {
  assert.equal(source.trim(), "");
});

Then("the {string} model allows signed-in users", (model: string) => {
  assert.match(modelAuthorization(source, model), /allow\.authenticated\(\)/);
});

Then("no model allows a public API key", () => {
  assert.doesNotMatch(source, /publicApiKey/);
});

Then("the data API does not create an API key", () => {
  assert.doesNotMatch(source, /apiKeyAuthorizationMode/);
});

Given("the Studio application source", () => {
  source = execFileSync("git", ["grep", "-h", "authMode", "--", "apps/studio-web", "src", "scripts"], {
    encoding: "utf8",
  });
});

Then("no request uses the API key authorization mode", () => {
  assert.doesNotMatch(source, /apiKey/);
});
