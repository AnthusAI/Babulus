import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Given, Then, When } from "@cucumber/cucumber";
import { studioSchema } from "../../apps/studio-web/amplify/data/resource.ts";
import {
  AccountAccessError,
  requireAccount,
  type IdTokenVerifier,
} from "../../apps/studio-web/lib/account-authorization.ts";
import { handleAccountMediaGet } from "../../apps/studio-web/lib/account-media-route.ts";
import {
  accountIdsFromGroups,
  assertKeyInAccount,
  babulusRoleForAccountRole,
  buildAccountObjectKey,
  buildPublishedKey,
} from "../../packages/shared/src/account-scope.ts";

// Synthetic IDs for this spec only.
const uuidOf = (digit: string): string => [8, 4, 4, 4, 12].map((length) => digit.repeat(length)).join("-").replace(/^(.{14})./, "$14").replace(/^(.{19})./, "$18");
const ACCOUNT_A = uuidOf("a");
const ACCOUNT_B = uuidOf("b");
const GROUPS: Record<string, string[]> = { ada: [ACCOUNT_A], bo: [ACCOUNT_B], cy: [] };

const fill = (text: string): string => text.replaceAll("<Account A>", ACCOUNT_A).replaceAll("<Account B>", ACCOUNT_B);
const accountNamed = (name: string): string => (name === "Account A" ? ACCOUNT_A : name === "Account B" ? ACCOUNT_B : name);

type Rule = { allow: string; operations?: string[]; groupsField?: string; provider?: string };
type Field = { name: string; rules: Rule[] | null; defaultValue: string | null };
type Model = { name: string; rules: Rule[]; fields: Field[] };

const parseRules = (text: string): Rule[] =>
  [...text.matchAll(/\{([^{}]*)\}/g)].map((match) => {
    const body = match[1];
    const rule: Rule = { allow: /allow:\s*(\w+)/.exec(body)?.[1] ?? "" };
    const operations = /operations:\s*\[([^\]]*)\]/.exec(body)?.[1];
    if (operations) rule.operations = operations.split(",").map((value) => value.trim());
    const groupsField = /groupsField:\s*"([^"]+)"/.exec(body)?.[1];
    if (groupsField) rule.groupsField = groupsField;
    const provider = /provider:\s*(\w+)/.exec(body)?.[1];
    if (provider) rule.provider = provider;
    return rule;
  });

const parseModels = (sdl: string): Model[] => {
  const models: Model[] = [];
  const header = /^type (\w+) @model @auth\(rules: \[(.*)\]\)\s*\n\{\n([\s\S]*?)\n\}/gm;
  for (const match of sdl.matchAll(header)) {
    const fields: Field[] = match[3].split("\n").map((line) => {
      const rules = /@auth\(rules: \[(.*)\]\)/.exec(line);
      return {
        name: line.trim().split(":")[0],
        rules: rules ? parseRules(rules[1]) : null,
        defaultValue: /@default\(value: "([^"]*)"\)/.exec(line)?.[1] ?? null,
      };
    });
    models.push({ name: match[1], rules: parseRules(match[2]), fields });
  }
  return models;
};

/** What a rule set allows: members of the Account named by the row's field, for the operations the rule lists. */
const ruleAllows = (rules: Rule[], operation: string, rowAccount: string, groups: string[]): boolean =>
  rules.some(
    (rule) =>
      rule.allow === "groups" &&
      rule.groupsField === "orgId" &&
      (rule.operations === undefined || rule.operations.includes(operation)) &&
      groups.includes(rowAccount),
  );

let models: Model[] = [];
let sdl = "";
const model = (name: string): Model => {
  const found = models.find((candidate) => candidate.name === name);
  assert.ok(found, `model ${name} exists`);
  return found;
};

Given("Account A and Account B exist", () => {
  models = [];
});
Given("Ada is a member of Account A", () => assert.deepEqual(GROUPS.ada, [ACCOUNT_A]));
Given("Bo is a member of Account B", () => assert.deepEqual(GROUPS.bo, [ACCOUNT_B]));
Given("Cy signed in but has no Account that holds the babulus entitlement", () => assert.deepEqual(GROUPS.cy, []));

When("I read the generated data schema", () => {
  sdl = studioSchema.transform().schema;
  models = parseModels(sdl);
  assert.ok(models.length > 5, "models were parsed from the generated schema");
});

Then("the schema has no model named {string}", (name: string) => {
  assert.equal(models.find((candidate) => candidate.name === name), undefined);
  assert.equal(new RegExp(`type ${name} @model`).test(sdl), false);
});

