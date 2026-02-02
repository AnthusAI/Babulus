/**
 * Create GenerationRun record in DynamoDB
 */
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

const VIDEO_ID = 'a422e6dd-d181-48d5-b4c6-f0c86771d39f';
const ORG_ID = '2ee41f23-4003-47c8-bd94-6f4ff46beab6';
const RUN_ID = process.argv[2] || 'gen-1769973903';
type GenerationRunCreateResult = { data?: { id?: string | null } | null; errors?: unknown };

async function main() {
  const { isSignedIn } = await signIn({
    username: 'render-worker@babulus.internal',
    password: 'BabulusRenderWorker2026!'
  });

  if (!isSignedIn) {
    console.error('Failed to sign in');
    process.exit(1);
  }

  const s3Prefix = `org/${ORG_ID}/videos/${VIDEO_ID}/generations/${RUN_ID}`;

  const { data: genRun, errors } = await client.models.GenerationRun.create({
    videoId: VIDEO_ID,
    orgId: ORG_ID,
    status: 'completed',
    scriptArtifactKey: `${s3Prefix}/intro.script.json`,
    timelineArtifactKey: `${s3Prefix}/intro.timeline.json`,
    audioArtifactKey: `${s3Prefix}/intro.wav`
  }) as GenerationRunCreateResult;

  if (errors) {
    console.error('Failed to create GenerationRun:', errors);
    process.exit(1);
  }

  console.log(`✓ Created GenerationRun: ${genRun?.id}`);
  console.log(`\nNow run: npx tsx test-render-job.ts`);
}

main().catch(console.error);
