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

async function main() {
  // Login as worker
  const { isSignedIn } = await signIn({
    username: 'render-worker@babulus.internal',
    password: 'BabulusRenderWorker2026!'
  });

  if (!isSignedIn) {
    console.error('Failed to sign in');
    process.exit(1);
  }

  console.log('✓ Signed in as render worker');

  // List existing videos
  const { data: videos, errors } = await client.models.Video.list();
  const videoCount = videos?.length || 0;
  console.log(`Found ${videoCount} videos`);

  if (videos && videos.length > 0) {
    const video = videos[0];
    console.log(`Using video: ${video.id} - ${video.title}`);

    // Check for generation runs
    const { data: runs } = await client.models.GenerationRun.list({
      filter: { videoId: { eq: video.id } }
    });
    const runCount = runs?.length || 0;
    console.log(`Found ${runCount} generation runs`);

    if (runs && runs.length > 0) {
      const run = runs[0];
      console.log(`Using generation run: ${run.id}`);

      // Create a render job
      const jobInput = {
        videoId: video.id,
        generationRunId: run.id
      };

      const { data: job, errors: jobErrors } = await client.models.Job.create({
        kind: 'render',
        status: 'queued',
        orgId: video.orgId,
        inputJson: JSON.stringify(jobInput)
      });

      if (jobErrors) {
        console.error('Failed to create job:', jobErrors);
        process.exit(1);
      }

      console.log(`✓ Created render job: ${job?.id}`);
      console.log(`\nTo test locally, run: ./test-ecs-worker.sh ${job?.id}`);
      process.exit(0);
    }
  }

  console.log('No videos or generation runs found. Need to create test data first.');
  process.exit(1);
}

main().catch(console.error);
