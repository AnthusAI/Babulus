import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Given, Then, When } from "@cucumber/cucumber";
import { NextRequest } from "next/server";
import { App, Stack } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { Code } from "aws-cdk-lib/aws-lambda";
import { CLI_LOOPBACK_CALLBACK } from "../../apps/studio-web/amplify/cli-login/callbacks.js";
import { CLI_LOGIN_VERSION, bundleCliLoginBroker } from "../../apps/studio-web/amplify/cli-login/bundle.js";
import { addCliRemoteLogin, planCliApiEndpoint, planCliRemoteLogin } from "../../apps/studio-web/amplify/cli-login/remote-login.js";
import { handleCliLoginDiscovery } from "../../apps/studio-web/lib/cli-login-discovery.js";
import { handleCliLoginPage, type ForwardedRequest, type ForwardedResponse } from "../../apps/studio-web/lib/cli-login-pages.js";
import type { CliLoginOutputs } from "../../apps/studio-web/lib/cli-login-outputs.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const origin = "https://studio.example.test";
const api = "https://jobs.example.test/prod";
// Synthetic values, assembled so no fixture looks like a real account or pool.
const account = "1".repeat(12);
const poolId = ["us-east-1", "Synthetic"].join("_");
const pagesArn = `arn:aws:lambda:us-east-1:${account}:function:example-pages`;
const invokerRoleArn = `arn:aws:iam::${account}:role/example-compute-role`;

let outputs: CliLoginOutputs | null = null;
let answer: { status: number; body: Record<string, unknown> } = { status: 0, body: {} };
let pagesConfigured = false;
let pagesMode: "ok" | "fail" = "ok";
let calls: { arn: string; request: ForwardedRequest }[] = [];
let pageResponse: Response | null = null;
let planError = "";
let plan: unknown;
let template: Template | null = null;
let stack: Stack | null = null;
let pipCalls: string[][] = [];

const baseOutputs = (redirects: string[], cliLogin: NonNullable<CliLoginOutputs["custom"]>["cliLogin"]): CliLoginOutputs => ({
  auth: {
    user_pool_id: poolId,
    user_pool_client_id: "synthetic-web-client",
    aws_region: "us-east-1",
    oauth: { domain: "babulus-example.auth.us-east-1.amazoncognito.com", redirect_sign_in_uri: redirects },
  },
  custom: { cliLogin },
});

Given("a deployed backend whose web app client registers the command's loopback return URL", () => {
  outputs = baseOutputs([CLI_LOOPBACK_CALLBACK], { apiEndpoint: api, appOrigin: origin });
});
Given("a deployed backend whose web app client does not register the command's loopback return URL", () => {
  outputs = baseOutputs([`${origin}/`], { apiEndpoint: api, appOrigin: origin });
});
Given("a deployed backend that published no jobs API endpoint", () => {
  outputs = baseOutputs([CLI_LOOPBACK_CALLBACK], { appOrigin: origin });
});
Given("a deployed backend with a remote sign-in broker and a web app client that registers its callback", () => {
  outputs = baseOutputs([CLI_LOOPBACK_CALLBACK, `${origin}/cli/callback`], {
    apiEndpoint: api, appOrigin: origin, brokerEndpoint: "https://broker.example.test/", remoteCallbackUri: `${origin}/cli/callback`, pagesFunctionArn: pagesArn,
  });
});
Given("a deployed backend with a remote sign-in broker whose callback is on another host", () => {
  outputs = baseOutputs([CLI_LOOPBACK_CALLBACK, "https://elsewhere.example.test/cli/callback"], {
    apiEndpoint: api, appOrigin: origin, brokerEndpoint: "https://broker.example.test/", remoteCallbackUri: "https://elsewhere.example.test/cli/callback", pagesFunctionArn: pagesArn,
  });
});

