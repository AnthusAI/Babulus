"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";

type AccessPolicy = "public" | "password" | "org_only";

type PublishModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string;
  renderRunId: string;
  orgId: string;
  onPublish: (params: {
    slug: string;
    accessPolicy: AccessPolicy;
    password?: string;
  }) => Promise<{ slug: string }>;
};

export function PublishModal({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  renderRunId,
  orgId,
  onPublish,
}: PublishModalProps) {
  const [slug, setSlug] = useState(() => {
    // Generate initial slug from video title
    return videoTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
  });
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy>("public");
  const [password, setPassword] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const validateSlug = (value: string) => {
    if (!value) {
      setSlugError("Slug is required");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugError("Slug can only contain lowercase letters, numbers, and dashes");
      return false;
    }
    if (value.length < 3) {
      setSlugError("Slug must be at least 3 characters");
      return false;
    }
    if (value.length > 100) {
      setSlugError("Slug must be less than 100 characters");
      return false;
    }
    setSlugError(null);
    return true;
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    validateSlug(cleaned);
  };

  const handlePublish = async () => {
    if (!validateSlug(slug)) {
      return;
    }

    if (accessPolicy === "password" && !password) {
      return;
    }

    setPublishing(true);
    try {
      const result = await onPublish({
        slug,
        accessPolicy,
        password: accessPolicy === "password" ? password : undefined,
      });

      const url = `${window.location.origin}/share/${result.slug}`;
      setShareUrl(url);
      setPublished(true);
    } catch (error: any) {
      console.error("Failed to publish", error);
      if (error.message?.includes("slug") || error.message?.includes("duplicate")) {
        setSlugError("This slug is already taken. Please choose another.");
      } else {
        setSlugError(error.message || "Failed to publish video");
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (!publishing) {
      onOpenChange(false);
      // Reset state after a delay to avoid visual glitches
      setTimeout(() => {
        setPublished(false);
        setShareUrl(null);
        setSlugError(null);
        setCopied(false);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!published ? (
          <>
            <DialogHeader>
              <DialogTitle>Publish Video</DialogTitle>
              <DialogDescription>
                Create a shareable link for your rendered video. Choose who can access it.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="slug">Share URL Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-awesome-video"
                  disabled={publishing}
                />
                {slugError && (
                  <p className="text-sm text-red-500">{slugError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Your video will be available at: /share/{slug || "..."}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accessPolicy">Access Policy</Label>
                <Select
                  value={accessPolicy}
                  onValueChange={(value) => setAccessPolicy(value as AccessPolicy)}
                  disabled={publishing}
                >
                  <SelectTrigger id="accessPolicy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone with the link</SelectItem>
                    <SelectItem value="password">Password Protected</SelectItem>
                    <SelectItem value="org_only">Organization Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {accessPolicy === "password" && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a password"
                    disabled={publishing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Viewers will need this password to access the video
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={publishing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={publishing || !slug || !!slugError || (accessPolicy === "password" && !password)}
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Video Published!
              </DialogTitle>
              <DialogDescription>
                Your video is now live and ready to share.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Share Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={shareUrl || ""}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {copied ? "Copied to clipboard!" : "Click to copy the link"}
                </p>
              </div>

              {accessPolicy === "password" && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">Password Protection Enabled</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Viewers will need to enter the password you set to access this video.
                  </p>
                </div>
              )}

              {accessPolicy === "org_only" && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">Organization Access Only</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only members of your organization can access this video.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => window.open(shareUrl || "", "_blank")}
              >
                View Video
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
