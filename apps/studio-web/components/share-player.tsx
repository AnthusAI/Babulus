"use client";

import { useEffect, useState } from "react";
// @ts-ignore
import { getUrl } from "aws-amplify/storage";
import { Player, StoryboardRenderer } from "@babulus/renderer";
import type { PublishedVideo } from "@babulus/shared";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SharePlayer({ video }: { video: PublishedVideo }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Construct the expected key based on our publish logic
    const key = `published/${video.slug}.mp4`;
    
    getUrl({ 
      path: key,
      // For guest access, we don't strictly need options if unauth is configured,
      // but ensure we don't try to use user credentials if not logged in.
      // Amplify should handle this if configured correctly.
    })
      .then((res) => setSrc(res.url.toString()))
      .catch((err) => {
        console.error("Failed to load video URL", err);
        setError("Could not load video. It may not be ready yet.");
      });
  }, [video.slug]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-black text-white rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-black text-white rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative shadow-2xl ring-1 ring-white/10">
        <video 
          src={src} 
          controls 
          autoPlay 
          className="w-full h-full"
          poster="/placeholder-poster.png" // We could generate a poster too
        />
      </div>
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col">
            {/* We could add title here if we fetched it, but PublishedVideo doesn't have title yet. 
                Ideally PublishedVideo should copy title from Video. 
                For now we just show views or date. */}
            <span className="text-sm text-muted-foreground">
                Published {new Date(video.publishedAt).toLocaleDateString()}
            </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open(src, '_blank')}>
            <Download className="w-4 h-4 mr-2" />
            Download
        </Button>
      </div>
    </div>
  );
}
