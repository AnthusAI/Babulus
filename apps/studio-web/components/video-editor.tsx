"use client";

// @ts-ignore
import { getUrl } from "aws-amplify/storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import bcrypt from "bcryptjs";
import {
  deriveVideoConfig,
  summarizeTimeline,
  type ScriptData,
  type TimelineData,
} from "@babulus/shared";
import { useVideos, useGenerationRuns, useJobs, useVideoRenderRuns } from "@/lib/use-org-data";
import { useSettings } from "@/lib/settings-context";
import { createJobAction, createPublishedVideoAction } from "@/app/actions";
import { uploadProjectFileAction, readProjectFileAction } from "@/app/actions/project-files";
import { Button } from "@/components/ui/button";
import { PublishModal } from "@/components/publish-modal";
import { AssetManager } from "@/components/asset-manager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Save, ChevronLeft, ChevronRight, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { configureAmplify } from "@/lib/amplify-config";
import { PreviewPlayer } from "@/components/preview-player";
import { dslToScriptData } from "@babulus/shared/dsl-to-script";
import { executeDslFile } from "@/lib/dsl-executor";

// Ensure Amplify is configured before using storage APIs
configureAmplify();

const SPLITTER_SIZE_PX = 1;
const CHAT_MIN_PERCENT = 18;
const CHAT_MAX_PERCENT = 40;
const INPUT_MIN_PERCENT = 20;
const INPUT_MAX_PERCENT = 80;

const clampPercent = (value: number, min: number, max: number) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return (min + max) / 2;
  }
  return Math.min(max, Math.max(min, normalized));
};

type SplitOrientation = "vertical" | "horizontal";
type DragTarget = "chat" | "main";

type DragState = {
  target: DragTarget;
  axis: "x" | "y";
  direction: 1 | -1;
  startX: number;
  startY: number;
  startPercent: number;
  size: number;
  minPercent: number;
  maxPercent: number;
};

function SplitterHandle({
  orientation,
  onPointerDown,
  label,
  isActive,
}: {
  orientation: SplitOrientation;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  label: string;
  isActive: boolean;
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      className={cn(
        "group relative select-none touch-none overflow-visible",
        orientation === "vertical" ? "w-px h-full" : "h-px w-full",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 origin-center bg-muted-foreground/30 transition-transform transition-colors",
          orientation === "vertical" ? "scale-x-[1] group-hover:scale-x-[5]" : "scale-y-[1] group-hover:scale-y-[5]",
          isActive && "bg-foreground/60",
        )}
      />
      <div
        onPointerDown={onPointerDown}
        className={cn(
          "absolute z-10",
          orientation === "vertical"
            ? "-left-2 -right-2 top-0 bottom-0 cursor-col-resize"
            : "-top-2 -bottom-2 left-0 right-0 cursor-row-resize",
        )}
      />
    </div>
  );
}

type VideoEditorProps = {
  orgId: string;
  projectId: string;
  videoId: string;
};