Then("every model has exactly one rule: Account members by the {string} field", (field: string) => {
  for (const candidate of models) {
    assert.equal(candidate.rules.length, 1, `${candidate.name} has one model rule`);
    assert.deepEqual(candidate.rules[0], { allow: "groups", groupsField: field }, `${candidate.name} rule`);
  }
});

Then("no model allows every signed-in user, guests or an API key", () => {
  const allRules = models.flatMap((candidate) => [...candidate.rules, ...candidate.fields.flatMap((field) => field.rules ?? [])]);
  assert.ok(allRules.length > 0);
  for (const rule of allRules) {
    assert.equal(rule.allow, "groups", `rule ${JSON.stringify(rule)}`);
  }
  assert.equal(/allow: (private|public|owner)/.test(sdl), false);
});

const personGroups = (name: string): string[] => GROUPS[name.toLowerCase()];

Then(/^(Ada|Bo|Cy) may (read|create|update|delete) an? (\w+) row of (Account [AB])$/, (person: string, operation: string, name: string, account: string) => {
  assert.equal(ruleAllows(model(name).rules, operation, accountNamed(account), personGroups(person)), true);
});
Then(/^(Ada|Bo|Cy) may not (read|create|update|delete) an? (\w+) row of (Account [AB])$/, (person: string, operation: string, name: string, account: string) => {
  assert.equal(ruleAllows(model(name).rules, operation, accountNamed(account), personGroups(person)), false);
});

const field = (modelName: string, fieldName: string): Field => {
  const found = model(modelName).fields.find((candidate) => candidate.name === fieldName);
  assert.ok(found, `${modelName}.${fieldName} exists`);
  return found;
};

Then("the Job field {string} is readable by Account members", (name: string) => {
  assert.equal(ruleAllows(field("Job", name).rules ?? model("Job").rules, "read", ACCOUNT_A, GROUPS.ada), true);
});
Then("the Video field {string} is readable by Account members", (name: string) => {
  assert.equal(ruleAllows(field("Video", name).rules ?? model("Video").rules, "read", ACCOUNT_A, GROUPS.ada), true);
});
const noWrite = (modelName: string, name: string) => {
  const item = field(modelName, name);
  assert.ok(item.rules, `${modelName}.${name} has its own field rule, so the model rule does not apply to it`);
  for (const operation of ["create", "update"]) {
    assert.equal(ruleAllows(item.rules, operation, ACCOUNT_A, GROUPS.ada), false, `${modelName}.${name} ${operation}`);
  }
};
Then("no Account member may write the Job field {string}", (name: string) => noWrite("Job", name));
Then("no Account member may write the Video field {string}", (name: string) => noWrite("Video", name));
Then("the Job field {string} defaults to {string}", (name: string, value: string) => {
  assert.equal(field("Job", name).defaultValue, value);
});

// ---- Server-side verification -------------------------------------------------------------------------------

const verifier: IdTokenVerifier = async (token) => {
  const person = /^(ada|bo|cy)-token$/.exec(token)?.[1];
  if (person) return { sub: `sub-${person}`, "cognito:groups": GROUPS[person] };
  if (token === "odd-groups-token") return { sub: "sub-odd", "cognito:groups": ["admin", "A"] };
  throw new Error(`rejected: ${token}`);
};

let accessResult: { ok: true; accountIds: string[] } | { ok: false; status: number } | null = null;

const requestWith = (token: string | null) => ({
  headers: { get: (name: string) => (name.toLowerCase() === "authorization" && token ? `Bearer ${token}` : null) },
});

const verifyFor = async (token: string | null, accountId: string) => {
  try {
    const result = await requireAccount(requestWith(token), accountId, { verifier });
    accessResult = { ok: true, accountIds: result.accountIds };
  } catch (error) {
    assert.ok(error instanceof AccountAccessError, String(error));
    accessResult = { ok: false, status: error.status };
  }
};

When(/^(Ada|Bo|Cy)'s token is verified for (Account [AB])$/, async (person: string, account: string) => {
  await verifyFor(`${person.toLowerCase()}-token`, accountNamed(account));
});
When("Ada's token is verified for the Account ID {string}", async (id: string) => verifyFor("ada-token", id));
When("a token whose groups are {string} and {string} is verified for Account A", async (_first: string, _second: string) =>
  verifyFor("odd-groups-token", ACCOUNT_A),
);
When(/^an? (forged|unsigned|expired|wrong-audience|missing) token is verified for Account A$/, async (kind: string) => {
  await verifyFor(kind === "missing" ? null : `${kind}-token`, ACCOUNT_A);
});
Then("access to Account A is allowed", () => assert.equal(accessResult?.ok, true));
Then("the verified Accounts are exactly Account A", () => {
  assert.ok(accessResult?.ok);
  assert.deepEqual(accessResult.accountIds, [ACCOUNT_A]);
});
Then("access is refused with status {int}", (status: number) => {
  assert.deepEqual(accessResult, { ok: false, status });
});

