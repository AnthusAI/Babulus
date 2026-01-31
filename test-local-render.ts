/**
 * Test local rendering (Mode 1: Local, no container)
 *
 * This script tests rendering a video locally without using Docker or cloud infrastructure.
 *
 * Usage:
 *   npx tsx test-local-render.ts                          # Full render
 *   npx tsx test-local-render.ts --preview                # Preview mode (2s at 15fps from start)
 *   npx tsx test-local-render.ts --preview --offset 15    # Preview 2s at 15fps starting at 15s
 *   npx tsx test-local-render.ts --preview --duration 5   # Preview 5s at 15fps from start
 *   npx tsx test-local-render.ts --preview --fps 10       # Preview 2s at 10fps from start
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
// @ts-ignore
import { renderVideoFromScript } from './packages/renderer/src/video-render.js';

// Parse command line arguments
const args = process.argv.slice(2);
const isPreview = args.includes('--preview');
const offsetIndex = args.indexOf('--offset');
const durationIndex = args.indexOf('--duration');
const fpsIndex = args.indexOf('--fps');

const offsetSec = offsetIndex !== -1 && args[offsetIndex + 1] ? parseFloat(args[offsetIndex + 1]) : undefined;
const durationSec = durationIndex !== -1 && args[durationIndex + 1] ? parseFloat(args[durationIndex + 1]) : undefined;
const fps = fpsIndex !== -1 && args[fpsIndex + 1] ? parseInt(args[fpsIndex + 1]) : undefined;

async function testLocalRender() {
  const mode = isPreview ? 'Preview' : 'Full';
  console.log(`=== Test Local Render (Mode 1 - ${mode}) ===\n`);

  // Load script and timeline from Tactus-web
  const scriptPath = '../Tactus-web/intro.script.json';
  const timelinePath = '../Tactus-web/intro.timeline.json';
  const audioPath = '../Tactus-web/intro.wav';
  const browserBundlePath = '../Tactus-web/browser-components.js';

  // Output path
  const outputSuffix = isPreview ? '-preview' : '';
  const outputPath = `public/babulus/intro${outputSuffix}.mp4`;

  console.log('Loading intro video assets from Tactus-web...');
  console.log(`  Script: ${scriptPath}`);
  console.log(`  Timeline: ${timelinePath}`);
  console.log(`  Audio: ${audioPath}`);
  console.log(`  Browser bundle: ${browserBundlePath}`);

  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const timeline = JSON.parse(readFileSync(timelinePath, 'utf8'));

  console.log(`\n✓ Script loaded: ${script.scenes.length} scenes`);
  console.log(`✓ Timeline loaded: ${timeline.items.length} items`);
  console.log(`✓ Audio file: ${audioPath}`);

  // Render the video
  const framesDir = `.babulus/temp/frames/intro${outputSuffix}`;
  console.log(`\nRendering video to: ${outputPath}`);
  console.log(`Frames directory: ${framesDir}`);

  if (isPreview) {
    console.log('\n🎬 Preview Mode Enabled:');
    console.log(`  Offset: ${offsetSec ?? 0}s`);
    console.log(`  Duration: ${durationSec ?? 2}s`);
    console.log(`  FPS: ${fps ?? 15}`);
    console.log('  This should complete in seconds...\n');
  } else {
    console.log('\n🎬 Full Render Mode - This may take a few minutes...\n');
  }

  const result = await renderVideoFromScript({
    script,
    timeline,
    audioPath,
    outputPath,
    framesDir,
    browserBundlePath,
    title: 'Introduction to Babulus',
    preview: isPreview ? {
      offsetSec,
      durationSec,
      fps,
    } : undefined,
  });

  console.log('\n=== Render Complete ===');
  console.log(`Output: ${result.outputPath}`);

  // Open the video for review
  console.log('\nOpening video for review...');
  try {
    execSync(`open "${result.outputPath}"`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to open video:', error);
    console.log('Please open the video manually:', result.outputPath);
  }
}

testLocalRender().catch(console.error);
