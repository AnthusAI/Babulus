import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
let files: Record<string, string> = {};

const amplifySources = (directory = ""): string[] => {
  const root = join(process.cwd(), "apps/studio-web/amplify", directory);
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) return amplifySources(relative);
    return /\.(ts|js|mjs)$/.test(entry.name) ? [relative] : [];
  });
};

// The whole Amplify backend: backend.ts and every function, resource and
// helper beside it, so compute cannot hide in a file backend.ts imports.
Given("the Studio backend definition", () => {
  files = Object.fromEntries(amplifySources().map((file) => [file, amplifyFile(file)]));
  source = Object.values(files).join("\n");
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

// The one function allowed is the sealing parameter's inline creator in `session-secret/`; schedules are rejected everywhere.
Then("it defines no function and no schedule", () => {
  const outsideSealing = Object.entries(files)
    .filter(([file]) => !file.startsWith("session-secret/"))
    .map(([, text]) => text)
    .join("\n");
  assert.doesNotMatch(
    withoutComments(outsideSealing),
    /defineFunction|NodejsFunction|lambda\.Function|aws-events|events\.Rule|Schedule\.|aws-cdk-lib\/aws-lambda/,
  );
  assert.doesNotMatch(withoutComments(source), /aws-events|events\.Rule|Schedule\.|defineFunction|NodejsFunction/);
});



// `AdminCreateUser` is the call that makes a worker user; the pool setting `allowAdminCreateUserOnly` (closing self
// sign-up) is not, so `Only` is excluded. A worker user or password is rejected everywhere. The one custom resource the
// backend may have is the generated cookie sealing parameter, so custom resources and SSM string parameters are
// rejected everywhere except in `session-secret/`.
const WORKER_CREDENTIAL_PATTERN = /AdminCreateUser(?!Only)|WORKER_PASSWORD|WORKER_EMAIL/;
const INFRA_PATTERN = /CustomResource|custom-resources|StringParameter/;
const SEALING_FOLDER = "session-secret/";

const credentialViolations = (): string[] =>
  Object.entries(files).flatMap(([file, text]) => {
    const code = withoutComments(text);
    const found: string[] = [];
    if (WORKER_CREDENTIAL_PATTERN.test(code)) found.push(`${file}: worker user or password`);
    if (!file.startsWith(SEALING_FOLDER) && INFRA_PATTERN.test(code)) found.push(`${file}: custom resource or parameter`);
    return found;
  });

Then("it creates no worker user, no custom resource and no password parameter", () => {
  assert.deepEqual(credentialViolations(), []);
});

Given("a backend definition that creates a worker user, a custom resource and a password parameter", () => {
  files = {
    "backend.ts": [
      "new cr.AwsCustomResource(stack, 'MakeUser', { onCreate: { action: 'AdminCreateUser' } });",
      "new ssm.StringParameter(stack, 'Pw', { parameterName: 'WORKER_PASSWORD' });",
      "const email = process.env.WORKER_EMAIL;",
    ].join("\n"),
  };
});

Given("a backend definition that only closes self sign-up on the user pool", () => {
  files = { "auth/resource.ts": "userPool.adminCreateUserConfig = { allowAdminCreateUserOnly: true };" };
});

Given("a backend definition whose sealing folder also makes a worker user", () => {
  files = { "session-secret/handler.ts": "const params = { Action: 'AdminCreateUser' }; new CustomResource(this, 'R', {});" };
});

Given("a backend definition with a custom resource outside the sealing folder", () => {
  files = { "other/thing.ts": "new CustomResource(this, 'R', {});" };
});

Then("the worker credential guard rejects it", () => {
  assert.notDeepEqual(credentialViolations(), []);
});

Then("the worker credential guard accepts it", () => {
  assert.deepEqual(credentialViolations(), []);
});

Then("none of the old render path files exist", () => {
  const gone = [
    "src/worker-ecs.ts",
    "src/worker-cloud.ts",
    "src/worker-lib.ts",
    "apps/studio-web/amplify/functions",
    "apps/studio-web/app/api/render",
    "apps/studio-web/components/studio-workspace.tsx",
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
      ["grep", "-h", "-E", "kind: *['\"]render['\"]", "--", "apps/studio-web", ":!apps/studio-web/tests", ":!apps/studio-web/lib/__tests__"],
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
