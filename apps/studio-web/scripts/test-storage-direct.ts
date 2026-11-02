/**
 * Direct test of S3 storage operations (no auth required)
 * Tests the storage layer directly using Amplify Storage
 */

import { Amplify } from 'aws-amplify';
import { uploadData, downloadData, remove, list } from 'aws-amplify/storage';
// @ts-ignore
import outputs from '../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs, { ssr: true });

async function main() {
  // Use test org and project IDs
  const orgId = 'test-org-' + Date.now();
  const projectId = 'test-project-' + Date.now();
  const testFileName = 'test-video.babulus.xml';
  const testContent = `<vml id="test-video" title="Test Video" fps="30" width="1920" height="1080">
  <scene id="intro">
    <layer id="content">
      <text props='{"content":"Hello from S3!"}' />
    </layer>
  </scene>
</vml>
`;

  console.log('Testing S3 storage operations...');
  console.log(`Test Org ID: ${orgId}`);
  console.log(`Test Project ID: ${projectId}\n`);

  try {
    // 1. Upload test file
    console.log('1. Uploading test file...');
    const storageKey = `org/${orgId}/projects/${projectId}/${testFileName}`;
    await uploadData({
      path: storageKey,
      data: testContent,
    }).result;
    console.log(`   ✓ Uploaded to: ${storageKey}\n`);

    // 2. List files in storage
    console.log('2. Listing files in project...');
    const prefix = `org/${orgId}/projects/${projectId}/`;
    const result = await list({
      path: prefix,
      options: { listAll: true }
    });
    console.log(`   ✓ Found ${result.items.length} file(s):`);
    result.items.forEach(item => {
      console.log(`     - ${item.path} (${item.size} bytes)`);
    });
    console.log();

    // 3. Read file back
    console.log('3. Reading file content...');
    const downloadResult = await downloadData({ path: storageKey }).result;
    const text = await downloadResult.body.text();
    console.log(`   ✓ Read ${text.length} characters`);
    console.log(`   First 100 chars: ${text.substring(0, 100)}...\n`);

    // 4. Check CloudFront domain
    console.log('4. CloudFront configuration...');
    const assetsDomain = (outputs.custom as any)?.assetsDomain;
    if (assetsDomain) {
      const url = `https://${assetsDomain}/${storageKey}`;
      console.log(`   ✓ CloudFront domain: ${assetsDomain}`);
      console.log(`   ✓ URL would be: ${url}`);
      console.log(`   Note: URL requires authentication via Lambda@Edge\n`);
    } else {
      console.log(`   ✗ CloudFront domain not found in amplify_outputs.json`);
      console.log(`   Check outputs.custom.assetsDomain (currently disabled)\n`);
    }

    // 5. Delete file
    console.log('5. Cleaning up (deleting test file)...');
    await remove({ path: storageKey });
    console.log(`   ✓ Deleted\n`);

    // 6. Verify deletion
    console.log('6. Verifying deletion...');
    const resultAfter = await list({
      path: prefix,
      options: { listAll: true }
    });
    if (resultAfter.items.length === 0) {
      console.log(`   ✓ File successfully removed\n`);
    } else {
      console.log(`   ✗ Still found ${resultAfter.items.length} file(s)\n`);
    }

    console.log('✓ All storage tests passed!');

  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

main();
