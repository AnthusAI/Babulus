"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * This route redirects to the editor for the video.
 * Use /editor/[videoId] for editing videos.
 * Use /share/[slug] for viewing published videos.
 */
export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  useEffect(() => {
    // Redirect to editor
    router.push(`/editor/${videoId}`);
  }, [videoId, router]);

  return (
    <div className="p-8 flex justify-center text-muted-foreground">
      Redirecting to editor...
    </div>
  );
}
