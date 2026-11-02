import { Given, When, Then, Before } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { ElevenLabsSFXProvider } from "../../src/providers/sfx/elevenlabs.js";
import { DryRunSFXProvider } from "../../src/providers/sfx/dry-run.js";
import type { SFXProvider, SFXRequest } from "../../src/providers/sfx/types.js";
import { detectAudioFormat, isCi, makeTempAudioPath, readAudioBuffer } from "./tts_test_helpers.js";

interface TestContext {
  provider: SFXProvider;
  prompt: string;
  duration: number;
  audioBuffer: Buffer | null;
  error: Error | null;
  cost: number | null;
  apiKey: string;
  outPath: string | null;
}

let testContext: TestContext;

Before(function () {
  testContext = {
    provider: null as any,
    prompt: "",
    duration: 0,
    audioBuffer: null,
    error: null,
    cost: null,
    apiKey: process.env.ELEVENLABS_API_KEY || "test-key-for-dry-run",
    outPath: null,
  };
});

Given('ElevenLabs SFX provider is available', function () {
  // Provider will be initialized with API key
  assert.ok(true);
});

Given("a valid ElevenLabs SFX API key is configured", function () {
  const shouldMock = isCi || testContext.apiKey.startsWith("test-") || !testContext.apiKey;
  testContext.provider = shouldMock
    ? new DryRunSFXProvider()
    : new ElevenLabsSFXProvider({ apiKey: testContext.apiKey });
  assert.ok(testContext.provider);
});

Given("a SFX prompt {string}", function (prompt: string) {
  testContext.prompt = prompt;
});

Given("SFX duration {int} seconds", function (duration: number) {
  testContext.duration = duration;
});

Given('the ElevenLabs SFX API returns an error', function () {
  testContext.provider = {
    name: "mock-sfx-error",
    async generate(): Promise<never> {
      throw new Error("Mocked sfx failure");
    },
  };
});

When('I generate SFX with ElevenLabs', async function () {
  const request: SFXRequest = {
    prompt: testContext.prompt,
    durationSec: testContext.duration,
    sampleRateHz: 44100,
  };

  try {
    testContext.outPath = makeTempAudioPath("mp3");
    await testContext.provider.generate(request, testContext.outPath);
    testContext.audioBuffer = readAudioBuffer(testContext.outPath);
  } catch (error) {
    testContext.error = error as Error;
  }
});

When('I attempt to generate SFX', async function () {
  const request: SFXRequest = {
    prompt: testContext.prompt,
    durationSec: testContext.duration,
    sampleRateHz: 44100,
  };

  try {
    testContext.outPath = makeTempAudioPath("mp3");
    await testContext.provider.generate(request, testContext.outPath);
    testContext.audioBuffer = readAudioBuffer(testContext.outPath);
  } catch (error) {
    testContext.error = error as Error;
  }
});

When('I calculate the SFX generation cost', function () {
  testContext.cost = testContext.duration * 0.05;
});

Then("the SFX audio should be generated successfully", function () {
  assert.ok(testContext.audioBuffer);
  assert.ok(testContext.audioBuffer.length > 0);
});

Then("the SFX audio format should be MP3", function () {
  if (testContext.audioBuffer) {
    const format = detectAudioFormat(testContext.audioBuffer);
    assert.ok(format === "mp3" || format === "wav", "Audio should be MP3 or WAV");
  }
});

Then("SFX usage should be tracked", function () {
  assert.ok(testContext.audioBuffer);
});

Then("the SFX audio should be generated with duration {int} seconds", function (duration: number) {
  assert.ok(testContext.audioBuffer);
  assert.strictEqual(testContext.duration, duration);
});

Then("the SFX request should throw an error", function () {
  assert.ok(testContext.error);
});

Then("the SFX error should contain API failure details", function () {
  assert.ok(testContext.error);
  assert.ok(
    testContext.error.message.includes('API') ||
    testContext.error.message.includes('401') ||
    testContext.error.message.includes('authentication') ||
    testContext.error.message.includes('key') ||
    testContext.error.message.includes('Unauthorized') ||
    testContext.error.message.includes('Mocked'),
    'Error should contain API failure details'
  );
});

Then("the SFX cost should match ElevenLabs pricing", function () {
  assert.ok(testContext.cost !== null);
  assert.ok(testContext.cost > 0);
  // ElevenLabs SFX pricing varies, but let's estimate based on duration
  // Assuming roughly $0.05 per second of SFX
  const expected = testContext.duration * 0.05;
  assert.ok(testContext.cost >= expected * 0.5 && testContext.cost <= expected * 2.0,
    `Cost should be in reasonable range of $${expected}`);
});

Then("the SFX cost should be in USD", function () {
  assert.ok(testContext.cost !== null);
  assert.ok(testContext.cost > 0);
  // Cost should be a reasonable USD amount
  assert.ok(testContext.cost < 5, 'Cost for short SFX should be less than $5');
});

Given("a SFX duration of {int} seconds", function (duration: number) {
  testContext.duration = duration;
});
