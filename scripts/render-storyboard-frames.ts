#!/usr/bin/env tsx

import { Command } from "commander";
import { readFileSync } from "fs";
import { resolve } from "path";
import { renderStoryboardFramesHtml } from "../packages/renderer/src/index.js";
import type { ScriptData } from "../packages/shared/src/video.js";
import type { TimelineData } from "../packages/shared/src/timeline.js";

const program = new Command();

program
  .name("babulus-render-storyboard-frames")
  .description("Render storyboard HTML frames from script.json without Playwright")
  .requiredOption("--script <path>", "Path to script.json")
  .requiredOption("--frames <dir>", "Output directory for HTML frames")
  .option("--timeline <path>", "Optional timeline.json for duration data")
  .option("--title <text>", "Storyboard title")
  .option("--subtitle <text>", "Storyboard subtitle")
  .option("--start <number>", "Start frame", (value) => Number(value), 0)
  .option("--end <number>", "End frame (inclusive)")
  .option("--pattern <pattern>", "Frame filename pattern", "frame-%06d.html")
  .option("--fps <number>", "Override fps")
  .option("--width <number>", "Override width")
  .option("--height <number>", "Override height")
  .option("--duration <number>", "Override duration frames")
  .action((opts) => {
    const scriptPath = resolve(process.cwd(), opts.script);
    const framesDir = resolve(process.cwd(), opts.frames);
    const timelinePath = opts.timeline ? resolve(process.cwd(), opts.timeline) : null;

    const script = JSON.parse(readFileSync(scriptPath, "utf8")) as ScriptData;
    const timeline = timelinePath ? (JSON.parse(readFileSync(timelinePath, "utf8")) as TimelineData) : null;
    const endFrame = opts.end == null ? undefined : Number(opts.end);

    const result = renderStoryboardFramesHtml({
      script,
      timeline,
      title: opts.title,
      subtitle: opts.subtitle,
      outDir: framesDir,
      startFrame: opts.start,
      endFrame,
      framePattern: opts.pattern,
      fps: opts.fps,
      width: opts.width,
      height: opts.height,
      durationFrames: opts.duration,
    });
    console.error(`write: ${result.frames.length} frame(s) to ${framesDir}`);
  });

program.parse(process.argv);
