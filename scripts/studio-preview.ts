#!/usr/bin/env tsx

import { Command } from "commander";
import chokidar from "chokidar";
import { writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { loadVideoFile } from "../src/dsl/load.js";
import { generateComposition } from "../src/generate.js";
import { findConfigPath, findProjectRoot, loadConfig } from "../src/config.js";
import { ensureDir } from "../src/util.js";

type PreviewIndex = {
  updatedAt: string;
  compositions: Array<{
    id: string;
    title?: string | null;
    script: string;
    timeline: string;
    audio?: string | null;
  }>;
};

const program = new Command();
program
  .name("studio-preview")
  .argument("<dsl...>", "Path(s) to .babulus.ts or .babulus.xml file(s)")
  .option("--out-dir <path>", "Preview output directory", "apps/studio-web/public/preview")
  .option("--audio", "Write preview audio files", false)
  .option("--watch", "Watch DSL changes and regenerate", false)
  .option("--env <name>", "Set BABULUS_ENV for generation");

program.parse();

const opts = program.opts<{ outDir: string; audio: boolean; watch: boolean; env?: string }>();
const dslPaths = program.args.map((arg) => resolve(process.cwd(), arg));
if (opts.env) {
  process.env.BABULUS_ENV = opts.env;
}

const projectRoot = findProjectRoot(dslPaths[0]);
const configPath = findConfigPath(projectRoot, dslPaths[0]);
const previewRoot = resolve(process.cwd(), opts.outDir);

const writePreviewIndex = (index: PreviewIndex) => {
  ensureDir(previewRoot);
  const path = join(previewRoot, "index.json");
  writeFileSync(path, JSON.stringify(index, null, 2) + "\n");
};

const runOnce = async () => {
  const entries: PreviewIndex["compositions"] = [];
  const seen = new Set<string>();

  for (const dslPath of dslPaths) {
    const root = findProjectRoot(dslPath);
    const config = loadConfig(root, dslPath);
    const videoFile = await loadVideoFile(dslPath);

    for (const comp of videoFile.compositions) {
      const scriptName = `${comp.id}.script.json`;
      const timelineName = `${comp.id}.timeline.json`;
      const audioName = opts.audio ? `${comp.id}.wav` : null;
      const scriptOut = join(previewRoot, scriptName);
      const timelineOut = join(previewRoot, timelineName);
      const audioOut = audioName ? join(previewRoot, audioName) : null;
      const outDir = join(root, ".babulus", "out", comp.id);

      await generateComposition({
        composition: comp,
        dslPath,
        scriptOut,
        timelineOut,
        audioOut,
        outDir,
        config,
        verboseLogs: true,
      });

      if (!seen.has(comp.id)) {
        entries.push({
          id: comp.id,
          title: comp.title ?? null,
          script: scriptName,
          timeline: timelineName,
          audio: audioName,
        });
        seen.add(comp.id);
      }
    }
  }

  writePreviewIndex({ updatedAt: new Date().toISOString(), compositions: entries });
};

const run = async () => {
  await runOnce();

  if (!opts.watch) {
    return;
  }

  const watchDirs = [...new Set(dslPaths.map((dslPath) => dirname(dslPath)))];
  if (configPath) {
    watchDirs.push(dirname(configPath));
  }

  const watcher = chokidar.watch(watchDirs, {
    ignoreInitial: true,
    usePolling: true,
    interval: 500,
    binaryInterval: 1000,
    ignored: ["**/node_modules/**", "**/.git/**", "**/.babulus/out/**", "**/dist/**"],
  });

  console.error(`[studio-preview] watching ${watchDirs.join(", ")}`);
  watcher.on("all", async (_event, changedPath) => {
    if (
      !changedPath.endsWith(".ts") &&
      !changedPath.endsWith(".xml") &&
      !changedPath.endsWith(".yml") &&
      !changedPath.endsWith(".yaml")
    ) {
      return;
    }
    console.error(`[studio-preview] change detected: ${changedPath}`);
    await runOnce();
  });
};

run().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[studio-preview] failed: ${message}`);
  process.exit(1);
});
