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
 *   npx tsx test-local-render.ts --scene cta              # Render specific scene by ID
 *   npx tsx test-local-render.ts --scene 8                # Render specific scene by index
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
const sceneIndex = args.indexOf('--scene');

const offsetSec = offsetIndex !== -1 && args[offsetIndex + 1] ? parseFloat(args[offsetIndex + 1]) : undefined;
const durationSec = durationIndex !== -1 && args[durationIndex + 1] ? parseFloat(args[durationIndex + 1]) : undefined;
const fps = fpsIndex !== -1 && args[fpsIndex + 1] ? parseInt(args[fpsIndex + 1]) : undefined;
const sceneArg = sceneIndex !== -1 && args[sceneIndex + 1] ? args[sceneIndex + 1] : undefined;

async function testLocalRender() {
  // Load script and timeline from Tactus-web intro video
  const videoName = 'intro';
  const tactusWebPath = '/Users/ryan.porter/Projects/Tactus-web/videos';
  const scriptPath = `${tactusWebPath}/src/videos/${videoName}/${videoName}.script.json`;
  const timelinePath = `${tactusWebPath}/src/videos/${videoName}/${videoName}.timeline.json`;
  const audioPath = `${tactusWebPath}/public/babulus/${videoName}.wav`;

  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const timeline = JSON.parse(readFileSync(timelinePath, 'utf8'));

  // Handle --scene parameter
  let sceneOffsetSec = offsetSec;
  let sceneDurationSec = durationSec;
  let sceneMode = '';

  if (sceneArg !== undefined) {
    // Find scene by ID or index
    let targetScene;
    const sceneIndexNum = parseInt(sceneArg);

    if (!isNaN(sceneIndexNum)) {
      // Scene specified by index
      targetScene = script.scenes[sceneIndexNum];
      if (!targetScene) {
        console.error(`Error: Scene index ${sceneIndexNum} not found. Valid indices: 0-${script.scenes.length - 1}`);
        process.exit(1);
      }
    } else {
      // Scene specified by ID
      targetScene = script.scenes.find(s => s.id === sceneArg);
      if (!targetScene) {
        console.error(`Error: Scene "${sceneArg}" not found. Available scenes: ${script.scenes.map(s => s.id).join(', ')}`);
        process.exit(1);
      }
    }

    // Calculate the target FPS for rendering (default to 30 if not specified)
    const targetFps = fps || 30;

    // To avoid boundary issues, start at the frame AFTER the scene start
    // Calculate which frame the scene starts at, then add one frame duration
    const startFrame = Math.floor(targetScene.startSec * targetFps);
    const adjustedStartFrame = startFrame + 1;

    sceneOffsetSec = adjustedStartFrame / targetFps;
    sceneDurationSec = targetScene.endSec - sceneOffsetSec;
    sceneMode = ` (Scene: ${targetScene.id})`;

    console.log(`\n🎬 Scene Mode: Rendering scene "${targetScene.id}" (${targetScene.title})`);
    console.log(`   Duration: ${sceneDurationSec.toFixed(2)}s (${sceneOffsetSec.toFixed(2)}s - ${targetScene.endSec.toFixed(2)}s)`);
    console.log(`   Starting at frame ${adjustedStartFrame} (skipping boundary frame ${startFrame})\n`);
  }

  const mode = sceneArg !== undefined ? `Scene${sceneMode}` : (isPreview ? 'Preview' : 'Full');
  console.log(`=== Test Local Render (Mode 1 - ${mode}) ===\n`);

  // Use both bundles: Babulus standard + Tactus-web custom components
  const babulusStandardBundle = 'public/babulus-standard.js';
  const tactusCustomBundle = `${tactusWebPath}/public/browser-components.js`;
  const browserBundlePaths = [babulusStandardBundle, tactusCustomBundle];

  // Output path (save to Babulus project, not Tactus-web)
  const outputSuffix = sceneArg !== undefined ? `-scene-${sceneArg}` : (isPreview ? '-preview' : '');
  const outputPath = `.babulus/temp/${videoName}${outputSuffix}.mp4`;

  console.log(`Loading video assets for ${videoName}...`);
  console.log(`  Script: ${scriptPath}`);
  console.log(`  Timeline: ${timelinePath}`);
  console.log(`  Audio: ${audioPath}`);
  console.log(`  Browser bundles:`);
  console.log(`    - Babulus standard: ${babulusStandardBundle}`);
  console.log(`    - Tactus-web custom: ${tactusCustomBundle}`);

  console.log(`\n✓ Script loaded: ${script.scenes.length} scenes`);
  console.log(`✓ Timeline loaded: ${timeline.items.length} items`);
  console.log(`✓ Audio file: ${audioPath}`);

  // Debug: Check if markup is preserved in loaded script
  const keyFeaturesScene = script.scenes.find(s => s.id === 'key-features');
  if (keyFeaturesScene) {
    console.log(`\n[DEBUG] key-features scene markup:`, JSON.stringify(keyFeaturesScene.markup));
  }

  // Render the video
  const framesDir = `.babulus/temp/frames/${videoName}${outputSuffix}`;
  console.log(`\nRendering video to: ${outputPath}`);
  console.log(`Frames directory: ${framesDir}`);

  if (sceneArg !== undefined || isPreview) {
    console.log('\n🎬 Preview Mode Enabled:');
    console.log(`  Offset: ${sceneOffsetSec ?? offsetSec ?? 0}s`);
    console.log(`  Duration: ${sceneDurationSec ?? durationSec ?? 2}s`);
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
    browserBundlePaths,
    title: 'Intro to Tactus',
    preview: (sceneArg !== undefined || isPreview) ? {
      offsetSec: sceneOffsetSec ?? offsetSec,
      durationSec: sceneDurationSec ?? durationSec,
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
