import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Given, Then, When } from "@cucumber/cucumber";
import { SEALING_PARAMETER_HANDLER_SOURCE } from "../../apps/studio-web/amplify/session-secret/handler-source.js";
import { sealingParameterName } from "../../apps/studio-web/amplify/session-secret/naming.js";
import { resetProspectusSessionSecretCache, resolveProspectusSignInRuntime } from "../../apps/studio-web/lib/prospectus/session.js";

const studioWeb = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../apps/studio-web");
const nodeRequire = createRequire(import.meta.url);

// ---------------------------------------------------------------- the creating function, against a fake SSM

class FakePutParameterCommand {
  constructor(readonly input: Record<string, any>) {}
}

const handlerModule: { createHandler: (ssm: unknown, command: unknown) => (event: any) => Promise<any> } = (() => {
  const moduleShim = { exports: {} as any };
  new Function("require", "exports", "module", SEALING_PARAMETER_HANDLER_SOURCE)(nodeRequire, moduleShim.exports, moduleShim);
  return moduleShim.exports;
})();

const NAME = "/babulus/studio/main/prospectus-session-sealing";
let store = new Map<string, string>();
let puts: Array<Record<string, any>> = [];
let refuseWrites = false;
let result: any;
let failure: Error | null = null;
let before = "";
let calls = 0;

const fakeSsm = {
  async send(command: FakePutParameterCommand) {
    calls += 1;
    puts.push(command.input);
    if (refuseWrites) {
      const error = new Error(`denied for value ${command.input.Value}`);
      error.name = "AccessDeniedException";
      throw error;
    }
    if (store.has(command.input.Name) && command.input.Overwrite === false) {
      const error = new Error("exists");
      error.name = "ParameterAlreadyExists";
      throw error;
    }
    store.set(command.input.Name, command.input.Value);
    return {};
  },
};

function event(type: "Create" | "Update" | "Delete") {
  return {
    RequestType: type,
    PhysicalResourceId: NAME,
    ResourceProperties: { ParameterName: NAME, Description: "test", Length: "64" },
  };
}

async function run(type: "Create" | "Update" | "Delete"): Promise<void> {
  failure = null;
  try {
    result = await handlerModule.createHandler(fakeSsm, FakePutParameterCommand)(event(type));
  } catch (error) {
    failure = error as Error;
  }
}

Given("a fresh SSM Parameter Store", () => {
  store = new Map();
  puts = [];
  refuseWrites = false;
  calls = 0;
});

Given("an SSM Parameter Store that already holds the sealing parameter", () => {
  store = new Map([[NAME, "x".repeat(40)]]);
  puts = [];
  refuseWrites = false;
  calls = 0;
  before = "x".repeat(40);
});

Given("an SSM Parameter Store that refuses the write", () => {
  store = new Map();
  puts = [];
  refuseWrites = true;
  calls = 0;
});

Given("the sealing parameter is created", async () => {
  const existed = store.has(NAME);
  await run("Create");
  if (!existed) before = store.get(NAME) ?? "";
});

When("the stack is updated", async () => {
  await run("Update");
});

When("the stack is deleted", async () => {
  calls = 0;
  await run("Delete");
});

Then("the parameter is a SecureString", () => {
  assert.equal(puts[0].Type, "SecureString");
});

Then("the stored value is at least 32 characters", () => {
  assert.ok((store.get(NAME) ?? "").length >= 32);
});

Then("the creating function returned only the parameter name", () => {
  assert.deepEqual(result, { PhysicalResourceId: NAME });
});

Then("the stored value is unchanged", () => {
  assert.equal(store.get(NAME), before);
});

Then("the create request said not to overwrite", () => {
  assert.ok(puts.length > 0);
  for (const put of puts) assert.equal(put.Overwrite, false);
});

Then("the parameter still exists with the same value", () => {
  assert.equal(calls, 0, "delete must not call SSM");
  assert.equal(store.get(NAME), before);
});

Then("the creation fails with an error that does not contain the stored value", () => {
  assert.ok(failure);
  assert.ok(!failure.message.includes(puts[0].Value));
});

// ---------------------------------------------------------------- the synthesized stack

let template: { Resources: Record<string, any>; Outputs?: Record<string, any> } = { Resources: {} };