export function VideoEditor({ orgId, projectId, videoId }: VideoEditorProps) {
  const { videos } = useVideos(orgId, projectId);
  const { runs, refetch: refetchRuns } = useGenerationRuns(orgId, videoId);
  const { runs: renderRuns } = useVideoRenderRuns(orgId, videoId);
  const { jobs, refetch: refetchJobs } = useJobs(orgId);
  const { layout, updateLayout } = useSettings();

  const video = useMemo(() => videos.find((v) => v.id === videoId), [videos, videoId]);
  
  const [script, setScript] = useState<ScriptData | null>(null);
  const [editorCode, setEditorCode] = useState<string>('');
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'chat' | 'assets'>('assets');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Preview state (instant preview only - no fallbacks)
  const [_previewError, setPreviewError] = useState<string | null>(null);
  const [_isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const outerSplitRef = useRef<HTMLDivElement | null>(null);
  const mainSplitRef = useRef<HTMLDivElement | null>(null);
  const [chatPercent, setChatPercent] = useState(() => clampPercent(layout.chatPercent, CHAT_MIN_PERCENT, CHAT_MAX_PERCENT));
  const [inputPercent, setInputPercent] = useState(() => clampPercent(layout.inputPercent, INPUT_MIN_PERCENT, INPUT_MAX_PERCENT));
  const [activeDrag, setActiveDrag] = useState<DragTarget | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const chatPercentRef = useRef(chatPercent);
  const inputPercentRef = useRef(inputPercent);
  const handlePointerUpRef = useRef<() => void>(() => {});

  useEffect(() => {
    chatPercentRef.current = chatPercent;
  }, [chatPercent]);

  useEffect(() => {
    inputPercentRef.current = inputPercent;
  }, [inputPercent]);

  useEffect(() => {
    if (activeDrag) return;
    setChatPercent(clampPercent(layout.chatPercent, CHAT_MIN_PERCENT, CHAT_MAX_PERCENT));
    setInputPercent(clampPercent(layout.inputPercent, INPUT_MIN_PERCENT, INPUT_MAX_PERCENT));
  }, [layout.chatPercent, layout.inputPercent, activeDrag]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (event.buttons === 0) {
      handlePointerUpRef.current();
      return;
    }
    const state = dragStateRef.current;
    if (!state) return;
    const delta = state.axis === "x" ? event.clientX - state.startX : event.clientY - state.startY;
    const nextPercent = clampPercent(
      state.startPercent + (delta / state.size) * 100 * state.direction,
      state.minPercent,
      state.maxPercent,
    );
    if (state.target === "chat") {
      setChatPercent(nextPercent);
    } else {
      setInputPercent(nextPercent);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    const state = dragStateRef.current;
    if (!state) return;
    dragStateRef.current = null;
    setActiveDrag(null);
    if (state.target === "chat") {
      updateLayout({ chatPercent: chatPercentRef.current });
    } else {
      updateLayout({ inputPercent: inputPercentRef.current });
    }
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
  }, [handlePointerMove, updateLayout]);

  useEffect(() => {
    handlePointerUpRef.current = handlePointerUp;
  }, [handlePointerUp]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const handleWindowBlur = () => {
      handlePointerUpRef.current();
    };
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleWindowBlur);
    };
  }, []);

  const startChatDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const container = outerSplitRef.current;
      if (!container || dragStateRef.current) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const size = Math.max(1, rect.width - SPLITTER_SIZE_PX);
      dragStateRef.current = {
        target: "chat",
        axis: "x",
        direction: layout.chatPosition === "left" ? 1 : -1,
        startX: event.clientX,
        startY: event.clientY,
        startPercent: chatPercentRef.current,
        size,
        minPercent: CHAT_MIN_PERCENT,
        maxPercent: CHAT_MAX_PERCENT,
      };
      setActiveDrag("chat");
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp, layout.chatPosition],
  );

  const startMainDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const container = mainSplitRef.current;
      if (!container || dragStateRef.current) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const isHorizontal = layout.mainAxis === "horizontal";
      const size = Math.max(1, (isHorizontal ? rect.width : rect.height) - SPLITTER_SIZE_PX);
      dragStateRef.current = {
        target: "main",
        axis: isHorizontal ? "x" : "y",
        direction: layout.inputPosition === "first" ? 1 : -1,
        startX: event.clientX,
        startY: event.clientY,
        startPercent: inputPercentRef.current,
        size,
        minPercent: INPUT_MIN_PERCENT,
        maxPercent: INPUT_MAX_PERCENT,
      };
      setActiveDrag("main");
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp, layout.inputPosition, layout.mainAxis],
  );

  // Load editor code from S3 only (no fallbacks)
  useEffect(() => {
    const loadEditorCode = async () => {
      if (!video?.title) {
        setIsLoadingCode(false);
        return;
      }

      setIsLoadingCode(true);
      try {
        const fileName = `${video.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.babulus.xml`;
        const content = await readProjectFileAction(projectId, fileName);
        if (content) {
          setEditorCode(content);
        }
      } catch (error) {
        console.log('ProjectFile not found in S3');
        // No fallback - leave editor empty
      } finally {
        setIsLoadingCode(false);
      }
    };

    loadEditorCode();
  }, [video?.title, projectId]);

  // Moved handlePreview definition here so it can be used in useEffect below

  const handlePreview = useCallback(async () => {
    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      // 1. Execute DSL code from Monaco editor
      const videoSpec = await executeDslFile(editorCode);

      // 2. Get first composition
      const composition = videoSpec.compositions?.[0];
      if (!composition) {
        throw new Error('No composition found in video. Make sure your DSL exports a composition.');
      }

      // 3. Transform to ScriptData with placeholder timing
      const previewScript = dslToScriptData(composition, {
        type: 'cue-count',
        secondsPerCue: 3
      });

      setScript(previewScript);
    } catch (error) {
      console.error('[Preview] Preview failed:', error);
      setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [editorCode]);

  // Auto-preview when editor code changes
  useEffect(() => {
    if (editorCode) {
      handlePreview();
    }
  }, [editorCode, handlePreview]);

  const timeline: TimelineData | null = null;

  const timelineSummary = useMemo(() => summarizeTimeline(timeline), [timeline]);
  const { width, height } = useMemo(
    () =>
      deriveVideoConfig({
        script,
        timelineSummary,
        defaults: { fps: 30, width: 1280, height: 720 },
      }),
    [script, timelineSummary],
  );

  const activeJob = useMemo(() => {
    return jobs.find(j => {
      let input: any = {};
      try {
        input = j.inputJson ? JSON.parse(j.inputJson) : {};
      } catch (e) {
        // ignore invalid json
      }
      return input.videoId === videoId && 
        ['queued', 'claimed', 'running'].includes(j.status);
    });
  }, [jobs, videoId]);

  // Poll for job updates if there is an active job
  useEffect(() => {
    if (activeJob) {
      const interval = setInterval(() => {
        refetchJobs();
        refetchRuns();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeJob, refetchJobs, refetchRuns]);


  const handleGenerate = async () => {
    if (activeJob) return;
    try {
      // 1. Save to S3 as ProjectFile
      if (video?.title) {
        try {
          // Generate filename from video title (sanitized)
        const fileName = `${video.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.babulus.xml`;
          await uploadProjectFileAction(
            projectId,
            fileName,
            editorCode,
            'video',
            'text/typescript'
          );
        } catch (s3Error) {
          console.error("Failed to save to S3:", s3Error);
          throw s3Error;
        }
      }

      // 2. Queue job
      await createJobAction({
        orgId,
        kind: 'generate',
        status: 'queued',
        inputJson: JSON.stringify({ videoId }),
      }, orgId);
      await refetchJobs();
    } catch (e) {
      console.error("Failed to queue generation job", e);
    }
  };

  const handleRender = async () => {
    if (activeJob) return;

    // Find the latest successful generation run
    const succeededRuns = runs.filter((r: any) => r.status === 'succeeded');
    const latestRun = succeededRuns[0];

    if (!latestRun) {
      console.error("No successful generation run found. Generate first.");
      return;
    }

    try {
      // Queue render job with generation run ID
      await createJobAction({
        orgId,
        kind: 'render',
        status: 'queued',
        inputJson: JSON.stringify({
          videoId,
          generationRunId: latestRun.id,
        }),
      }, orgId);
      await refetchJobs();
    } catch (e) {
      console.error("Failed to queue render job", e);
    }
  };

  // Check if we have a successful generation run to enable render
  const succeededRuns = runs.filter((r: any) => r.status === 'succeeded');
  const canRender = succeededRuns.length > 0 && !activeJob;

  // Find the latest successful render run for download
  const succeededRenderRuns = renderRuns.filter((r: any) => r.status === 'succeeded');
  const latestRenderRun = succeededRenderRuns[0]; // Already sorted by createdAt desc
  const canDownload = !!latestRenderRun && !activeJob;

  const handleDownload = async () => {
    if (!latestRenderRun?.mp4ArtifactKey) {
      console.error("No MP4 artifact found for download");
      return;
    }

    try {
      // Get signed URL for the MP4
      const result = await getUrl({
        path: latestRenderRun.mp4ArtifactKey,
        options: {
          validateObjectExistence: true,
          expiresIn: 3600, // 1 hour
        },
      });

      // Trigger browser download
      const link = document.createElement('a');
      link.href = result.url.toString();
      link.download = `${video?.title || 'video'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to download MP4", e);
    }
  };

  const handlePublish = async (params: {
    slug: string;
    accessPolicy: "public" | "password" | "org_only";
    password?: string;
  }) => {
    if (!latestRenderRun) {
      throw new Error("No render run available to publish");
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (params.password && params.accessPolicy === "password") {
      passwordHash = await bcrypt.hash(params.password, 10);
    }

    const publishedVideo = await createPublishedVideoAction(
      {
        videoId,
        renderRunId: latestRenderRun.id,
        slug: params.slug,
        accessPolicy: params.accessPolicy,
        passwordHash,
        viewCount: 0,
      },
      orgId
    );

    return { slug: publishedVideo.slug };
  };

  // --- Sub-Components for Panes ---

  const OutputPane = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative">
        {script ? (
          <div className="h-full w-full flex items-center justify-center">
            <PreviewPlayer script={script} width={width} height={height} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p>No preview available</p>
              <p className="text-sm">Preview will update automatically as you type</p>
            </div>
          </div>
        )}
        {/* Fullscreen Toggle Button */}
        {script && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );

  const InputPane = (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      <div className="flex-1 min-h-0 relative">
        {isLoadingCode ? (
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading code...</p>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="typescript"
            theme="vs-dark" // We can make this dynamic later
            value={editorCode}
            onChange={(value) => setEditorCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  );

  const ChatPane = (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">AI</div>
              <div className="bg-muted p-3 rounded-lg rounded-tl-none space-y-2">
                <p>Hello! I can help you edit this video. Try asking me to add a scene or change the voiceover.</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-3 border-t bg-muted/30">
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <Input placeholder="Describe changes..." className="flex-1 bg-background" />
            <Button size="icon" type="submit">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  const AssetPane = (
    <div className="flex flex-col h-full overflow-hidden p-3">
      <AssetManager projectId={projectId} />
    </div>
  );

  const SidebarPane = (
    <div className="flex flex-col h-full">
      {/* Sidebar Header with Toggle and Collapse */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <div className="flex gap-4 flex-1">
          <button
            onClick={() => setSidebarMode('chat')}
            className={cn(
              "text-xs font-medium pb-1 border-b-2 transition-colors",
              sidebarMode === 'chat'
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setSidebarMode('assets')}
            className={cn(
              "text-xs font-medium pb-1 border-b-2 transition-colors",
              sidebarMode === 'assets'
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Assets
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="h-7 w-7"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {layout.chatPosition === "left" ? (
            sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
          ) : (
            sidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      {/* Sidebar Content */}
      {!sidebarCollapsed && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {sidebarMode === 'chat' ? ChatPane : AssetPane}
        </div>
      )}
    </div>
  );

  const clampedChatPercent = clampPercent(chatPercent, CHAT_MIN_PERCENT, CHAT_MAX_PERCENT);
  const clampedInputPercent = clampPercent(inputPercent, INPUT_MIN_PERCENT, INPUT_MAX_PERCENT);

  // When sidebar is collapsed, use minimal width (just enough for the header)
  const sidebarWidth = sidebarCollapsed ? 'auto' : `${clampedChatPercent}fr`;
  const chatTemplate = layout.chatPosition === "left"
    ? `minmax(0, ${sidebarWidth}) ${SPLITTER_SIZE_PX}px minmax(0, ${sidebarCollapsed ? '1fr' : `${100 - clampedChatPercent}fr`})`
    : `minmax(0, ${sidebarCollapsed ? '1fr' : `${100 - clampedChatPercent}fr`}) ${SPLITTER_SIZE_PX}px minmax(0, ${sidebarWidth})`;
  const mainOrientation: SplitOrientation = layout.mainAxis === "horizontal" ? "vertical" : "horizontal";
  const mainTemplate = layout.mainAxis === "horizontal"
    ? { gridTemplateColumns: `minmax(0, ${clampedInputPercent}fr) ${SPLITTER_SIZE_PX}px minmax(0, ${100 - clampedInputPercent}fr)` }
    : { gridTemplateRows: `minmax(0, ${clampedInputPercent}fr) ${SPLITTER_SIZE_PX}px minmax(0, ${100 - clampedInputPercent}fr)` };

  const SidebarCell = <div className="min-h-0 min-w-0 flex flex-col">{SidebarPane}</div>;
  const InputCell = <div className="min-h-0 min-w-0 flex flex-col">{InputPane}</div>;
  const OutputCell = <div className="min-h-0 min-w-0 flex flex-col">{OutputPane}</div>;
  const MainContent = (
    <div ref={mainSplitRef} className="grid min-h-0 min-w-0 h-full" style={mainTemplate}>
      {layout.inputPosition === "first" ? (
        <>
          {InputCell}
          <SplitterHandle
            orientation={mainOrientation}
            onPointerDown={startMainDrag}
            label="Resize input and output panes"
            isActive={activeDrag === "main"}
          />
          {OutputCell}
        </>
      ) : (
        <>
          {OutputCell}
          <SplitterHandle
            orientation={mainOrientation}
            onPointerDown={startMainDrag}
            label="Resize input and output panes"
            isActive={activeDrag === "main"}
          />
          {InputCell}
        </>
      )}
    </div>
  );

  const handleSave = async () => {
    if (!video?.title || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const fileName = `${video.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.babulus.xml`;
      await uploadProjectFileAction(
        projectId,
        fileName,
        editorCode,
        'video',
        'text/typescript'
      );
      setSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save to S3:', error);
      setSaveStatus('error');
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Fullscreen Overlay
  const FullscreenOverlay = script ? (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video Container */}
      <div className="flex-1 flex items-center justify-center relative">
        <PreviewPlayer
          script={script}
          width={width}
          height={height}
          overlayControls
          onExitFullscreen={() => setIsFullscreen(false)}
        />
      </div>
    </div>
  ) : null;

  // If fullscreen, show only the fullscreen overlay
  if (isFullscreen && FullscreenOverlay) {
    return FullscreenOverlay;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-2 py-1 flex-shrink-0 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!video?.title || saveStatus === 'saving'}
            className={cn(
              saveStatus === 'saved' && 'border-green-500 text-green-600',
              saveStatus === 'error' && 'border-red-500 text-red-600'
            )}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerate}
            disabled={!!activeJob || !video?.title}
          >
            Generate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRender}
            disabled={!canRender}
            title={!canRender ? "Generate first to enable rendering" : "Render video to MP4"}
          >
            Render
          </Button>
          {canDownload && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="Download rendered MP4"
              >
                Download MP4
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setPublishModalOpen(true)}
                title="Publish video and create shareable link"
              >
                Publish
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center" />
      </div>

      <div
        ref={outerSplitRef}
        className="grid flex-1 min-h-0 overflow-hidden"
        style={{ gridTemplateColumns: chatTemplate }}
      >
        {layout.chatPosition === "left" ? (
          <>
            {SidebarCell}
            <SplitterHandle
              orientation="vertical"
              onPointerDown={startChatDrag}
              label="Resize sidebar"
              isActive={activeDrag === "chat"}
            />
            {MainContent}
          </>
        ) : (
          <>
            {MainContent}
            <SplitterHandle
              orientation="vertical"
              onPointerDown={startChatDrag}
              label="Resize sidebar"
              isActive={activeDrag === "chat"}
            />
            {SidebarCell}
          </>
        )}
      </div>

      {/* Publish Modal */}
      {canDownload && video && (
        <PublishModal
          open={publishModalOpen}
          onOpenChange={setPublishModalOpen}
          videoTitle={video.title || 'Untitled Video'}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
}
