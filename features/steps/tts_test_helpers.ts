import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import { writeSilenceWav } from "../../src/audio/wav.js";
import { CompileError } from "../../src/errors.js";
import type { TTSProvider, TTSRequest, TTSSegment } from "../../src/providers/tts/types.js";

export const isCi = ["1", "true"].includes(String(process.env.CI ?? "").toLowerCase());

export function makeTempAudioPath(extension = "wav") {
  return join(tmpdir(), `babulus-tts-${randomUUID()}.${extension}`);
}

export function readAudioBuffer(path: string) {
  return readFileSync(path);
}

export function detectAudioFormat(buffer: Buffer) {
  if (buffer.slice(0, 4).toString("ascii") === "RIFF") return "wav";
  const header = buffer.slice(0, 3).toString("hex");
  if (header.startsWith("494433") || header.startsWith("fff")) return "mp3";
  return "unknown";
}

export class MockTTSProvider implements TTSProvider {
  name = "mock-tts";
  async synthesize(req: TTSRequest, outPath: string): Promise<TTSSegment> {
    const durationSec = 0.8;
    writeSilenceWav(outPath, durationSec, req.sampleRateHz);
    return { path: outPath, durationSec };
  }
}

export class FailingTTSProvider implements TTSProvider {
  name = "mock-tts-error";
  async synthesize(): Promise<TTSSegment> {
    throw new CompileError("Mocked TTS failure");
  }
}
