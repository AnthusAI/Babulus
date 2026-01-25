"use client";

// @ts-ignore
import { getUrl, downloadData } from "aws-amplify/storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Player, StoryboardRenderer } from "@babulus/renderer";
import {
  deriveVideoConfig,
  summarizeTimeline,
  type ScriptData,
  type TimelineData,
  type GenerationRun,
} from "@babulus/shared";
import { useVideos, useGenerationRuns, useJobs, useActiveStoryboard, useOrgs } from "@/lib/use-org-data";
import { useSettings } from "@/lib/settings-context";
import { createJobAction, createStoryboardVersionAction, setActiveStoryboardVersionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Loader2, Send, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";

const fallbackScript: ScriptData = {
  meta: {
    fps: 30,
    width: 1280,
    height: 720,
    durationSeconds: 14,
  },
  scenes: [
    {
      id: "scene-1",
      title: "Opening",
      startSec: 0,
      endSec: 6,
      cues: [
        { id: "cue-1", label: "Hook", startSec: 0, endSec: 2 },
        { id: "cue-2", label: "Setup", startSec: 2, endSec: 6 },
      ],
    },
    {
      id: "scene-2",
      title: "Reveal",
      startSec: 6,
      endSec: 14,
      cues: [
        { id: "cue-3", label: "Capability", startSec: 6, endSec: 10 },
        { id: "cue-4", label: "CTA", startSec: 10, endSec: 14 },
      ],
    },
  ],
};

// Default DSL for new videos
const DEFAULT_DSL = `import { composition, scene, voice, audio } from '@babulus/dsl';

export default composition('my-video', () => {
  voice({ provider: 'dry-run' });
  
  scene('scene-1', 'Opening', () => {
    voice.cue('Welcome to your new video.');
  });
});
`;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

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

function SplitThumb({
  orientation,
  isActive,
}: {
  orientation: SplitOrientation;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-muted-foreground/40 bg-background transition-colors",
        orientation === "vertical" ? "h-7 w-1.5" : "h-1.5 w-7",
        "group-hover:border-muted-foreground/60 group-hover:bg-card",
        isActive && "border-muted-foreground/70 bg-foreground/10",
      )}
    />
  );
}

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
      <div className="absolute inset-0 bg-muted-foreground/30" />
      <SplitThumb orientation={orientation} isActive={isActive} />
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
  onBack: () => void;
};

