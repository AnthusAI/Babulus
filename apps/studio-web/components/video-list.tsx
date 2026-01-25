"use client";

import { useVideos } from "@/lib/use-org-data";
import { CreateVideoDialog } from "./create-video-dialog";
import { Film, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface VideoListProps {
  orgId: string;
  projectId: string;
  selectedVideoId?: string | null;
  onSelectVideo: (videoId: string) => void;
}

export function VideoList({ orgId, projectId, selectedVideoId, onSelectVideo }: VideoListProps) {
  const { videos, loading, error, refetch } = useVideos(orgId, projectId);

  if (loading && videos.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">Loading videos...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">Error loading videos: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="studio-panel-title">Videos</h3>
        <CreateVideoDialog orgId={orgId} projectId={projectId} onVideoCreated={refetch} />
      </div>

      {videos.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border rounded-md border-dashed">
          No videos found. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-1">
          {videos.map((video) => (
            <button
              key={video.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent/40",
                selectedVideoId === video.id && "bg-accent/60"
              )}
              onClick={() => onSelectVideo(video.id)}
            >
              <Film className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium leading-none">{video.title}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : "Unknown date"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
