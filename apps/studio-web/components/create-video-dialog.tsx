"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVideoAction } from "@/app/actions";

interface CreateVideoDialogProps {
  orgId: string;
  projectId: string;
  onVideoCreated?: () => void;
}

export function CreateVideoDialog({ orgId, projectId, onVideoCreated }: CreateVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createVideoAction({ title, projectId }, orgId);
      setOpen(false);
      setTitle("");
      onVideoCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="bare">
          <Plus className="h-4 w-4" />
          New Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Video</DialogTitle>
            <DialogDescription>
              Create a new video in this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Marketing Video V1"
                disabled={loading}
              />
            </div>
          </div>
          {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
          <DialogFooter>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
