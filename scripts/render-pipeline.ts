#!/usr/bin/env tsx

import { Command } from "commander";
import { resolve } from "path";
import { renderVideo } from "../packages/renderer/src/pipeline.js";
import { toFileUrl } from "../src/util.js";

const program = new Command();

program
  .name("babulus-render-pipeline")
  .description("Render PNG frames with Playwright and encode MP4 with ffmpeg")
  .requiredOption("--component <path>", "Path to a module exporting a React component (default export)")
  .requiredOption("--frames <dir>", "Output directory for PNG frames")
  .requiredOption("--out <path>", "Output MP4 path")
  .option("--start <number>", "Start frame", (value) => Number(value), 0)
  .option("--end <number>", "End frame (inclusive)")
  .option("--pattern <pattern>", "Frame filename pattern", "frame-%06d.png")
  .option("--fps <number>", "Frames per second", (value) => Number(value), 30)
  .option("--width <number>", "Frame width", (value) => Number(value), 1920)
  .option("--height <number>", "Frame height", (value) => Number(value), 1080)
  .option("--duration <number>", "Duration in frames", (value) => Number(value), 300)
  .option("--scale <number>", "Device scale factor", (value) => Number(value), 1)
  .option("--audio <path>", "Optional audio file path")
  .option("--ffmpeg <path>", "ffmpeg binary path", "ffmpeg")
  .option(
    "--ffmpeg-arg <arg>",
    "Extra ffmpeg argument (repeat for multiple)",
    (value: string, previous: string[]) => [...previous, value],
    [],
  )
  .action(async (opts) => {
    const modulePath = resolve(process.cwd(), opts.component);
    const framesDir = resolve(process.cwd(), opts.frames);
    const outputPath = resolve(process.cwd(), opts.out);
    const audioPath = opts.audio ? resolve(process.cwd(), opts.audio) : null;
    const mod = await import(toFileUrl(modulePath));
    const Component = mod.default;
    if (!Component) {
      throw new Error(`No default export found in ${modulePath}`);
    }
    const endFrame = opts.end == null ? undefined : Number(opts.end);
    await renderVideo({
      component: Component,
      config: {
        fps: opts.fps,
        width: opts.width,
        height: opts.height,
        durationFrames: opts.duration,
      },
      framesDir,
      outputPath,
      audioPath,
      framePattern: opts.pattern,
      startFrame: opts.start,
      endFrame,
      deviceScaleFactor: opts.scale,
      ffmpegPath: opts.ffmpeg,
      ffmpegArgs: opts.ffmpegArg,
    });
    console.error(`write: ${outputPath}`);
  });

program.parse(process.argv);