When("the command asks for \\/.well-known\\/babulus-cli.json", async () => {
  const response = handleCliLoginDiscovery({ readOutputs: () => outputs });
  answer = { status: response.status, body: (await response.json()) as Record<string, unknown> };
});

Then("the answer names the Studio as the publication", () => {
  assert.equal(answer.status, 200);
  assert.equal(answer.body.publication, origin);
});
Then("the answer names the Cognito issuer, client, hosted-UI domain and the jobs API", () => {
  assert.equal(answer.body.issuer, `https://cognito-idp.us-east-1.amazonaws.com/${poolId}`);
  assert.equal(answer.body.client_id, "synthetic-web-client");
  assert.equal(answer.body.oauth_domain, "https://babulus-example.auth.us-east-1.amazoncognito.com");
  assert.equal(answer.body.api_endpoint, api);
  assert.equal(answer.body.callback_uri, CLI_LOOPBACK_CALLBACK);
});
Then("the answer holds no secret and no remote sign-in values", () => {
  assert.deepEqual(Object.keys(answer.body).sort(), ["api_endpoint", "callback_uri", "client_id", "issuer", "oauth_domain", "publication"]);
});
Then("the answer is a 404 that says the Studio does not register the command's sign-in callback", () => {
  assert.equal(answer.status, 404);
  assert.equal(answer.body.error, "cli_login_not_configured");
  assert.match(String(answer.body.message), /does not register the command's sign-in callback/);
});
Then("the answer names the broker and the Studio's own \\/cli\\/callback page", () => {
  assert.equal(answer.body.broker_endpoint, "https://broker.example.test/");
  assert.equal(answer.body.remote_callback_uri, `${origin}/cli/callback`);
});
Then("the answer holds no remote sign-in values", () => {
  assert.equal(answer.status, 200);
  assert.equal("broker_endpoint" in answer.body, false);
  assert.equal("remote_callback_uri" in answer.body, false);
});

// ---- the approval pages forwarder ----

const approved: ForwardedResponse = {
  status: 303,
  headers: [["Location", "https://auth.example.test/authorize"], ["Set-Cookie", "a=1; HttpOnly"], ["Set-Cookie", "b=2; HttpOnly"]],
  body: "",
};

async function open(request: NextRequest): Promise<void> {
  calls = [];
  pageResponse = await handleCliLoginPage(request, {
    readOutputs: () => (pagesConfigured ? { custom: { cliLogin: { pagesFunctionArn: pagesArn } } } : { custom: { cliLogin: null } }),
    invoke: async (arn, forwarded) => {
      calls.push({ arn, request: forwarded });
      if (pagesMode === "fail") throw new Error("boom: internal detail");
      return approved;
    },
  });
}

Given("a deployed backend with a remote sign-in pages function", () => { pagesConfigured = true; pagesMode = "ok"; });
Given("a deployed backend without a remote sign-in pages function", () => { pagesConfigured = false; pagesMode = "ok"; });
Given("a deployed backend with a remote sign-in pages function that fails", () => { pagesConfigured = true; pagesMode = "fail"; });

When("a browser opens the approval page with a sign-in code in the query", async () => {
  await open(new NextRequest("http://internal.invalid/cli/approve?t=abc"));
});
When("a browser posts an approval form larger than 64 KiB", async () => {
  await open(new NextRequest("http://internal.invalid/cli/approve?t=abc", { method: "POST", body: "x=".concat("y".repeat(70 * 1024)), headers: { "content-type": "application/x-www-form-urlencoded" } }));
});

Then("the pages function is invoked once with the same method, path and query", () => {
  assert.equal(calls.length, 1);
  assert.equal(calls[0].arn, pagesArn);
  assert.equal(calls[0].request.method, "GET");
  assert.equal(calls[0].request.path, "/cli/approve");
  assert.deepEqual(calls[0].request.query, { t: "abc" });
});
Then("the browser receives the pages function's status, headers and body", () => {
  assert.ok(pageResponse);
  assert.equal(pageResponse.status, 303);
  assert.equal(pageResponse.headers.get("location"), "https://auth.example.test/authorize");
  assert.deepEqual(pageResponse.headers.getSetCookie(), ["a=1; HttpOnly", "b=2; HttpOnly"]);
});
Then("the answer is a 404 that says the Studio has not switched on remote CLI login", async () => {
  assert.ok(pageResponse);
  assert.equal(pageResponse.status, 404);
  assert.match(String((await pageResponse.json()).message), /has not switched on remote CLI login/);
});
Then("no function is invoked", () => { assert.equal(calls.length, 0); });
Then("the answer is a 503 with a plain message to try the approval link again", async () => {
  assert.ok(pageResponse);
  assert.equal(pageResponse.status, 503);
  const text = await pageResponse.text();
  assert.match(text, /try the approval link again/i);
  assert.doesNotMatch(text, /boom|internal detail/);
});
Then("the answer is a 413 and no function is invoked", () => {
  assert.ok(pageResponse);
  assert.equal(pageResponse.status, 413);
  assert.equal(calls.length, 0);
});

// ---- planning ----

When("the backend plan is made with remote sign-in switched off", () => {
  plan = planCliRemoteLogin(false, { BABULUS_APP_ORIGIN: origin, BABULUS_CLI_INVOKER_ROLE_ARN: invokerRoleArn });
});
Then("there is no remote sign-in plan", () => { assert.equal(plan, undefined); });

function failure(action: () => unknown): string {
  try { action(); } catch (error) { return (error as Error).message; }
  return "";
}
When("the backend plan is made with remote sign-in on but the Studio origin is {string}", (value: string) => {
  planError = failure(() => planCliRemoteLogin(true, { BABULUS_APP_ORIGIN: value, BABULUS_CLI_INVOKER_ROLE_ARN: invokerRoleArn }));
});
Then("planning fails and says the origin must be a plain https origin", () => { assert.match(planError, /plain https origin/); });
When("the backend plan is made with remote sign-in on but no compute role", () => {
  planError = failure(() => planCliRemoteLogin(true, { BABULUS_APP_ORIGIN: origin }));
});
Then("planning fails and says the compute role is needed", () => { assert.match(planError, /BABULUS_CLI_INVOKER_ROLE_ARN/); });
When("the jobs API endpoint is {string}", (value: string) => {
  planError = failure(() => planCliApiEndpoint({ BABULUS_JOBS_API_ENDPOINT: value }));
});
Then("planning the jobs API fails and says it must be a plain https URL", () => { assert.match(planError, /plain https URL/); });

// ---- the stack ----

function synth(alarmTopicArn?: string): void {
  const app = new App();
  stack = new Stack(app, "CliRemoteLogin", { env: { account, region: "us-east-1" } });
  addCliRemoteLogin(stack, {
    plan: planCliRemoteLogin(true, { BABULUS_APP_ORIGIN: origin, BABULUS_CLI_INVOKER_ROLE_ARN: invokerRoleArn })!,
    clientId: "synthetic-web-client",
    apiEndpoint: api,
    authorizeEndpoint: "https://babulus-example.auth.us-east-1.amazoncognito.com/oauth2/authorize",
    product: "Babulus (studio.example.test)",
    brokerCode: Code.fromInline("def lambda_handler(event, context): return {}"),
    pagesCode: Code.fromInline("def handler(event, context): return {}"),
    alarmTopicArn,
  });
  template = Template.fromStack(stack);
}
Given("a synthesized remote sign-in stack", () => { synth(`arn:aws:sns:us-east-1:${account}:example-topic`); });
Given("a synthesized remote sign-in stack with no alarm topic", () => { synth(); });

Then("the broker's function URL takes no credentials", () => {
  template!.hasResourceProperties("AWS::Lambda::Url", { AuthType: "NONE" });
});
Then("the public permissions cover only calls through that URL", () => {
  template!.hasResourceProperties("AWS::Lambda::Permission", { Action: "lambda:InvokeFunctionUrl", Principal: "*", FunctionUrlAuthType: "NONE" });
  template!.hasResourceProperties("AWS::Lambda::Permission", { Action: "lambda:InvokeFunction", Principal: "*", InvokedViaFunctionUrl: true });
});
Then("the broker may be invoked directly only by the pages function's role", () => {
  const permissions = Object.values(template!.findResources("AWS::Lambda::Permission")) as { Properties: Record<string, unknown> }[];
  const direct = permissions.filter((p) => p.Properties.Action === "lambda:InvokeFunction" && p.Properties.Principal !== "*" && p.Properties.InvokedViaFunctionUrl === undefined);
  const principals = direct.map((p) => JSON.stringify(p.Properties.Principal));
  assert.ok(principals.some((text) => text.includes("PagesServiceRole")), "the pages function's role may invoke the broker");
  assert.ok(principals.every((text) => text.includes("PagesServiceRole") || text.includes(invokerRoleArn)));
});
Then("the pages function may be invoked only by the Studio's compute role", () => {
  template!.hasResourceProperties("AWS::Lambda::Permission", { Action: "lambda:InvokeFunction", Principal: invokerRoleArn });
});
Then("the broker may touch only its own table and has reserved concurrency", () => {
  template!.hasResourceProperties("AWS::DynamoDB::Table", { BillingMode: "PAY_PER_REQUEST", TimeToLiveSpecification: { AttributeName: "expires_at", Enabled: true } });
  template!.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: { Statement: Match.arrayWith([Match.objectLike({ Action: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"], Effect: "Allow" })]) },
  });
  template!.hasResourceProperties("AWS::Lambda::Function", { Handler: "cli_login.broker.handler.lambda_handler", ReservedConcurrentExecutions: 10 });
});
Then("the broker serves only the jobs API as its target", () => {
  const functions = Object.values(template!.findResources("AWS::Lambda::Function")) as { Properties: { Handler: string; Environment?: { Variables: Record<string, unknown> } } }[];
  const broker = functions.find((f) => f.Properties.Handler.startsWith("cli_login.broker"))!;
  assert.equal(JSON.stringify(broker.Properties.Environment!.Variables.BROKER_TARGETS), JSON.stringify(`["${api}"]`));
  assert.equal(broker.Properties.Environment!.Variables.BROKER_CLIENT_ID, "synthetic-web-client");
});
Then("two alarms watch the start ceiling and throttling", () => {
  template!.resourceCountIs("AWS::CloudWatch::Alarm", 2);
  template!.hasResourceProperties("AWS::Logs::MetricFilter", { MetricTransformations: [Match.objectLike({ MetricName: "StartCeilingReached" })] });
});
Then("synthesis warns that the broker alarms notify nobody", () => {
  const warnings = Annotations.fromStack(stack!).findWarning("*", Match.stringLikeRegexp("notify nobody"));
  assert.equal(warnings.length, 1);
});

// ---- the pin ----

Then("the stack's cli-login version equals the version the command pins", () => {
  const pyproject = fs.readFileSync(path.join(repo, "packages/speech/pyproject.toml"), "utf8");
  assert.ok(pyproject.includes(`"cli-login==${CLI_LOGIN_VERSION}"`) || pyproject.includes(`cli-login[linux]==${CLI_LOGIN_VERSION}`), "pyproject pins the same cli-login");
});
Then("installing the broker bundle installs exactly that release without dependencies", () => {
  pipCalls = [];
  bundleCliLoginBroker("/unused", (_python, args) => { pipCalls.push(args); });
  assert.equal(pipCalls.length, 1);
  assert.ok(pipCalls[0].includes(`cli-login==${CLI_LOGIN_VERSION}`));
  assert.ok(pipCalls[0].includes("--no-deps"));
});
