"use client";

// @ts-ignore
import { getUrl, downloadData } from "aws-amplify/storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { Player, StoryboardRenderer } from "@babulus/renderer";
import {
  deriveVideoConfig,
  summarizeTimeline,
  type ScriptData,
  type TimelineData,
  type GenerationRun,
} from "@babulus/shared";
import { useVideos, useGenerationRuns, useJobs, useActiveStoryboard, useVideoRenderRuns, useUsageEvents, useBillingAccount, useOrgs } from "@/lib/use-org-data";
import { useSettings } from "@/lib/settings-context";
import { createJobAction, createStoryboardVersionAction, setActiveStoryboardVersionAction, createPublishedVideoAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Play, Pause, AlertCircle, RefreshCw, Clock, Loader2, Sparkles, MessageSquare, Send, Save, Film, Download, Share } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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

type VideoEditorProps = {
  orgId: string;
  projectId: string;
  videoId: string;
  onBack: () => void;
};

function RunCost({ orgId, runId }: { orgId: string, runId: string }) {
  const { events } = useUsageEvents(orgId, null, runId);
  const { account } = useBillingAccount(orgId);
  
  const totalCost = events.reduce((sum, e) => sum + (e.actualCost || e.estimatedCost || 0), 0);
  
  if (totalCost === 0) return null;

  const isRedacted = account?.usageVisibilityMode === 'redacted';
  
  // Example conversion: $0.01 = 1 Credit
  const credits = Math.ceil(totalCost * 100); 
  
  return (
    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-1">
      {isRedacted ? (
        <span>{credits} Credits</span>
      ) : (
        <span>${totalCost.toFixed(4)}</span>
      )}
    </div>
  );
}

