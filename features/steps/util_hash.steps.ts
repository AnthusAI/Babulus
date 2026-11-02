import assert from "node:assert/strict";
import { When, Then } from "@cucumber/cucumber";
import { hashKey, stableStringify } from "../../src/util.js";

let stableResult = "";
let hashes: string[] = [];

const parseRows = (table: { raw: () => string[][] }) => {
  const rows = table.raw().slice(1);
  const out: Record<string, unknown> = {};
  for (const [key, value] of rows) {
    if (!key) continue;
    if (key.includes(".")) {
      const parts = key.split(".");
      let cursor: Record<string, unknown> = out;
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        if (i === parts.length - 1) {
          cursor[part] = Number.isNaN(Number(value)) ? value : Number(value);
        } else {
          if (!cursor[part] || typeof cursor[part] !== "object") {
            cursor[part] = {};
          }
          cursor = cursor[part] as Record<string, unknown>;
        }
      }
    } else {
      const parsed = Number.isNaN(Number(value)) ? value : Number(value);
      out[key] = parsed;
    }
  }
  return out;
};

When("I stable stringify object:", (table: { raw: () => string[][] }) => {
  const obj = parseRows(table);
  stableResult = stableStringify(obj);
});

When("I hash the object:", (table: { raw: () => string[][] }) => {
  const obj = parseRows(table);
  hashes.push(hashKey(obj));
});

Then("the stable string should be {string}", (expected: string) => {
  assert.equal(stableResult, expected);
});

Then("the stable string should be:", (expected: string) => {
  assert.equal(stableResult, expected.trim());
});

Then("the two hashes should be equal", () => {
  assert.equal(hashes.length, 2);
  assert.equal(hashes[0], hashes[1]);
});
