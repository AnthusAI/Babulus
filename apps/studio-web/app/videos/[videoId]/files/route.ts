/**
 * API route to serve rendered video files
 * GET /videos/[videoId]/files - Lists available files
 * GET /videos/[videoId]/files?type=mp4 - Returns redirect to latest MP4
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import { cookies } from 'next/headers';
import { accountAccessResponse } from '@/lib/account-authorization';
import { requireAccountForRequest } from '@/lib/account-session';
import { presignAccountDownload } from '@/lib/account-media';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    const searchParams = request.nextUrl.searchParams;
    const fileType = searchParams.get('type');

    // The server client carries the caller's own session, so AppSync returns only rows of the caller's Accounts.
    const client = generateServerClientUsingCookies<any>({
      config: require('../../../../amplify_outputs.json'),
      cookies,
    });

    // Fetch video to verify access
    const { data: video, errors: videoErrors } = await client.models.Video.get({ id: videoId });

    if (videoErrors || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // The video's Account must be one the verified ID token names.
    const { accountId } = await requireAccountForRequest(request, (video as any).orgId);

    // Get render runs for this video
    const { data: renders } = await client.models.RenderRun.list({
      filter: { videoId: { eq: videoId } },
    });

    if (!renders || renders.length === 0) {
      return NextResponse.json(
        { error: 'No rendered files available', videoId },
        { status: 404 }
      );
    }

    // Sort by creation date (newest first)
    const sortedRenders = [...renders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Find succeeded renders
    const succeededRenders = sortedRenders.filter((r) => r.status === 'succeeded');

    if (succeededRenders.length === 0) {
      return NextResponse.json(
        {
          error: 'No successful renders available',
          videoId,
          pendingRenders: sortedRenders.filter((r) => ['queued', 'running'].includes(r.status)).length,
        },
        { status: 404 }
      );
    }

    const latestRender = succeededRenders[0];

    // If specific file type requested, redirect to it
    if (fileType === 'mp4' && latestRender.mp4ArtifactKey) {
      try {
        const url = await presignAccountDownload(accountId, latestRender.mp4ArtifactKey);

        return NextResponse.redirect(url);
      } catch (e) {
        console.error('Error generating signed URL:', e);
        return NextResponse.json(
          { error: 'Failed to generate download URL' },
          { status: 500 }
        );
      }
    }

    // Return list of available files
    const files = [];
    if (latestRender.mp4ArtifactKey) {
      files.push({
        type: 'mp4',
        path: latestRender.mp4ArtifactKey,
        url: `/videos/${videoId}/files?type=mp4`,
        renderId: latestRender.id,
        createdAt: latestRender.createdAt,
      });
    }

    return NextResponse.json({
      videoId,
      files,
      latestRender: {
        id: latestRender.id,
        status: latestRender.status,
        createdAt: latestRender.createdAt,
      },
      allRenders: sortedRenders.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        hasMP4: !!r.mp4ArtifactKey,
      })),
    });
  } catch (error) {
    const refusal = accountAccessResponse(error);
    if (refusal) return refusal;
    console.error('Files route error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
