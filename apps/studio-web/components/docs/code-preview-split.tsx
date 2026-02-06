"use client";

import { ReactNode } from "react";

type CodePreviewSplitProps = {
  code: ReactNode;
  preview: ReactNode;
  codeTitle?: string;
  previewTitle?: string;
  splitRatio?: "50-50" | "60-40" | "40-60";
};

export function CodePreviewSplit({
  code,
  preview,
  codeTitle,
  previewTitle,
  splitRatio = "60-40",
}: CodePreviewSplitProps) {
  const gridCols =
    splitRatio === "50-50"
      ? "md:grid-cols-2"
      : splitRatio === "60-40"
      ? "md:grid-cols-[3fr_2fr]"
      : "md:grid-cols-[2fr_3fr]";

  return (
    <div className={`my-6 grid grid-cols-1 ${gridCols} gap-4`}>
      {/* Code Panel */}
      <div className="flex flex-col rounded-lg border border-border bg-muted/30 overflow-hidden">
        {codeTitle && (
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <div className="text-sm font-medium text-foreground/80">
              {codeTitle}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4">
          <div className="text-sm">{code}</div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex flex-col rounded-lg border border-border bg-background overflow-hidden">
        {previewTitle && (
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <div className="text-sm font-medium text-foreground/80">
              {previewTitle}
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/20">
          {preview}
        </div>
      </div>
    </div>
  );
}
