#!/usr/bin/env tsx

import { Command } from "commander";
import { detectRendererToolchain } from "../packages/renderer/src/index.js";

const program = new Command();

program
  .name("babulus-render-toolchain")
  .description("Report renderer toolchain versions and requirements")
  .option("--ffmpeg <path>", "ffmpeg binary path", "ffmpeg")
  .option("--expect-ffmpeg <version>", "Expected ffmpeg version")
  .option("--expect-playwright <version>", "Expected Playwright version")
  .option("--require-ffmpeg", "Require ffmpeg to be available")
  .option("--require-playwright", "Require Playwright to be available")
  .option("--json", "Print JSON output")
  .action(async (opts) => {
    const status = await detectRendererToolchain({
      ffmpegPath: opts.ffmpeg,
      expectedFfmpegVersion: opts.expectFfmpeg ?? null,
      expectedPlaywrightVersion: opts.expectPlaywright ?? null,
      requireFfmpeg: Boolean(opts.requireFfmpeg),
      requirePlaywright: Boolean(opts.requirePlaywright),
    });

    if (opts.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      const ffmpegLabel = status.ffmpeg.available
        ? `${status.ffmpeg.version ?? "unknown"} (${status.ffmpeg.path})`
        : "missing";
      const playwrightLabel = status.playwright.available
        ? `${status.playwright.packageName ?? "playwright"}@${status.playwright.version ?? "unknown"}`
        : "missing";
      console.log(`ffmpeg: ${ffmpegLabel}`);
      console.log(`playwright: ${playwrightLabel}`);
      if (status.issues.length) {
        console.log("issues:");
        for (const issue of status.issues) {
          console.log(`- ${issue}`);
        }
      }
    }

    if (!status.ok) {
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
