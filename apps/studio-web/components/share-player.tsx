"use client";

import { useEffect, useState } from "react";
// @ts-ignore
import { getUrl } from "aws-amplify/storage";
import { Player, StoryboardRenderer } from "@babulus/renderer";
import type { PublishedVideo } from "@babulus/shared";
import { Loader2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { incrementViewCountAction } from "@/app/actions";

function formatViewCount(count: number | null | undefined): string {
  if (!count || count === 0) return "0 views";
  if (count === 1) return "1 view";
  if (count < 1000) return `${count} views`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K views`;
  return `${(count / 1000000).toFixed(1)}M views`;
}

export function SharePlayer({ video }: { video: PublishedVideo }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number>(video.viewCount || 0);

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

  useEffect(() => {
    // Increment view count with debouncing using localStorage
    const viewKey = `viewed_${video.id}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Only count as a view if not viewed in the last hour
    if (!lastViewed || now - parseInt(lastViewed) > oneHour) {
      incrementViewCountAction(video.id)
        .then(() => {
          localStorage.setItem(viewKey, now.toString());
          setViewCount((prev) => prev + 1);
        })
        .catch((err) => {
          console.error("Failed to increment view count", err);
        });
    }
  }, [video.id]);

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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span>{formatViewCount(viewCount)}</span>
          </div>
          <span className="text-xs text-muted-foreground">
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
