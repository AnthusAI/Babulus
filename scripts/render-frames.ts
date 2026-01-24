#!/usr/bin/env tsx

import { Command } from "commander";
import { resolve } from "path";
import { renderFramesToPng } from "../packages/renderer/src/render.js";
import { toFileUrl } from "../src/util.js";

const program = new Command();

program
  .name("babulus-render-frames")
  .description("Render a sequence of frames to PNGs using Playwright")
  .requiredOption("--component <path>", "Path to a module exporting a React component (default export)")
  .requiredOption("--out-dir <path>", "Output directory for PNGs")
  .option("--start <number>", "Start frame", (value) => Number(value), 0)
  .option("--end <number>", "End frame (inclusive)")
  .option("--pattern <pattern>", "Frame filename pattern", "frame-%06d.png")
  .option("--fps <number>", "Frames per second", (value) => Number(value), 30)
  .option("--width <number>", "Frame width", (value) => Number(value), 1920)
  .option("--height <number>", "Frame height", (value) => Number(value), 1080)
  .option("--duration <number>", "Duration in frames", (value) => Number(value), 300)
  .option("--scale <number>", "Device scale factor", (value) => Number(value), 1)
  .option("--workers <number>", "Parallel frame workers (set 1 to disable)", (value) => Number(value))
  .action(async (opts) => {
    const modulePath = resolve(process.cwd(), opts.component);
    const outputDir = resolve(process.cwd(), opts.outDir);
    const mod = await import(toFileUrl(modulePath));
    const Component = mod.default;
    if (!Component) {
      throw new Error(`No default export found in ${modulePath}`);
    }
    const endFrame = opts.end == null ? undefined : Number(opts.end);
    const result = await renderFramesToPng({
      component: Component,
      config: {
        fps: opts.fps,
        width: opts.width,
        height: opts.height,
        durationFrames: opts.duration,
      },
      startFrame: opts.start,
      endFrame,
      framePattern: opts.pattern,
      outDir: outputDir,
      deviceScaleFactor: opts.scale,
      workers: opts.workers,
    });
    console.error(`write: ${result.frames.length} frame(s) to ${outputDir}`);
  });

program.parse(process.argv);