Then("the Prospectus role {string} maps to the Babulus role {string}", (role: string, expected: string) => {
  assert.equal(babulusRoleForAccountRole(role) ?? "none", expected);
});
Then("groups claim parsing keeps only Account IDs", () => {
  assert.deepEqual(accountIdsFromGroups(["admin", ACCOUNT_A, ACCOUNT_A, "A"]), [ACCOUNT_A]);
});

// ---- Keys and media -----------------------------------------------------------------------------------------

let keyResult: string | Error | null = null;
When("I build the object key for Account A and path {string}", (path: string) => {
  try {
    keyResult = buildAccountObjectKey(ACCOUNT_A, fill(path));
  } catch (error) {
    keyResult = error as Error;
  }
});
When("I check the stored key {string} against Account A", (key: string) => {
  try {
    keyResult = assertKeyInAccount(fill(key), ACCOUNT_A);
  } catch (error) {
    keyResult = error as Error;
  }
});
Then("the key is {string}", (expected: string) => assert.equal(keyResult, fill(expected)));
Then("the key is refused", () => assert.ok(keyResult instanceof Error, `expected a refusal, got ${String(keyResult)}`));

let signed: string[] = [];
let mediaResponse: Response | null = null;
const askMedia = async (token: string | null, key: string, account: string) => {
  signed = [];
  const url = new URL("https://studio.test/api/account-media");
  url.searchParams.set("accountId", accountNamed(account));
  url.searchParams.set("key", fill(key));
  mediaResponse = await handleAccountMediaGet(
    { url: url.toString(), headers: requestWith(token).headers },
    {
      verifier,
      presign: async (accountId, storedKey) => {
        signed.push(`${accountId}:${storedKey}`);
        return `https://files.test/signed?k=${encodeURIComponent(storedKey)}`;
      },
    },
  );
};
When(/^(Ada|Bo|Cy) asks the media route for "(.*)" in (Account [AB])$/, (person: string, key: string, account: string) =>
  askMedia(`${person.toLowerCase()}-token`, key, account),
);
When(/^an unsigned caller asks the media route for "(.*)" in (Account [AB])$/, (key: string, account: string) => askMedia(null, key, account));
Then("the media route answers {int} with a signed link", async (status: number) => {
  assert.equal(mediaResponse?.status, status);
  assert.match(((await mediaResponse!.json()) as { url: string }).url, /^https:\/\/files\.test\/signed/);
});
Then("the media route answers {int}", (status: number) => assert.equal(mediaResponse?.status, status));
Then("exactly one link was signed, for {string}", (key: string) => {
  assert.deepEqual(signed, [`${ACCOUNT_A}:${fill(key)}`]);
});
Then("no link was signed", () => assert.deepEqual(signed, []));

// ---- Storage rules ------------------------------------------------------------------------------------------

let storageRules = "";
When("I read the storage access rules", () => {
  const source = readFileSync(new URL("../../apps/studio-web/amplify/storage/resource.ts", import.meta.url), "utf8");
  storageRules = source.replace(/\/\/[^\n]*/g, "");
});
Then("no rule names the {string} prefix", (prefix: string) => {
  assert.equal(new RegExp(`["'\`]${prefix}/`).test(storageRules), false);
});
Then("no signed-in user may write under {string}", (prefix: string) => {
  const rule = new RegExp(`["']${prefix}/\\*["']:\\s*\\[(.*)\\]`).exec(storageRules)?.[1] ?? "";
  assert.equal(/authenticated/.test(rule), false);
  assert.equal(/write|delete/.test(rule), false);
});
Then("guests may read under {string}", (prefix: string) => {
  const rule = new RegExp(`["']${prefix}/\\*["']:\\s*\\[(.*)\\]`).exec(storageRules)?.[1] ?? "";
  assert.match(rule, /allow\.guest\.to\(\["read"\]\)/);
});

Then("a video published by Account A as {string} is stored under {string}", (slug: string, expected: string) => {
  assert.equal(buildPublishedKey(ACCOUNT_A, slug), fill(expected));
});
Then("publishing as {string} is refused", (slug: string) => {
  assert.throws(() => buildPublishedKey(ACCOUNT_A, slug));
});
