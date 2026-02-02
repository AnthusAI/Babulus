/**
 * Upload generation artifacts to S3 and create GenerationRun record
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn } from 'aws-amplify/auth';
import { readFileSync } from 'fs';
import { WebSocket } from 'ws';

// @ts-ignore
global.WebSocket = WebSocket;

const outputs = JSON.parse(readFileSync('apps/studio-web/amplify_outputs.json', 'utf8'));
Amplify.configure(outputs);

const client = generateClient<any>({ authMode: 'userPool' });
const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

const VIDEO_ID = 'a422e6dd-d181-48d5-b4c6-f0c86771d39f';
const ORG_ID = '2ee41f23-4003-47c8-bd94-6f4ff46beab6'; // test-org
type GenerationRunCreateResult = { data?: { id?: string | null } | null; errors?: unknown };

async function main() {
  // Sign in as render worker
  const { isSignedIn } = await signIn({
    username: 'render-worker@babulus.internal',
    password: 'BabulusRenderWorker2026!'
  });

  if (!isSignedIn) {
    console.error('Failed to sign in');
    process.exit(1);
  }

  console.log('✓ Signed in as render worker');

  // Read local files from Tactus-web/videos
  const scriptPath = '../Tactus-web/videos/src/videos/intro/intro.script.json';
  const timelinePath = '../Tactus-web/videos/src/videos/intro/intro.timeline.json';
  const audioPath = '../Tactus-web/videos/public/babulus/intro.wav';

  const script = readFileSync(scriptPath, 'utf8');
  const timeline = readFileSync(timelinePath, 'utf8');
  const audio = readFileSync(audioPath);

  console.log(`✓ Read local files (${script.length + timeline.length + audio.length} bytes total)`);

  // Generate run ID
  const runId = `gen-${Date.now()}`;
  const s3Prefix = `org/${ORG_ID}/videos/${VIDEO_ID}/generations/${runId}`;

  // Upload to S3
  const bucket = outputs.storage.buckets.find((b: any) => b.name === 'studioAssets')?.bucket_name;
  if (!bucket) {
    console.error('Could not find studioAssets bucket');
    process.exit(1);
  }

  console.log(`Uploading to S3 bucket: ${bucket}`);

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${s3Prefix}/intro.script.json`,
    Body: script,
    ContentType: 'application/json'
  }));
  console.log(`✓ Uploaded script.json`);

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${s3Prefix}/intro.timeline.json`,
    Body: timeline,
    ContentType: 'application/json'
  }));
  console.log(`✓ Uploaded timeline.json`);

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${s3Prefix}/intro.wav`,
    Body: audio,
    ContentType: 'audio/wav'
  }));
  console.log(`✓ Uploaded audio file`);

  // Create GenerationRun record
  const { data: genRun, errors } = await client.models.GenerationRun.create({
    videoId: VIDEO_ID,
    orgId: ORG_ID,
    status: 'completed',
    scriptPath: `${s3Prefix}/intro.script.json`,
    timelinePath: `${s3Prefix}/intro.timeline.json`,
    audioPath: `${s3Prefix}/intro.wav`
  }) as GenerationRunCreateResult;

  if (errors) {
    console.error('Failed to create GenerationRun:', errors);
    process.exit(1);
  }

  console.log(`✓ Created GenerationRun: ${genRun?.id}`);
  console.log(`\nNow run: npx tsx test-render-job.ts`);
}

main().catch(console.error);
