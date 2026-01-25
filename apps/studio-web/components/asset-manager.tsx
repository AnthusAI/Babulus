"use client";

import { useProjectFiles } from "@/lib/use-org-data";
import { Image, Music, Film, File as FileIcon, Trash2, Copy, Eye, Upload, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { deleteProjectFileAction, uploadProjectFileAction } from "@/app/actions/project-files";
import { useState, useRef } from "react";

interface AssetManagerProps {
  projectId: string;
}

export function AssetManager({ projectId }: AssetManagerProps) {
  const { files, loading, error, refetch } = useProjectFiles(projectId);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, 'uploading' | 'success' | 'error'>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newUploading = new Map(uploadingFiles);

    for (const file of selectedFiles) {
      const filename = file.name;
      newUploading.set(filename, 'uploading');
    }
    setUploadingFiles(newUploading);

    for (const file of selectedFiles) {
      const filename = file.name;
      const relativePath = `assets/${filename}`;

      try {
        await uploadProjectFileAction(projectId, relativePath, file, 'asset', file.type);
        newUploading.set(filename, 'success');
        setUploadingFiles(new Map(newUploading));
      } catch (error) {
        console.error(`Failed to upload ${filename}:`, error);
        newUploading.set(filename, 'error');
        setUploadingFiles(new Map(newUploading));
      }
    }

    // Clear upload status after 2 seconds
    setTimeout(() => {
      setUploadingFiles(new Map());
      refetch();
    }, 2000);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext || '')) {
      return <Music className="h-4 w-4 text-purple-500" />;
    }
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) {
      return <Film className="h-4 w-4 text-red-500" />;
    }
    return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading && assetFiles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Assets</h3>
        </div>
        <div className="p-4 text-sm text-muted-foreground">Loading assets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Assets</h3>
        </div>
        <div className="p-4 text-sm text-destructive">Error loading assets: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Assets</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          className="h-7 text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File Tree */}
      <div className="space-y-1">
        {uploadingFiles.size > 0 && (
          <div className="space-y-1 mb-2">
            {Array.from(uploadingFiles.entries()).map(([filename, status]) => (
              <div
                key={filename}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
                  status === 'uploading' && "bg-blue-500/10 text-blue-600",
                  status === 'success' && "bg-green-500/10 text-green-600",
                  status === 'error' && "bg-red-500/10 text-red-600"
                )}
              >
                {getFileIcon(filename)}
                <span className="flex-1 truncate">{filename}</span>
                <span className="text-[10px] uppercase font-medium">
                  {status === 'uploading' ? 'Uploading...' : status === 'success' ? 'Done' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        )}

        {assetFiles.length === 0 && uploadingFiles.size === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center border rounded-md border-dashed">
            No assets yet. Click Upload to add files.
          </div>
        ) : (
          assetFiles.map((file: any) => {
            const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file.relativePath);
            const displayName = file.relativePath.replace('assets/', '');

            return (
              <div
                key={file.id}
                className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/40 transition-colors"
              >
                {/* Icon or Thumbnail */}
                {isImage && file.url ? (
                  <div className="w-5 h-5 rounded flex-shrink-0 overflow-hidden bg-muted border">
                    <img
                      src={file.url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    {getFileIcon(file.relativePath)}
                  </div>
                )}

                {/* File Name */}
                <span className="flex-1 text-xs truncate">{displayName}</span>

                {/* File Size */}
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {(file.sizeBytes / 1024).toFixed(0)}KB
                </span>

                {/* Action Buttons (show on hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => window.open(file.url, '_blank')}
                      title="View"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6",
                      copiedPath === file.relativePath && "text-green-600"
                    )}
                    onClick={(e) => handleCopyPath(file.relativePath, e)}
                    title="Copy path"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(file.relativePath, e)}
                    disabled={deletingFile === file.relativePath}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
