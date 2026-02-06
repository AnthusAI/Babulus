"use client";

import type { PreviewPlayerProps } from "@/components/preview-player";
import type { VomPatchInput } from "@/lib/dsl-executor";
import { VideomlDomPlayer } from "@/components/videoml-dom-player";

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

type VomPreviewPlayerProps = {
  xml: string;
  patches?: VomPatchInput[];
  enforceSealed?: boolean;
  className?: string;
} & Omit<PreviewPlayerProps, "script">;

export function VomPreviewPlayer({
  xml,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  autoPlay = true,
  loop = false,
  clockMode = "live",
  onTimeUpdate,
  className,
}: VomPreviewPlayerProps) {
  return (
    <VideomlDomPlayer
      xml={xml}
      width={width}
      height={height}
      autoPlay={autoPlay}
      loop={loop}
      clockMode={clockMode}
      onTimeUpdate={onTimeUpdate}
      className={className}
    />
  );
}