export function VideoEditor({ orgId, projectId, videoId, onBack }: VideoEditorProps) {
  const { videos } = useVideos(orgId, projectId);
  const { runs, refetch: refetchRuns } = useGenerationRuns(orgId, videoId);
  const { jobs, refetch: refetchJobs } = useJobs(orgId);
  const { activeVersion, refetch: refetchVersion } = useActiveStoryboard(orgId, videoId);
  const { layout, updateLayout } = useSettings();
  const { orgs } = useOrgs();
  const activeOrg = orgs.find(o => o.id === orgId);
  
  const video = useMemo(() => videos.find((v) => v.id === videoId), [videos, videoId]);
  
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [script, setScript] = useState<ScriptData>(fallbackScript);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState<string>(DEFAULT_DSL);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const outerSplitRef = useRef<HTMLDivElement | null>(null);
  const mainSplitRef = useRef<HTMLDivElement | null>(null);
  const [chatPercent, setChatPercent] = useState(() => clampPercent(layout.chatPercent, CHAT_MIN_PERCENT, CHAT_MAX_PERCENT));
  const [inputPercent, setInputPercent] = useState(() => clampPercent(layout.inputPercent, INPUT_MIN_PERCENT, INPUT_MAX_PERCENT));
  const [activeDrag, setActiveDrag] = useState<DragTarget | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const chatPercentRef = useRef(chatPercent);
  const inputPercentRef = useRef(inputPercent);

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
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

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

  // Sync editor with active version
  useEffect(() => {
    if (activeVersion?.sourceText) {
      setEditorCode(activeVersion.sourceText);
    }
  }, [activeVersion]);

  // Load artifacts from the latest succeeded run
  useEffect(() => {
    const succeededRuns = runs.filter(r => r.status === 'succeeded').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestRun = succeededRuns[0];

    if (latestRun) {
      // Load Script
      if (latestRun.scriptArtifactKey) {
        downloadData({ path: latestRun.scriptArtifactKey }).result
          .then(result => result.body.json())
          .then(data => setScript(data as ScriptData))
          .catch(e => console.error("Failed to load script", e));
      }

      // Load Audio
      if (latestRun.audioArtifactKey) {
        getUrl({ path: latestRun.audioArtifactKey }).then(res => {
          setAudioSrc(res.url.toString());
        }).catch(e => console.error("Failed to load audio URL", e));
      }
    }
  }, [runs]);

  // TODO: Fetch actual artifacts from S3 using signed URLs
  // For now, we use fallback data or empty state
  const timeline: TimelineData | null = null;

  const timelineSummary = useMemo(() => summarizeTimeline(timeline), [timeline]);
  const { fps, width, height, durationSec, durationFrames } = useMemo(
    () =>
      deriveVideoConfig({
        script,
        timelineSummary,
        defaults: { fps: 30, width: 1280, height: 720 },
      }),
    [script, timelineSummary],
  );

  const maxFrame = Math.max(0, durationFrames - 1);
  const currentTimeSec = currentFrame / fps;

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

  // Sync audio with frame
  useEffect(() => {
    if (!audioSrc) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      if (Math.abs(audio.currentTime - currentTimeSec) > 0.1) {
        audio.currentTime = currentTimeSec;
      }
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playing, audioSrc, currentTimeSec]);

  // Playback loop
  useEffect(() => {
    if (!playing) return;

    let raf = 0;
    let lastTime = performance.now();
    let accumulator = 0;

    const tick = (time: number) => {
      const frameDurationMs = 1000 / fps;
      const delta = time - lastTime;
      
      if (delta > 0) {
        accumulator += delta / frameDurationMs;
        const advance = Math.floor(accumulator);
        
        if (advance > 0) {
          accumulator -= advance;
          setCurrentFrame((prev) => {
            const next = prev + advance;
            if (next >= maxFrame) {
              setPlaying(false);
              return maxFrame;
            }
            return next;
          });
        }
        lastTime = time;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, fps, maxFrame]);

  const handleTogglePlayback = () => setPlaying(!playing);

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(Math.max(0, Math.min(maxFrame, Math.round(frame))));
  };

  const handleGenerate = async () => {
    if (activeJob) return;
    try {
      // 1. Save current code as new version
      const version = await createStoryboardVersionAction({
        orgId,
        videoId,
        sourceText: editorCode,
        parentVersionId: video?.activeStoryboardVersionId || undefined,
      }, orgId);

      // 2. Update video to use this version
      await setActiveStoryboardVersionAction(videoId, version.id, orgId);
      await refetchVersion();

      // 3. Queue job
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

  // --- Sub-Components for Panes ---

  const OutputPane = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden pt-1">
        <div className="h-full w-full max-w-5xl max-h-full flex items-center justify-center">
          <div
            className="w-full h-full max-w-full max-h-full bg-black overflow-hidden relative"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <Player
              component={StoryboardRenderer}
              config={{ fps, width, height, durationFrames }}
              inputProps={{ script }}
              frame={currentFrame}
              onFrameChange={handleFrameChange}
              playing={playing}
              onPlayingChange={setPlaying}
              clock="external"
              showControls={false}
              surfaceStyle={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 pt-2">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex flex-col gap-2 px-2 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="secondary" size="icon" onClick={handleTogglePlayback} className="h-8 w-8">
                  {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                </Button>
                <div className="text-xs font-mono text-muted-foreground">
                  {formatTime(currentTimeSec)} / {formatTime(durationSec)}
                  <span className="mx-2 opacity-50">|</span>
                  {currentFrame} / {maxFrame} f
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {fps} FPS
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={maxFrame}
              value={currentFrame}
              onChange={(e) => handleFrameChange(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const InputPane = (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      <div className="flex-1 min-h-0 relative">
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

  const clampedChatPercent = clampPercent(chatPercent, CHAT_MIN_PERCENT, CHAT_MAX_PERCENT);
  const clampedInputPercent = clampPercent(inputPercent, INPUT_MIN_PERCENT, INPUT_MAX_PERCENT);
  const chatTemplate = layout.chatPosition === "left"
    ? `minmax(0, ${clampedChatPercent}fr) ${SPLITTER_SIZE_PX}px minmax(0, ${100 - clampedChatPercent}fr)`
    : `minmax(0, ${100 - clampedChatPercent}fr) ${SPLITTER_SIZE_PX}px minmax(0, ${clampedChatPercent}fr)`;
  const mainOrientation: SplitOrientation = layout.mainAxis === "horizontal" ? "vertical" : "horizontal";
  const mainTemplate = layout.mainAxis === "horizontal"
    ? { gridTemplateColumns: `minmax(0, ${clampedInputPercent}fr) ${SPLITTER_SIZE_PX}px minmax(0, ${100 - clampedInputPercent}fr)` }
    : { gridTemplateRows: `minmax(0, ${clampedInputPercent}fr) ${SPLITTER_SIZE_PX}px minmax(0, ${100 - clampedInputPercent}fr)` };

  const ChatCell = <div className="min-h-0 min-w-0 flex flex-col">{ChatPane}</div>;
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end flex-shrink-0">
        {activeJob && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2 bg-muted px-2 py-1 rounded-full animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            {activeJob.status === 'queued' ? 'Queued...' : (activeJob.kind === 'render' ? 'Rendering...' : 'Generating...')}
          </div>
        )}
      </div>

      <div
        ref={outerSplitRef}
        className="grid flex-1 min-h-0 overflow-hidden"
        style={{ gridTemplateColumns: chatTemplate }}
      >
        {layout.chatPosition === "left" ? (
          <>
            {ChatCell}
            <SplitterHandle
              orientation="vertical"
              onPointerDown={startChatDrag}
              label="Resize chat pane"
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
              label="Resize chat pane"
              isActive={activeDrag === "chat"}
            />
            {ChatCell}
          </>
        )}
      </div>
      
      {/* Hidden Audio Element */}
      <audio ref={audioRef} />
    </div>
  );
}
