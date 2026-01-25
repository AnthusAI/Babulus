"use client";

import { useProjectFiles } from "@/lib/use-org-data";
import { File, FileCode, Trash2, Eye, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { deleteProjectFileAction } from "@/app/actions/project-files";
import { useState } from "react";

interface ProjectFileListProps {
  projectId: string;
  selectedFileId?: string | null;
  onSelectFile?: (relativePath: string) => void;
}

export function ProjectFileList({ projectId, selectedFileId, onSelectFile }: ProjectFileListProps) {
  const { files, loading, error, refetch } = useProjectFiles(projectId);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Filter to show only video files (exclude utilities starting with _)
  const videoFiles = files.filter((f: any) =>
    f.fileType === 'video' && !f.relativePath.startsWith('_')
  );

  const handleDelete = async (relativePath: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger file selection

    if (!confirm(`Delete ${relativePath}?`)) return;

    setDeletingFile(relativePath);
    try {
      await deleteProjectFileAction(projectId, relativePath);
      await refetch();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    } finally {
      setDeletingFile(null);
    }
  };

  if (loading && videoFiles.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">Loading files...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">Error loading files: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Project Files</h3>
        <Button variant="outline" size="sm" disabled>
          <File className="h-4 w-4 mr-1" />
          New File
        </Button>
      </div>

      {videoFiles.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border rounded-md border-dashed">
          No files found. Files are created when you save a video.
        </div>
      ) : (
        <div className="grid gap-1">
          {videoFiles.map((file: any) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent/40",
                selectedFileId === file.relativePath && "bg-accent/60"
              )}
            >
              <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-none truncate">{file.relativePath}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {file.updatedAt ? formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true }) : "Unknown"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onSelectFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onSelectFile(file.relativePath)}
                    title="Open file"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => handleDelete(file.relativePath, e)}
                  disabled={deletingFile === file.relativePath}
                  title="Delete file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
