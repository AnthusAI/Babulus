#!/usr/bin/env tsx

import { Command } from "commander";
import { resolve } from "path";
import { renderFrameToFile, renderFrameToPng } from "../packages/renderer/src/index.js";
import { toFileUrl } from "../src/util.js";

const program = new Command();

program
  .name("babulus-render-frame")
  .description("Render a single frame to an HTML snapshot")
  .requiredOption("--component <path>", "Path to a module exporting a React component (default export)")
  .requiredOption("--out <path>", "Output HTML/PNG file path")
  .requiredOption("--frame <number>", "Frame to render", (value) => Number(value))
  .option("--format <format>", "html or png", "html")
  .option("--fps <number>", "Frames per second", (value) => Number(value), 30)
  .option("--width <number>", "Frame width", (value) => Number(value), 1920)
  .option("--height <number>", "Frame height", (value) => Number(value), 1080)
  .option("--duration <number>", "Duration in frames", (value) => Number(value), 300)
  .option("--scale <number>", "Device scale factor (png only)", (value) => Number(value), 1)
  .action(async (opts) => {
    const modulePath = resolve(process.cwd(), opts.component);
    const outputPath = resolve(process.cwd(), opts.out);
    const mod = await import(toFileUrl(modulePath));
    const Component = mod.default;
    if (!Component) {
      throw new Error(`No default export found in ${modulePath}`);
    }
    const format = String(opts.format ?? "html").toLowerCase();
    if (format === "png") {
      await renderFrameToPng({
        component: Component,
        frame: opts.frame,
        outPath: outputPath,
        deviceScaleFactor: opts.scale,
        config: {
          fps: opts.fps,
          width: opts.width,
          height: opts.height,
          durationFrames: opts.duration,
        },
      });
    } else {
      renderFrameToFile({
        component: Component,
        frame: opts.frame,
        outPath: outputPath,
        config: {
          fps: opts.fps,
          width: opts.width,
          height: opts.height,
          durationFrames: opts.duration,
        },
      });
    }
    console.error(`write: ${outputPath}`);
  });

program.parse(process.argv);
