import assert from "node:assert/strict";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import {
  audioActivityRatio,
  concatAudioFiles,
  estimateTrailingSilenceSec,
  isAudioAllSilence,
  probeDurationSec,
  probeVolumeDb,
  setMediaSpawn,
  trimAudioToDuration,
} from "../../src/media.js";

type SpawnResult = {
  stdout?: Buffer | string;
  stderr?: Buffer | string;
  status?: number | null;
  error?: NodeJS.ErrnoException | null;
  sideEffect?: (cmd: string, args: string[]) => void;
};

let spawnQueue: SpawnResult[] = [];
let errorMessage: string | null = null;
let durationResult = 0;
let trailingResult = 0;
let volumeResult: { mean_volume_db: number | null; max_volume_db: number | null } | null = null;
let silenceResult = false;
let activityResult = 0;
let workspace = "";
let concatListPath = "";

const spawnStub: typeof setMediaSpawn extends (fn: infer T) => void ? T : never = ((cmd, args, _opts) => {
  const next = spawnQueue.shift() ?? {};
  if (next.sideEffect) {
    next.sideEffect(String(cmd), args.map(String));
  }
  return {
    pid: 0,
    output: [],
    status: next.status ?? 0,
    signal: null,
    error: next.error ?? null,
    stdout: next.stdout ?? Buffer.from(""),
    stderr: next.stderr ?? Buffer.from(""),
  };
}) as any;

Before(() => {
  spawnQueue = [];
  errorMessage = null;
  durationResult = 0;
  trailingResult = 0;
  volumeResult = null;
  silenceResult = false;
  activityResult = 0;
  workspace = mkdtempSync(join(tmpdir(), "babulus-media-"));
  concatListPath = "";
  setMediaSpawn(spawnStub as any);
});

After(() => {
  setMediaSpawn();
  rmSync(workspace, { recursive: true, force: true });
});

Given("media spawn will return stdout:", (docString: string) => {
  spawnQueue.push({ stdout: Buffer.from(docString.trim()) });
});

Given("media spawn will return stderr:", (docString: string) => {
  spawnQueue.push({ stderr: docString.trim() });
});

Given("media spawn will return audio samples {string}", (samples: string) => {
  const values = samples
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value));
  const buf = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => {
    buf.writeInt16LE(value, index * 2);
  });
  spawnQueue.push({ stdout: buf });
});

Given("media spawn will error {string}", (code: string) => {
  const err = new Error("spawn error") as NodeJS.ErrnoException;
  err.code = code;
  spawnQueue.push({ error: err });
});

Given("media spawn will succeed", () => {
  spawnQueue.push({ status: 0 });
});

Given("a media input file {string}", (name: string) => {
  const path = join(workspace, name);
  writeFileSync(path, "data");
});

Given("media spawn will write temp output for {string}", (name: string) => {
  const outputPath = join(workspace, name);
  const tmpPath = outputPath.replace(/(\.[^.]+)$/i, ".tmp$1");
  spawnQueue.push({
    status: 0,
    sideEffect: () => {
      writeFileSync(tmpPath, "trimmed");
    },
  });
});

When("I probe duration for {string}", (path: string) => {
  durationResult = probeDurationSec(path);
});

When("I probe duration for {string} and capture errors", (path: string) => {
  try {
    durationResult = probeDurationSec(path);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

When("I estimate trailing silence with sample rate {int}", (sampleRate: number) => {
  trailingResult = estimateTrailingSilenceSec("file.wav", sampleRate, 200, 6.0);
});

When("I probe volume for {string}", (path: string) => {
  volumeResult = probeVolumeDb(path);
});

When("I check if audio is silent", () => {
  silenceResult = isAudioAllSilence("file.wav", 3.0, 44100);
});

When("I compute audio activity ratio with threshold {int}", (threshold: number) => {
  activityResult = audioActivityRatio("file.wav", 3.0, 44100, threshold);
});

When("I concatenate with no segments", () => {
  try {
    concatAudioFiles("out.wav", []);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
});

When("I trim audio {string} to {string} with duration {float}", (input: string, output: string, duration: number) => {
  const inputPath = join(workspace, input);
  const outputPath = join(workspace, output);
  trimAudioToDuration(inputPath, outputPath, duration, 44100);
});

When("I concatenate {string} with segments {string}", (output: string, segments: string) => {
  const outPath = join(workspace, output);
  const segmentPaths = segments
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => {
      const path = join(workspace, name);
      writeFileSync(path, "segment");
      return path;
    });
  const ext = outPath.split(".").pop() ?? "wav";
  concatListPath = join(
    workspace,
    `.concat-${basename(outPath, "." + ext)}.txt`,
  );
  concatAudioFiles(outPath, segmentPaths);
});

Then("the media duration should be {float}", (value: number) => {
  assert.equal(durationResult, value);
});

Then("the trailing silence should be {float}", (value: number) => {
  assert.equal(trailingResult, value);
});

Then("the mean volume should be {float}", (value: number) => {
  assert.equal(volumeResult?.mean_volume_db, value);
});

Then("the max volume should be {float}", (value: number) => {
  assert.equal(volumeResult?.max_volume_db, value);
});

Then("the audio should be silent", () => {
  assert.equal(silenceResult, true);
});

Then("the activity ratio should be {float}", (value: number) => {
  assert.equal(activityResult, value);
});

Then("the media error should include {string}", (snippet: string) => {
  assert.ok(errorMessage);
  assert.ok(errorMessage?.includes(snippet));
});

Then("the trimmed output should exist", () => {
  const found = existsSync(join(workspace, "trimmed.wav"));
  assert.equal(found, true);
});

Then("the concat list file should be removed", () => {
  assert.equal(existsSync(concatListPath), false);
});
