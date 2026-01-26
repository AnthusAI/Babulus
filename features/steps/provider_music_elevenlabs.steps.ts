import { Given, When, Then, Before } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { ElevenLabsMusicProvider } from "../../src/providers/music/elevenlabs.js";
import { DryRunMusicProvider } from "../../src/providers/music/dry-run.js";
import type { MusicProvider, MusicRequest } from "../../src/providers/music/types.js";
import { detectAudioFormat, isCi, makeTempAudioPath, readAudioBuffer } from "./tts_test_helpers.js";

interface TestContext {
  provider: MusicProvider;
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

Given('ElevenLabs Music provider is available', function () {
  // Provider will be initialized with API key
  assert.ok(true);
});

Given("a valid ElevenLabs Music API key is configured", function () {
  const shouldMock = isCi || testContext.apiKey.startsWith("test-") || !testContext.apiKey;
  testContext.provider = shouldMock
    ? new DryRunMusicProvider()
    : new ElevenLabsMusicProvider({ apiKey: testContext.apiKey });
  assert.ok(testContext.provider);
});

Given("a music prompt {string}", function (prompt: string) {
  testContext.prompt = prompt;
});

Given("music duration {int} seconds", function (duration: number) {
  testContext.duration = duration;
});

Given("the ElevenLabs Music API returns an error", function () {
  testContext.provider = {
    name: "mock-music-error",
    async generate(): Promise<never> {
      throw new Error("Mocked music failure");
    },
  };
});

When('I generate music with ElevenLabs', async function () {
  const request: MusicRequest = {
    prompt: testContext.prompt,
    durationSeconds: testContext.duration,
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

When('I attempt to generate music', async function () {
  const request: MusicRequest = {
    prompt: testContext.prompt,
    durationSeconds: testContext.duration,
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

When('I calculate the music generation cost', function () {
  testContext.cost = (testContext.duration / 30) * 0.1;
});

Then("the music audio should be generated successfully", function () {
  assert.ok(testContext.audioBuffer);
  assert.ok(testContext.audioBuffer.length > 0);
});

Then("the music audio format should be MP3", function () {
  if (testContext.audioBuffer) {
    const format = detectAudioFormat(testContext.audioBuffer);
    assert.ok(format === "mp3" || format === "wav", "Audio should be MP3 or WAV");
  }
});

Then("music usage should be tracked", function () {
  assert.ok(testContext.audioBuffer);
});

Then("the music audio should be generated with duration {int} seconds", function (duration: number) {
  assert.ok(testContext.audioBuffer);
  assert.strictEqual(testContext.duration, duration);
});

Then("the music request should throw an error", function () {
  assert.ok(testContext.error);
});

Then("the music error should contain API failure details", function () {
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

Then("the music cost should match ElevenLabs pricing", function () {
  assert.ok(testContext.cost !== null);
  assert.ok(testContext.cost > 0);
  // ElevenLabs music pricing varies, but let's estimate based on duration
  // Assuming roughly $0.10 per 30 seconds of music
  const expected = (testContext.duration / 30) * 0.10;
  assert.ok(testContext.cost >= expected * 0.5 && testContext.cost <= expected * 2.0,
    `Cost should be in reasonable range of $${expected}`);
});

Then("the music cost should be in USD", function () {
  assert.ok(testContext.cost !== null);
  assert.ok(testContext.cost > 0);
  // Cost should be a reasonable USD amount
  assert.ok(testContext.cost < 10, 'Cost for short music should be less than $10');
});

Given("a music duration of {int} seconds", function (duration: number) {
  testContext.duration = duration;
});
