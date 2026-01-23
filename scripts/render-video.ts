#!/usr/bin/env tsx

import { Command } from "commander";
import { resolve } from "path";
import { encodeVideo } from "../packages/renderer/src/index.js";

const program = new Command();

program
  .name("babulus-render-video")
  .description("Encode a frame sequence into an MP4 using ffmpeg")
  .requiredOption("--frames <dir>", "Directory containing frame sequence")
  .requiredOption("--out <path>", "Output MP4 path")
  .option("--fps <number>", "Frames per second", (value) => Number(value), 30)
  .option("--pattern <pattern>", "Frame filename pattern", "frame-%06d.png")
  .option("--audio <path>", "Optional audio file path")
  .option("--ffmpeg <path>", "ffmpeg binary path", "ffmpeg")
  .action(async (opts) => {
    const framesDir = resolve(process.cwd(), opts.frames);
    const outPath = resolve(process.cwd(), opts.out);
    const audioPath = opts.audio ? resolve(process.cwd(), opts.audio) : null;
    await encodeVideo({
      framesDir,
      fps: opts.fps,
      outputPath: outPath,
      audioPath,
      framePattern: opts.pattern,
      ffmpegPath: opts.ffmpeg,
    });
    console.error(`write: ${outPath}`);
  });

program.parse(process.argv);
