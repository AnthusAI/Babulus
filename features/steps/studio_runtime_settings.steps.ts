import { Given, Then, type DataTable } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let copyLine = "";
let buildLine = "";

Given("the Studio build steps", () => {
  const source = readFileSync(join(process.cwd(), "amplify.yml"), "utf8");
  const lines = source.split("\n");
  copyLine = lines.find((line) => line.includes(">> .env.production")) ?? "";
  buildLine = lines.find((line) => line.includes("- npm run build") && !line.includes("--workspace")) ?? "";
  assert.ok(copyLine, "the build should copy settings into .env.production");
  assert.ok(lines.indexOf(copyLine) < lines.indexOf(buildLine), "settings must be copied before the app is built");
});

Then("the build copies these settings for the server before it builds the app", (table: DataTable) => {
  for (const { setting } of table.hashes()) {
    assert.ok(copyLine.includes(`'^${setting}='`), `${setting} should be copied`);
  }
});

Then("every setting copied for the server is named exactly", () => {
  const patterns = [...copyLine.matchAll(/-e '([^']+)'/g)].map((match) => match[1]);
  assert.ok(patterns.length > 0);
  for (const pattern of patterns) assert.match(pattern, /^\^[A-Z0-9_]+=$/);
});