export function VideoEditor({ orgId, projectId, videoId, onBack }: VideoEditorProps) {
  const { videos } = useVideos(orgId, projectId);
  const { runs, loading: runsLoading, refetch: refetchRuns } = useGenerationRuns(orgId, videoId);
  const { runs: renderRuns, refetch: refetchRenderRuns } = useVideoRenderRuns(orgId, videoId);
  const { jobs, refetch: refetchJobs } = useJobs(orgId);
  const { activeVersion, refetch: refetchVersion } = useActiveStoryboard(orgId, videoId);
  const { layout } = useSettings();
  const { orgs } = useOrgs();
  const activeOrg = orgs.find(o => o.id === orgId);
  
  const video = useMemo(() => videos.find((v) => v.id === videoId), [videos, videoId]);
  
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<ScriptData>(fallbackScript);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState<string>(DEFAULT_DSL);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        refetchRenderRuns();
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
    if (activeJob || isGenerating) return;
    setIsGenerating(true);
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
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRender = async () => {
    const latestRun = runs.filter(r => r.status === 'succeeded').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!latestRun) return;
    
    if (activeJob) return;

    try {
      await createJobAction({
        orgId,
        kind: 'render',
        status: 'queued',
        inputJson: JSON.stringify({ 
            videoId,
            generationRunId: latestRun.id 
        }),
      }, orgId);
      await refetchJobs();
    } catch (e) {
      console.error("Failed to queue render job", e);
    }
  };

  const handleShare = async (renderRunId: string) => {
    const slug = `${videoId}-${Date.now().toString(36)}`;
    try {
      const pub = await createPublishedVideoAction({
        orgId,
        videoId,
        renderRunId,
        slug,
        accessPolicy: "public",
      }, orgId);
      
      let url = "";
      if (activeOrg?.customDomain && activeOrg?.customDomainVerified) {
        url = `https://${activeOrg.customDomain}/${pub.slug}`;
      } else {
        url = `${window.location.origin}/share/${pub.slug}`;
      }
      
      window.open(url, '_blank');
    } catch (e) {
      console.error("Failed to publish video", e);
    }
  };

  // --- Sub-Components for Panes ---

  const OutputPane = (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-y-auto">
      <Card className="border-0 shadow-none bg-muted/30 flex-shrink-0 max-w-5xl mx-auto w-full">
         <div className="aspect-video bg-black rounded-lg overflow-hidden relative shadow-sm ring-1 ring-border/50">
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
         
         <div className="mt-4 flex flex-col gap-2 p-4 bg-card rounded-lg border">
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
      </Card>

      <Card className="flex-1 flex flex-col min-h-[200px] border-none bg-transparent shadow-none">
         <CardHeader className="py-2 px-0 border-none">
           <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
             Runs
           </CardTitle>
         </CardHeader>
         <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
           <ScrollArea className="flex-1">
             <CardContent className="p-0">
               {runs.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                   <AlertCircle className="h-8 w-8 opacity-20" />
                   <p>No generation runs yet.</p>
                   <Button variant="link" size="sm" className="h-auto p-0" onClick={handleGenerate}>
                     Create your first generation
                   </Button>
                 </div>
               ) : (
                 <div className="flex flex-col">
                   {runs.map((run) => (
                     <div key={run.id} className="p-3 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group">
                       <div className="flex items-center justify-between mb-1">
                         <Badge variant={run.status === 'succeeded' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-5">
                           {run.status}
                         </Badge>
                         <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           {format(new Date(run.createdAt), "MMM d, HH:mm")}
                         </span>
                       </div>
                       <RunCost orgId={orgId} runId={run.id} />
                       <div className="flex items-center justify-between mt-2">
                         <div className="text-xs font-mono text-muted-foreground truncate opacity-70 group-hover:opacity-100">
                           {run.id.slice(0, 8)}...
                         </div>
                         {run.status === 'succeeded' && (
                            <div className="flex gap-2">
                                {(() => {
                                    const renderRun = renderRuns.find(rr => rr.generationRunId === run.id && rr.status === 'succeeded');
                                    if (renderRun?.mp4ArtifactKey) {
                                        return (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => {
                                                e.stopPropagation();
                                                getUrl({ path: renderRun.mp4ArtifactKey! }).then(res => {
                                                    window.open(res.url.toString(), '_blank');
                                                });
                                            }}>
                                                <Download className="h-3 w-3" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => {
                                                e.stopPropagation();
                                                handleShare(renderRun.id);
                                            }}>
                                                <Share className="h-3 w-3" />
                                            </Button>
                                          </>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </ScrollArea>
         </Card>
      </Card>
    </div>
  );

  const InputPane = (
    <Card className="flex-1 flex flex-col min-h-0 h-full overflow-hidden border-0 shadow-none bg-muted/10">
      <CardHeader className="py-2 px-4 border-b flex flex-row items-center justify-between shrink-0 bg-background/50 backdrop-blur-sm">
         <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-blue-500"></span>
           Babulus Code
         </CardTitle>
         <div className="text-xs text-muted-foreground font-mono">
           {activeVersion ? `v${activeVersion.id.slice(0,6)}` : 'Draft'}
         </div>
      </CardHeader>
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
    </Card>
  );

  const ChatPane = (
    <Card className="flex flex-col h-full border-none shadow-none bg-transparent">
      <div className="flex items-center gap-2 mb-4 px-1">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Chat</span>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden">
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
      </Card>
    </Card>
  );

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{video?.title ?? "Untitled Video"}</h2>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
               <span className="uppercase tracking-wider">{video?.status ?? "draft"}</span>
               <span>•</span>
               <span className="font-mono">{videoId}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeJob && (
             <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2 bg-muted px-2 py-1 rounded-full animate-pulse">
               <Loader2 className="h-3 w-3 animate-spin" />
               {activeJob.status === 'queued' ? 'Queued...' : (activeJob.kind === 'render' ? 'Rendering...' : 'Generating...')}
             </div>
          )}
          <Button variant="outline" onClick={() => { refetchRuns(); refetchJobs(); refetchRenderRuns(); }}>
            <RefreshCw className={`h-4 w-4 mr-2 ${runsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="secondary" onClick={handleRender} disabled={!!activeJob || !runs.some(r => r.status === 'succeeded')}>
            <Film className="h-4 w-4 mr-2" />
            Render MP4
          </Button>
          <Button onClick={handleGenerate} disabled={!!activeJob || isGenerating}>
            {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        {/* Left Chat */}
        {layout.chatPosition === "left" && (
          <div className="w-80 flex-shrink-0 flex flex-col min-h-0">{ChatPane}</div>
        )}

        {/* Main Content Area */}
        <div className={cn(
          "flex flex-1 gap-4 min-h-0",
          layout.mainAxis === "vertical" ? "flex-col" : "flex-row"
        )}>
          {layout.inputPosition === "first" ? (
            <>
              <div className="flex-1 min-h-0 min-w-0">{InputPane}</div>
              <div className="flex-1 min-h-0 min-w-0">{OutputPane}</div>
            </>
          ) : (
            <>
              <div className="flex-1 min-h-0 min-w-0">{OutputPane}</div>
              <div className="flex-1 min-h-0 min-w-0">{InputPane}</div>
            </>
          )}
        </div>

        {/* Right Chat */}
        {layout.chatPosition === "right" && (
          <div className="w-80 flex-shrink-0 flex flex-col min-h-0">{ChatPane}</div>
        )}
      </div>
      
      {/* Hidden Audio Element */}
      <audio ref={audioRef} />
    </div>
  );
}
