import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn } from 'aws-amplify/auth';
import { readFileSync } from 'fs';

// Polyfill WebSocket
import { WebSocket } from 'ws';
// @ts-ignore
global.WebSocket = WebSocket;

// Load Amplify config
const outputs = JSON.parse(readFileSync('apps/studio-web/amplify_outputs.json', 'utf8'));
Amplify.configure(outputs);

const client = generateClient<any>({ authMode: 'userPool' });

function requireWorkerPassword(): string {
  const password = process.env.WORKER_PASSWORD;
  if (!password) {
    console.error('WORKER_PASSWORD environment variable is required (the render-worker password).');
    process.exit(1);
  }
  return password;
}

async function main() {
  // Login as worker
  const { isSignedIn } = await signIn({
    username: 'render-worker@babulus.internal',
    password: requireWorkerPassword()
  });

  if (!isSignedIn) {
    console.error('Failed to sign in');
    process.exit(1);
  }

  console.log('✓ Signed in as render worker');

  // Get the first video
  const { data: videos } = await client.models.Video.list();
  if (!videos || videos.length === 0) {
    console.error('No videos found');
    process.exit(1);
  }

  const video = videos[0];
  console.log(`Using video: ${video.id} - ${video.title}`);

  // Create a generation job
  const jobInput = {
    videoId: video.id
  };

  const { data: job, errors: jobErrors } = await client.models.Job.create({
    kind: 'generate',
    status: 'queued',
    orgId: video.orgId,
    inputJson: JSON.stringify(jobInput)
  });

  if (jobErrors) {
    console.error('Failed to create generation job:', jobErrors);
    process.exit(1);
  }

  console.log(`✓ Created generation job: ${job?.id}`);
  console.log(`\nNow run the generation worker to process this job.`);
  console.log(`After generation completes, run: npx tsx test-render-job.ts`);
}

main().catch(console.error);
