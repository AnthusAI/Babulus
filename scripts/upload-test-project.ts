#!/usr/bin/env tsx

/**
 * Upload test project to cloud for validation
 *
 * This script uploads a local test project directory to S3 via the Studio API,
 * creating the necessary Org, Project, Video, and ProjectFile records.
 *
 * Usage:
 *   tsx scripts/upload-test-project.ts \
 *     --project test-projects/introduction-video \
 *     --org-name "Test Organization" \
 *     --project-name "Introduction Video Test"
 */

import { Command } from "commander";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, basename } from "path";
import { Amplify } from "aws-amplify";

const program = new Command();

program
  .name("upload-test-project")
  .description("Upload a test project directory to cloud (S3 + API)")
  .requiredOption("--project <path>", "Path to test project directory")
  .option("--org-name <name>", "Organization name", "Test Organization")
  .option("--project-name <name>", "Project name (defaults to directory name)")
  .option("--video-title <title>", "Video title (defaults to DSL filename)")
  .option("--dry-run", "Show what would be uploaded without actually uploading", false)
  .action(async (opts) => {
    const projectDir = opts.project;
    const orgName = opts.orgName;
    const projectName = opts.projectName || basename(projectDir);
    const dryRun = opts.dryRun;

    console.log("=== Upload Test Project to Cloud ===");
    console.log(`Project Directory: ${projectDir}`);
    console.log(`Organization: ${orgName}`);
    console.log(`Project Name: ${projectName}`);
    console.log(`Dry Run: ${dryRun}`);
    console.log();

    // Find .babulus.xml or .babulus.ts file
    const files = readdirSync(projectDir);
    const dslFile =
      files.find(f => f.endsWith('.babulus.xml')) ??
      files.find(f => f.endsWith('.babulus.ts'));

    if (!dslFile) {
      console.error("❌ No .babulus.xml or .babulus.ts file found in project directory");
      process.exit(1);
    }

    const videoTitle = opts.videoTitle || dslFile.replace(/\.babulus\.(xml|ts)$/, '');
    console.log(`Video Title: ${videoTitle}`);
    console.log(`DSL File: ${dslFile}`);
    console.log();

    // Scan for assets
    const assetsDir = join(projectDir, 'assets');
    let assetFiles: string[] = [];

    try {
      const scanAssets = (dir: string, baseDir: string): string[] => {
        const items = readdirSync(dir);
        let files: string[] = [];

        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            files = files.concat(scanAssets(fullPath, baseDir));
          } else if (stat.isFile() && item !== '.gitkeep') {
            const relativePath = relative(baseDir, fullPath);
            files.push(relativePath);
          }
        }

        return files;
      };

      assetFiles = scanAssets(assetsDir, projectDir);
    } catch (e) {
      console.log("⚠️  No assets directory found (this is okay)");
    }

    console.log("Files to Upload:");
    console.log(`  📄 ${dslFile} (DSL script)`);
    for (const asset of assetFiles) {
      console.log(`  🎨 ${asset} (asset)`);
    }
    console.log();

    if (dryRun) {
      console.log("✅ Dry run complete - no files were uploaded");
      return;
    }

    // TODO: Actual upload implementation
    console.log("=== Upload Steps (TODO) ===");
    console.log("1. Configure Amplify with amplify_outputs.json");
    console.log("2. Check if organization exists or create it");
    console.log("3. Create project record");
    console.log("4. Upload DSL file as ProjectFile (fileType: 'video')");
    console.log("5. Upload each asset as ProjectFile (fileType: 'asset')");
    console.log("6. Create Video record pointing to DSL file");
    console.log("7. Output Project ID and Video ID for testing");
    console.log();
    console.log("⚠️  Implementation not complete yet");
    console.log("For now, upload manually via Studio UI at http://localhost:3000");
    console.log();
    console.log("Manual Steps:");
    console.log("1. Open Studio UI");
    console.log(`2. Create/select org: ${orgName}`);
    console.log(`3. Create project: ${projectName}`);
    console.log(`4. Upload ${dslFile} to project root`);
    for (const asset of assetFiles) {
      console.log(`5. Upload ${asset} to ${asset.replace(/\\/g, '/')}`);
    }
    console.log(`6. Create video: ${videoTitle}`);
    console.log(`7. Point video to ${dslFile}`);
    console.log("8. Click 'Generate' to trigger cloud generation");
  });

program.parse();
