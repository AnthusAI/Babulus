import assert from "node:assert/strict";
import { When, Then } from "@cucumber/cucumber";
import {
  buildAssetKey,
  buildGenerationArtifactKeys,
  buildRenderArtifactKeys,
  buildRunArtifactKey,
} from "../../packages/shared/src/storage.js";

let storageKey = "";
let storageError: string | null = null;
let generationKeys: Record<string, string> | null = null;
let renderKeys: Record<string, string> | null = null;

const reset = () => {
  storageKey = "";
  storageError = null;
  generationKeys = null;
  renderKeys = null;
};

When(
  "I build an asset key for org {string} project {string} kind {string} sha {string} file {string}",
  (orgId: string, projectId: string, kind: string, sha256: string, fileName: string) => {
    reset();
    try {
      storageKey = buildAssetKey({ orgId, projectId, kind, sha256, fileName });
    } catch (error) {
      storageError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I build an asset key for org {string} kind {string} sha {string} file {string}",
  (orgId: string, kind: string, sha256: string, fileName: string) => {
    reset();
    try {
      storageKey = buildAssetKey({ orgId, kind, sha256, fileName });
    } catch (error) {
      storageError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I build a run artifact key for org {string} video {string} run {string} file {string}",
  (orgId: string, videoId: string, runId: string, fileName: string) => {
    reset();
    try {
      storageKey = buildRunArtifactKey({ orgId, videoId, runId, fileName });
    } catch (error) {
      storageError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I build generation artifact keys for org {string} video {string} run {string}",
  (orgId: string, videoId: string, runId: string) => {
    reset();
    try {
      generationKeys = buildGenerationArtifactKeys({ orgId, videoId, runId });
    } catch (error) {
      storageError = error instanceof Error ? error.message : String(error);
    }
  },
);

When(
  "I build render artifact keys for org {string} video {string} run {string}",
  (orgId: string, videoId: string, runId: string) => {
    reset();
    try {
      renderKeys = buildRenderArtifactKeys({ orgId, videoId, runId });
    } catch (error) {
      storageError = error instanceof Error ? error.message : String(error);
    }
  },
);

Then("the storage key should be {string}", (expected: string) => {
  assert.equal(storageKey, expected);
});

Then("the generation artifact key {string} should be {string}", (key: string, expected: string) => {
  assert.equal(generationKeys?.[`${key}ArtifactKey`], expected);
});

Then("the render artifact key {string} should be {string}", (key: string, expected: string) => {
  if (key === "stills") {
    assert.equal(renderKeys?.stillsArtifactPrefix, expected);
    return;
  }
  assert.equal(renderKeys?.[`${key}ArtifactKey`], expected);
});

Then("the storage error should include {string}", (snippet: string) => {
  assert.ok(storageError?.includes(snippet));
});
