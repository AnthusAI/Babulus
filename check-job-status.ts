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

  console.log('✓ Signed in as render worker\n');

  // Get all jobs
  const { data: jobs } = await client.models.Job.list();

  console.log('=== All Jobs ===');
  jobs?.forEach((job: any) => {
    console.log(`${job.kind} job ${job.id}:`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Created: ${job.createdAt}`);
    if (job.failureReason) {
      console.log(`  Error: ${job.failureReason}`);
    }
    console.log('');
  });

  // Get generation runs
  const { data: runs } = await client.models.GenerationRun.list();
  console.log('=== Generation Runs ===');
  if (runs && runs.length > 0) {
    runs.forEach((run: any) => {
      console.log(`Run ${run.id}:`);
      console.log(`  Video: ${run.videoId}`);
      console.log(`  Status: ${run.status}`);
      console.log(`  Script: ${run.scriptArtifactKey ? '✓' : '✗'}`);
      console.log(`  Audio: ${run.audioArtifactKey ? '✓' : '✗'}`);
      console.log('');
    });
  } else {
    console.log('No generation runs found');
  }
}

main().catch(console.error);
