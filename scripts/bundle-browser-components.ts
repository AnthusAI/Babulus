#!/usr/bin/env tsx

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globalsPlugin } from './esbuild-globals-plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function bundle() {
  console.error('Bundling Babulus standard browser bundle...');

  await esbuild.build({
    entryPoints: [resolve(__dirname, 'browser-bundle.tsx')],
    bundle: true,
    format: 'iife',
    globalName: 'BabulusStandard',
    outfile: resolve(__dirname, '../public/babulus-standard.js'),
    platform: 'browser',
    jsx: 'automatic',
    plugins: [globalsPlugin], // Map React imports to window.React
    absWorkingDir: resolve(__dirname, '..'),  // Set working directory for import resolution
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.jsx': 'jsx',
      '.js': 'js',
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  });

  console.error('✓ Babulus standard bundle created at public/babulus-standard.js');
}

bundle().catch((error) => {
  console.error('Bundle failed:', error);
  process.exit(1);
});
