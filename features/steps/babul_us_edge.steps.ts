import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let source = "";

Given("the babul.us front door template", () => {
  source = readFileSync(join(process.cwd(), "infra/babul-us-edge/template.yml"), "utf8");
});

Then("it serves babul.us over https only", () => {
  assert.match(source, /PublicHost:[\s\S]*?Default: babul\.us/);
  assert.match(source, /ViewerProtocolPolicy: redirect-to-https/);
  assert.match(source, /OriginProtocolPolicy: https-only/);
});

Then("it sends every request to the Studio's Amplify branch address", () => {
  assert.ok(source.includes('DomainName: !Sub "${BranchName}.${AmplifyAppId}.amplifyapp.com"'));
});

Then("it caches nothing", () => {
  assert.match(source, /CachePolicyId:[\s\S]*?AWS-managed CachingDisabled policy/);
  assert.ok(source.includes("CachePolicyId: !Ref CachePolicyId"));
});

Then("it creates only a CloudFront function and a distribution", () => {
  const types = [...source.matchAll(/^\s+Type: (AWS::\S+)$/gm)].map((match) => match[1]).sort();
  assert.deepEqual(types, ["AWS::CloudFront::Distribution", "AWS::CloudFront::Function"]);
});
