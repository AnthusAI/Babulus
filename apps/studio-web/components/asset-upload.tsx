"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Music, Film, File as FileIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadProjectFileAction } from "@/app/actions/project-files";

interface AssetUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function AssetUpload({ projectId, onUploadComplete }: AssetUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ file: string; status: 'uploading' | 'success' | 'error' }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    const progress = files.map(f => ({ file: f.name, status: 'uploading' as const }));
    setUploadProgress(progress);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload to assets/ subfolder
        const relativePath = `assets/${file.name}`;
        await uploadProjectFileAction(
          projectId,
          relativePath,
          file,
          'asset',
          file.type
        );

        // Update progress
        setUploadProgress(prev =>
          prev.map((p, idx) => idx === i ? { ...p, status: 'success' } : p)
        );
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        setUploadProgress(prev =>
          prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p)
        );
      }
    }

    setUploading(false);

    // Call callback after a short delay to show success state
    setTimeout(() => {
      setUploadProgress([]);
      onUploadComplete?.();
    }, 2000);
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

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-sm font-medium mb-1">Drop files here</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Images, audio, video, and other assets
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Select Files
        </Button>
      </div>

      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded border bg-card"
            >
              {item.status === 'uploading' ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : item.status === 'success' ? (
                getFileIcon(item.file)
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm flex-1 truncate">{item.file}</span>
              <span className={cn(
                "text-xs",
                item.status === 'success' && "text-green-600",
                item.status === 'error' && "text-destructive"
              )}>
                {item.status === 'uploading' ? 'Uploading...' : item.status === 'success' ? 'Done' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
