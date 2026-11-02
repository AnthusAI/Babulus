"use client";

import { useProjectFiles } from "@/lib/use-org-data";
import NextImage from "next/image";
import { Image as ImageIcon, Music, Film, File as FileIcon, Trash2, Copy, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { deleteProjectFileAction } from "@/app/actions/project-files";
import { useState } from "react";

interface AssetBrowserProps {
  projectId: string;
}

export function AssetBrowser({ projectId }: AssetBrowserProps) {
  const { files, loading, error, refetch } = useProjectFiles(projectId);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Filter to show only assets
  const assetFiles = files.filter((f: any) => f.fileType === 'asset');

  const handleDelete = async (relativePath: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Delete ${relativePath}?`)) return;

    setDeletingFile(relativePath);
    try {
      await deleteProjectFileAction(projectId, relativePath);
      await refetch();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      alert('Failed to delete asset');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleCopyPath = (relativePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`./${relativePath}`);
    setCopiedPath(relativePath);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext || '')) {
      return <Music className="h-4 w-4" />;
    }
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) {
      return <Film className="h-4 w-4" />;
    }
    return <FileIcon className="h-4 w-4" />;
  };

  if (loading && assetFiles.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">Loading assets...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">Error loading assets: {error.message}</div>;
  }

  return (
    <div className="space-y-2">
      {assetFiles.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
          No assets uploaded yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {assetFiles.map((file: any) => {
            const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file.relativePath);

            return (
              <div
                key={file.id}
                className="flex items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/40 border"
              >
                {isImage && file.url ? (
                  <div className="w-12 h-12 rounded border flex-shrink-0 overflow-hidden bg-muted relative">
                    <NextImage
                      src={file.url}
                      alt={file.relativePath}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded border flex-shrink-0 flex items-center justify-center bg-muted">
                    {getFileIcon(file.relativePath)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-none truncate">
                    {file.relativePath.replace('assets/', '')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(file.sizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {file.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(file.url, '_blank')}
                      title="Open in new tab"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      copiedPath === file.relativePath && "text-green-600"
                    )}
                    onClick={(e) => handleCopyPath(file.relativePath, e)}
                    title="Copy path for use in code"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(file.relativePath, e)}
                    disabled={deletingFile === file.relativePath}
                    title="Delete asset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
