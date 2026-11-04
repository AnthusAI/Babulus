import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

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

function layoutFontPaths(): string[] {
  const layout = readFileSync(join(studio, "app", "layout.tsx"), "utf8");
  const paths = [...layout.matchAll(/"(\.\.?\/[^"]+\.woff2)"/g)].map((match) => match[1]);
  assert.ok(paths.length > 0, "the layout should load font files");
  return paths;
}

Then("each font file the layout loads is in the repository or in an installed font package", () => {
  for (const path of layoutFontPaths()) {
    assert.ok(existsSync(resolve(studio, "app", path)), `${path} should exist`);
  }
});

Then("each font the layout loads comes with its licence file", () => {
  for (const path of layoutFontPaths()) {
    const file = resolve(studio, "app", path);
    // Committed fonts sit in a folder of their own; package fonts sit in the package's files folder.
    const family = dirname(file).endsWith(`${sep}files`) ? dirname(dirname(file)) : dirname(file);
    assert.ok(existsSync(join(family, "LICENSE")), `${path} should have a LICENSE beside its family`);
  }
});
