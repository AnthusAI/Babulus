#!/usr/bin/env tsx
/**
 * Inspection script to view project data in the deployed Amplify backend
 * Usage: npx tsx scripts/inspect-project.ts
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { fetchAuthSession } from 'aws-amplify/auth';
import amplifyConfig from '../apps/studio-web/amplify_outputs.json';

Amplify.configure(amplifyConfig);

const client = generateClient<any>({
  authMode: 'apiKey',
});

async function inspectProjects() {
  console.log('🔍 Inspecting Babulus Studio Projects...\n');

  try {
    // List all projects
    const { data: projects, errors: projectErrors } = await client.models.Project.list();

    if (projectErrors) {
      console.error('❌ Error fetching projects:', projectErrors);
      return;
    }

    console.log(`📁 Found ${projects?.length || 0} projects:\n`);

    if (!projects || projects.length === 0) {
      console.log('   No projects found. Create one in the UI first!\n');
      return;
    }

    for (const project of projects) {
      console.log(`📦 Project: ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Org ID: ${project.orgId}`);
      console.log(`   Created: ${new Date(project.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(project.updatedAt).toLocaleString()}\n`);

      // Get videos for this project
      const { data: videos } = await client.models.Video.list({
        filter: { projectId: { eq: project.id } },
      });

      if (videos && videos.length > 0) {
        console.log(`   🎬 Videos (${videos.length}):`);
        for (const video of videos) {
          console.log(`      - ${video.title || 'Untitled'} (${video.id})`);
          console.log(`        Folder: org/${project.orgId}/projects/${project.id}/videos/${video.id}/`);

          // Get storyboard versions
          const { data: storyboards } = await client.models.StoryboardVersion.list({
            filter: { videoId: { eq: video.id } },
          });

          if (storyboards && storyboards.length > 0) {
            console.log(`        📝 Storyboard Versions: ${storyboards.length}`);
            for (const sb of storyboards) {
              console.log(`           v${sb.version}: ${sb.status} (${sb.dslArtifactKey ? 'has DSL' : 'no DSL'})`);
            }
          }

          // Get generation runs
          const { data: generations } = await client.models.GenerationRun.list({
            filter: { videoId: { eq: video.id } },
          });

          if (generations && generations.length > 0) {
            console.log(`        🎵 Generation Runs: ${generations.length}`);
            for (const gen of generations) {
              console.log(`           ${gen.id.substring(0, 8)}... status: ${gen.status}`);
              if (gen.scriptArtifactKey) {
                console.log(`             script: ${gen.scriptArtifactKey}`);
              }
              if (gen.audioArtifactKey) {
                console.log(`             audio: ${gen.audioArtifactKey}`);
              }
            }
          }

          // Get render runs
          const { data: renders } = await client.models.RenderRun.list({
            filter: { videoId: { eq: video.id } },
          });

          if (renders && renders.length > 0) {
            console.log(`        🎥 Render Runs: ${renders.length}`);
            for (const render of renders) {
              console.log(`           ${render.id.substring(0, 8)}... status: ${render.status}`);
              if (render.mp4ArtifactKey) {
                console.log(`             MP4: ${render.mp4ArtifactKey}`);
              }
            }
          }

          console.log('');
        }
      } else {
        console.log(`   📭 No videos yet\n`);
      }
    }

    // Check for jobs
    const { data: jobs } = await client.models.Job.list({
      limit: 10,
    });

    if (jobs && jobs.length > 0) {
      console.log(`\n⚙️  Recent Jobs (${jobs.length}):`);
      for (const job of jobs) {
        console.log(`   ${job.kind}: ${job.status} (${job.id.substring(0, 8)}...)`);
        if (job.videoId) {
          console.log(`      video: ${job.videoId}`);
        }
      }
    }

    // Check for published videos
    const { data: published } = await client.models.PublishedVideo.list();

    if (published && published.length > 0) {
      console.log(`\n🌐 Published Videos (${published.length}):`);
      for (const pub of published) {
        console.log(`   /${pub.slug} - ${pub.accessPolicy} (${pub.viewCount} views)`);
        console.log(`      video: ${pub.videoId}`);
        console.log(`      URL: https://studio.babulus.ai/share/${pub.slug}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

// Run inspection
inspectProjects().catch(console.error);
