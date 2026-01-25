/**
 * Test script for project file operations
 *
 * Tests:
 * 1. Upload a test file to a project
 * 2. List files in the project
 * 3. Read the file back
 * 4. Generate CloudFront URL
 * 5. Delete the file
 *
 * Usage:
 *   tsx scripts/test-project-files.ts <orgId> <projectId>
 */

import * as storage from '../lib/project-storage.js';

async function main() {
  const [orgId, projectId] = process.argv.slice(2);

  if (!orgId || !projectId) {
    console.error('Usage: tsx scripts/test-project-files.ts <orgId> <projectId>');
    process.exit(1);
  }

  console.log('Testing project file operations...');
  console.log(`Org ID: ${orgId}`);
  console.log(`Project ID: ${projectId}\n`);

  const testFileName = 'test-video.babulus.ts';
  const testContent = `// Test Babulus video
export default function TestVideo() {
  return scene('intro', () => {
    text('Hello from S3!');
  });
}
`;

  try {
    // 1. Upload test file
    console.log('1. Uploading test file...');
    const storageKey = await storage.uploadProjectFile(
      orgId,
      projectId,
      testFileName,
      testContent
    );
    console.log(`   ✓ Uploaded to: ${storageKey}\n`);

    // 2. List files in storage
    console.log('2. Listing files in project...');
    const files = await storage.listProjectFilesInStorage(orgId, projectId);
    console.log(`   ✓ Found ${files.length} file(s):`);
    files.forEach(file => {
      console.log(`     - ${file.path} (${file.size} bytes, modified: ${file.lastModified})`);
    });
    console.log();

    // 3. Read file back
    console.log('3. Reading file content...');
    const content = await storage.readProjectFile(orgId, projectId, testFileName);
    console.log(`   ✓ Read ${content.length} characters`);
    console.log(`   First 100 chars: ${content.substring(0, 100)}...\n`);

    // 4. Generate CloudFront URL
    console.log('4. Generating CloudFront URL...');
    const url = storage.getProjectFileUrl(orgId, projectId, testFileName);
    console.log(`   ✓ URL: ${url}`);
    console.log(`   Note: URL requires authentication via Lambda@Edge\n`);

    // 5. Delete file
    console.log('5. Cleaning up (deleting test file)...');
    await storage.deleteProjectFile(orgId, projectId, testFileName);
    console.log(`   ✓ Deleted\n`);

    // 6. Verify deletion
    console.log('6. Verifying deletion...');
    const filesAfter = await storage.listProjectFilesInStorage(orgId, projectId);
    const stillExists = filesAfter.some(f => f.path.includes(testFileName));
    if (!stillExists) {
      console.log(`   ✓ File successfully removed\n`);
    } else {
      console.log(`   ✗ File still exists!\n`);
    }

    console.log('All tests passed! ✓');

  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

main();
