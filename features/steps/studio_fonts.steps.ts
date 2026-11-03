import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const studio = join(process.cwd(), "apps", "studio-web");
const skipped = new Set(["node_modules", ".next", ".amplify", "amplify"]);

let sources: string[] = [];

function collect(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (skipped.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...collect(path));
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) found.push(path);
  }
  return found;
}

Given("the Studio source files", () => {
  sources = collect(studio);
  assert.ok(sources.length > 0, "the Studio should have source files");
});

Then("none of them imports the Google font loader", () => {
  const offenders = sources.filter((file) => readFileSync(file, "utf8").includes("next/font/google"));
  assert.deepEqual(offenders, []);
});

Then("each font file the layout loads is in the repository", () => {
  const layout = readFileSync(join(studio, "app", "layout.tsx"), "utf8");
  const paths = [...layout.matchAll(/"(\.\/fonts\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(paths.length > 0, "the layout should load font files");
  for (const path of paths) {
    assert.ok(existsSync(join(studio, "app", path)), `${path} should exist`);
  }
});

Then("each font folder holds a licence file", () => {
  const fonts = join(studio, "app", "fonts");
  for (const family of readdirSync(fonts)) {
    assert.ok(existsSync(join(fonts, family, "LICENSE")), `${family} should have a LICENSE`);
  }
});
