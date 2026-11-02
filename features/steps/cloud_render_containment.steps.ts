import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

Then("the render trigger's event source is disabled", () => {
  const eventSource = source.slice(source.indexOf("new DynamoEventSource(jobTable"));
  assert.match(eventSource, /enabled: false/);
  assert.doesNotMatch(eventSource.slice(0, eventSource.indexOf("filters:")), /enabled: true/);
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
