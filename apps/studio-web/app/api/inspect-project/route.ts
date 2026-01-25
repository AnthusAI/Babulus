/**
 * API endpoint to inspect project/video data for debugging
 * Usage:
 *   GET /api/inspect-project?projectId=xxx
 *   GET /api/inspect-project?videoId=xxx
 *   GET /api/inspect-project?orgId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const videoId = searchParams.get('videoId');
    const orgId = searchParams.get('orgId');

    if (!projectId && !videoId && !orgId) {
      return NextResponse.json(
        { error: 'Missing parameter: projectId, videoId, or orgId required' },
        { status: 400 }
      );
    }

    // Create authenticated client using user's session
    const client = generateClient<any>({
      authMode: 'userPool',
    });

    let project: any = null;
    let targetProjectId = projectId;
    let targetVideoId = videoId;

    // If videoId provided, fetch video to get projectId
    if (videoId && !projectId) {
      const { data: videoRaw } = await client.models.Video.get({ id: videoId });
      const video = videoRaw as any;
      if (video) {
        targetProjectId = video.projectId;
        targetVideoId = video.id;
      }
    }

    // If orgId provided, fetch all projects in org
    if (orgId && !projectId && !videoId) {
      const { data: projects } = await client.models.Project.list({
        filter: { orgId: { eq: orgId } },
      });

      return NextResponse.json({
        orgId,
        projects: projects?.map((p: any) => ({
          id: p.id,
          name: p.name,
          orgId: p.orgId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        s3Bucket: 'amplify-d3epcqvzbxdaq-mai-studioassetsbucket24d70d-i5sgnnzyeqk8',
        s3Region: 'us-east-1',
      });
    }

    // Fetch project
    if (targetProjectId) {
      const { data: projectRaw, errors: projectErrors } = await client.models.Project.get({ id: targetProjectId });
      project = projectRaw as any;

      if (projectErrors) {
        return NextResponse.json(
          { error: 'Failed to fetch project', details: projectErrors },
          { status: 500 }
        );
      }

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Fetch videos for this project
    const { data: videos } = await client.models.Video.list({
      filter: { projectId: { eq: targetProjectId } },
    });

    const videoData = await Promise.all(
      (videos || []).map(async (video) => {
        // Get storyboard versions
        const { data: storyboards } = await client.models.StoryboardVersion.list({
          filter: { videoId: { eq: video.id } },
        });

        // Get generation runs
        const { data: generations } = await client.models.GenerationRun.list({
          filter: { videoId: { eq: video.id } },
        });

        // Get render runs
        const { data: renders } = await client.models.RenderRun.list({
          filter: { videoId: { eq: video.id } },
        });

        return {
          ...video,
          s3Path: `org/${project.orgId}/projects/${targetProjectId}/videos/${video.id}/`,
          storyboards: storyboards?.map((sb) => ({
            id: sb.id,
            version: sb.version,
            status: sb.status,
            hasDSL: !!sb.dslArtifactKey,
            dslPath: sb.dslArtifactKey,
            createdAt: sb.createdAt,
            updatedAt: sb.updatedAt,
          })),
          generations: generations?.map((gen) => ({
            id: gen.id,
            status: gen.status,
            scriptPath: gen.scriptArtifactKey,
            audioPath: gen.audioArtifactKey,
            createdAt: gen.createdAt,
          })),
          renders: renders?.map((render) => ({
            id: render.id,
            status: render.status,
            mp4Path: render.mp4ArtifactKey,
            createdAt: render.createdAt,
          })),
        };
      })
    );

    // Get recent jobs for this project
    const { data: jobs } = await client.models.Job.list({
      filter: { projectId: { eq: targetProjectId } },
      limit: 20,
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        orgId: project.orgId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      videos: videoData,
      recentJobs: jobs?.map((job) => ({
        id: job.id,
        kind: job.kind,
        status: job.status,
        videoId: job.videoId,
        createdAt: job.createdAt,
      })),
      s3Bucket: 'amplify-d3epcqvzbxdaq-mai-studioassetsbucket24d70d-i5sgnnzyeqk8',
      s3Region: 'us-east-1',
    });
  } catch (error) {
    console.error('Inspection error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
