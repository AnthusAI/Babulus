/**
 * Test local container rendering (Mode 2)
 *
 * This script runs inside the Docker container to test rendering with local files.
 * The container should mount both Babulus and Tactus-web directories.
 *
 * Usage:
 *   docker run --rm \
 *     -v "$(pwd):/workspace" \
 *     -v "$(cd ../Tactus-web && pwd):/tactus-web:ro" \
 *     -w /workspace \
 *     babulus-render-worker:latest \
 *     npx tsx test-container-local.ts [--preview] [--offset N] [--duration N] [--fps N]
 */

import { readFileSync } from 'fs';
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

async function testContainerLocal() {
  const mode = isPreview ? 'Preview' : 'Full';
  console.log(`=== Test Container Render (Mode 2 - ${mode}) ===\n`);

  // Load script and timeline from Tactus-web (mounted at /tactus-web)
  const scriptPath = '/tactus-web/intro.script.json';
  const timelinePath = '/tactus-web/intro.timeline.json';
  const audioPath = '/tactus-web/intro.wav';
  const browserBundlePath = '/tactus-web/browser-components.js';

  // Output path
  const outputSuffix = isPreview ? '-preview' : '';
  const outputPath = `public/babulus/intro-container${outputSuffix}.mp4`;
  const framesDir = `.babulus/temp/frames/intro-container${outputSuffix}`;

  console.log('Loading intro video assets from mounted Tactus-web...');
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
    title: 'Introduction to Babulus (Container)',
    preview: isPreview ? {
      offsetSec,
      durationSec,
      fps,
    } : undefined,
  });

  console.log('\n=== Render Complete ===');
  console.log(`Output: ${result.outputPath}`);
  console.log('\nVideo saved to mounted volume. Open it on your host machine with:');
  console.log(`  open ${outputPath}`);
}

testContainerLocal().catch(console.error);