Given("the sealing stack is synthesized for the {string} branch", (branch: string) => {
  const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/synth-sealing.ts"], {
    cwd: studioWeb,
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", AWS_BRANCH: branch },
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr.slice(-1500));
  const line = /^SYNTH=(.*)$/m.exec(run.stdout);
  assert.ok(line);
  template = JSON.parse(line[1]);
});

const ofType = (type: string): any[] => Object.values(template.Resources).filter((resource: any) => resource.Type === type);

Then("the custom resource is retained on delete and on replacement", () => {
  const resources = ofType("Custom::SecureStringParameter");
  assert.equal(resources.length, 1);
  assert.equal(resources[0].DeletionPolicy, "Retain");
  assert.equal(resources[0].UpdateReplacePolicy, "Retain");
});

Then("the template has no value property for the parameter", () => {
  const properties = Object.keys(ofType("Custom::SecureStringParameter")[0].Properties).sort();
  assert.deepEqual(properties, ["Description", "Length", "ParameterName", "ServiceToken"]);
  assert.ok(!JSON.stringify(template).includes("SecureString\",\"Value"));
});

Then("the outputs are only the parameter name and its ARN", () => {
  assert.deepEqual(Object.keys(template.Outputs ?? {}).sort(), ["SessionSecretParameter", "SessionSecretParameterArn"]);
});

Then("the template has no Secrets Manager resource", () => {
  assert.deepEqual(Object.values(template.Resources).filter((resource: any) => resource.Type.startsWith("AWS::SecretsManager::")), []);
});

Then("the sealing code never mentions Secrets Manager", () => {
  const folder = path.join(studioWeb, "amplify/session-secret");
  for (const file of readdirSync(folder)) {
    assert.doesNotMatch(readFileSync(path.join(folder, file), "utf8"), /secretsmanager|SecretsManager|secrets-manager/i, file);
  }
});

Then("the only SSM permission is PutParameter on the sealing parameter", () => {
  const statements = ofType("AWS::IAM::Policy").flatMap((policy: any) => policy.Properties.PolicyDocument.Statement);
  const ssm = statements.filter((statement: any) => [].concat(statement.Action).some((action: string) => action.startsWith("ssm:")));
  assert.equal(ssm.length, 1);
  assert.deepEqual([].concat(ssm[0].Action), ["ssm:PutParameter"]);
  assert.match(JSON.stringify(ssm[0].Resource), /parameter\/babulus\/studio\/main\/prospectus-session-sealing/);
});

// ---------------------------------------------------------------- naming and discovery

let branch = "";

Given("the deployment branch is {string}", (given: string) => {
  branch = given;
});

Then("the sealing parameter name is {string}", (name: string) => {
  assert.equal(sealingParameterName({ AWS_BRANCH: branch }), name);
});

let outputs: any = null;
let storedSecret = "";
let readName: string | null = null;
let runtime: unknown;

Given("the backend outputs name the sealing parameter", () => {
  outputs = {
    auth: { user_pool_id: "pool-for-tests", oauth: { domain: "babulus-dev.auth.us-east-1.amazoncognito.com" } },
    custom: { prospectusSignIn: { clientId: "client-for-tests", callbackPath: "/api/auth/prospectus/callback", sessionSecretParameter: NAME } },
  };
  storedSecret = "s".repeat(48);
  readName = null;
  resetProspectusSessionSecretCache();
});

Given("no sealing parameter name is set in the environment", () => undefined);

Given("the stored sealing secret is too short", () => {
  storedSecret = "short";
});

When("the sign-in runtime is resolved", async () => {
  resetProspectusSessionSecretCache();
  runtime = await resolveProspectusSignInRuntime("https://studio.example.test", {
    environment: { BABULUS_PROSPECTUS_ACCOUNTS_ENDPOINT: "https://abc123.execute-api.us-east-1.amazonaws.com/api" },
    amplifyOutputs: outputs,
    readSecret: async (name) => {
      readName = name;
      return storedSecret;
    },
    transport: async () => ({}),
  });
});

Then("the secret was read from the parameter named in the outputs", () => {
  assert.equal(readName, NAME);
  assert.ok(runtime);
});

Then("the sign-in runtime is unavailable", () => {
  assert.equal(runtime, null);
});
