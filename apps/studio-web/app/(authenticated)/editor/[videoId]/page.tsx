"use client";

import { AppLayout } from "@/components/app-layout";
import { VideoEditor } from "@/components/video-editor";
import { useOrgs } from "@/lib/use-org-data";
import { fetchProject, fetchVideo } from "@/lib/client-data";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Building2, FolderKanban, Film } from "lucide-react";
import { UserNav } from "@/components/user-nav";
import type { Project, Video } from "@babulus/shared";

export default function VideoEditorPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const { orgs } = useOrgs();
  const [video, setVideo] = useState<Video | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch video and then project
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const vid = await fetchVideo(videoId);
        setVideo(vid);
        if (vid?.projectId) {
          const proj = await fetchProject(vid.projectId);
          setProject(proj);
        }
      } catch (e) {
        console.error('Failed to load video:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [videoId]);

  const org = orgs.find((o) => o.id === project?.orgId);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Breadcrumb Navigation Header */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-4 py-0.5 border-b bg-card">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Babulus
          </button>
          <div className="flex items-center justify-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 font-medium"
              onClick={() => org && router.push(`/organizations/${org.id}`)}
            >
              <Building2 className="mr-1 h-4 w-4 text-muted-foreground" />
              {org?.name || 'Loading...'}
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 font-medium"
              onClick={() => project && router.push(`/projects/${project.id}`)}
            >
              <FolderKanban className="mr-1 h-4 w-4 text-muted-foreground" />
              {project?.name || 'Loading...'}
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium px-2 inline-flex items-center">
              <Film className="mr-1 h-4 w-4 text-muted-foreground" />
              {video?.title || 'Loading...'}
            </span>
          </div>
          <UserNav />
        </div>

        {/* Video Editor */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center text-muted-foreground">
              Loading video...
            </div>
          ) : !video ? (
            <div className="p-8 flex flex-col items-center gap-4">
              <h2 className="text-xl font-semibold">Video not found</h2>
              <p className="text-muted-foreground">
                The video with ID {videoId} does not exist or you don't have access to it.
              </p>
            </div>
          ) : (
            <VideoEditor
              videoId={videoId}
              orgId={video.orgId}
              projectId={video.projectId}
              onBack={() => router.push(`/projects/${video.projectId}`)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
