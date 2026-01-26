import { readFileSync } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import outputs from '../amplify_outputs.json';

const VIDEO_ID = 'a422e6dd-d181-48d5-b4c6-f0c86771d39f';
const ORG_ID = process.env.ORG_ID || '';
const PROJECT_ID = process.env.PROJECT_ID || '';
const VIDEO_TITLE = 'my-video'; // Replace with actual title

if (!ORG_ID || !PROJECT_ID) {
  console.error('Set ORG_ID and PROJECT_ID environment variables');
  process.exit(1);
}

// Read the correct DSL file from test-projects
const correctDsl = readFileSync('../../../test-projects/styles-demo/styles-demo.babulus.ts', 'utf-8');

const client = new S3Client({
  region: outputs.storage.aws_region,
});

const fileName = `${VIDEO_TITLE.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.babulus.ts`;
const storageKey = `org/${ORG_ID}/projects/${PROJECT_ID}/${fileName}`;

async function upload() {
  await client.send(new PutObjectCommand({
    Bucket: outputs.storage.bucket_name,
    Key: storageKey,
    Body: correctDsl,
    ContentType: 'text/typescript'
  }));
  console.log(`Uploaded to ${storageKey}`);
}

upload().catch(console.error);
