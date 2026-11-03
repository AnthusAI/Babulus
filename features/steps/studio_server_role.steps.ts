import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let source = "";

const allowedActions = () =>
  [...source.matchAll(/^\s+(?:- |Action: )([a-z0-9-]+:[A-Za-z*]+)$/gm)].map((match) => match[1]).filter((action) => action !== "sts:AssumeRole").sort();

Given("the Studio server role template", () => {
  source = readFileSync(join(process.cwd(), "infra/studio-server-role/template.yml"), "utf8");
});

Then("the role allows only Prospectus calls, one secret, Account groups and Account files", () => {
  assert.deepEqual(allowedActions(), [
    "cognito-idp:AdminAddUserToGroup",
    "cognito-idp:AdminListGroupsForUser",
    "cognito-idp:AdminRemoveUserFromGroup",
    "cognito-idp:CreateGroup",
    "execute-api:Invoke",
    "s3:DeleteObject",
    "s3:GetObject",
    "s3:ListBucket",
    "s3:PutObject",
    "ssm:GetParameter",
  ]);
});

Then("the role allows nothing that starts compute", () => {
  assert.doesNotMatch(source, /(ecs|batch|ec2|lambda|states|bedrock):/);
  assert.doesNotMatch(source, /iam:PassRole/);
});

Then("object access is limited to the org and published paths of the assets bucket", () => {
  assert.match(source, /\$\{AssetsBucketName\}\/org\/\*/);
  assert.match(source, /\$\{AssetsBucketName\}\/published\/\*/);
  assert.doesNotMatch(source, /\$\{AssetsBucketName\}\/\*/);
});

Then("only the Amplify service can assume the role", () => {
  assert.match(source, /Service: amplify\.amazonaws\.com/);
  assert.equal((source.match(/sts:AssumeRole/g) ?? []).length, 1);
});
