import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
let name, shared, selected;
Given('the shared animation demo {string}', async function (value) {
  name=value; shared=await import('@videoml/stdlib/demos');
  assert.ok(shared.getSharedDemo(name), `Missing shared demo ${name}`);
});
When('I request the demo through its established Babulus name', async function () {
  const root=process.env.BABULUS_REPO_ROOT ?? process.cwd();
  const registry=await import(pathToFileURL(join(root,'packages/renderer/src/components/registry.ts')).href);
  selected=registry.getComponent(name);
});
Then('the same shared demo implementation is selected', function () {
  assert.equal(selected,shared.getSharedDemo(name));
});
