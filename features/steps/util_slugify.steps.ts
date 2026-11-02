import assert from "node:assert/strict";
import { When, Then } from "@cucumber/cucumber";
import { slugify } from "../../src/util.js";

let slugResult = "";

When("I slugify {string}", (value: string) => {
  slugResult = slugify(value);
});

Then("the slug should be {string}", (expected: string) => {
  assert.equal(slugResult, expected);
});
