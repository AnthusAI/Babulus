"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Player, StoryboardRenderer } from "@babulus/renderer";
import {
  buildTimelineLayout,
  deriveVideoConfig,
  getActiveCue,
  getActiveScene,
  summarizeTimeline,
  type ScriptCue,
  type ScriptData,
  type ScriptScene,
  type TimelineData,
} from "@babulus/shared";

type PreviewEntry = {
  id: string;
  title?: string | null;
  script: string;
  timeline: string;
  audio?: string | null;
};

type PreviewIndexResponse = {
  updatedAt?: string;
  compositions?: PreviewEntry[];
};

type RenderResult = {
  id: string;
  output: string;
  createdAt: string;
};


const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "not yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return date.toLocaleString();
};

const cueLabel = (cue?: ScriptCue | null) => cue?.text ?? cue?.label ?? "Cue";
const sceneLabel = (scene?: ScriptScene | null) => scene?.title ?? "Scene";
const parseArgList = (raw: string): string[] => {
  const tokens: string[] = [];
  const regex = /"([^"]+)"|'([^']+)'|\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const value = match[1] ?? match[2] ?? match[0];
    if (value) {
      tokens.push(value);
    }
  }
  return tokens;
};

export function StudioWorkspace() {
  const [previewIndex, setPreviewIndex] = useState<PreviewEntry[]>([]);
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [lastRender, setLastRender] = useState<RenderResult | null>(null);
  const [renderWorkers, setRenderWorkers] = useState("");
  const [renderFfmpegArgs, setRenderFfmpegArgs] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeEntry = useMemo(() => {
    if (activeId) {
      return previewIndex.find((entry) => entry.id === activeId) ?? null;
    }
    return previewIndex[0] ?? null;
  }, [activeId, previewIndex]);

  const audioSrc = activeEntry?.audio ? `/preview/${activeEntry.audio}` : null;
  const previewScript = script;
  const timelineSummary = useMemo(() => summarizeTimeline(timeline), [timeline]);
  const { fps, width, height, durationSec, durationFrames } = useMemo(
    () =>
      deriveVideoConfig({
        script: previewScript,
        timelineSummary,
        defaults: { fps: 30, width: 1280, height: 720 },
      }),
    [previewScript, timelineSummary],
  );
  const maxFrame = Math.max(0, durationFrames - 1);
  const currentTimeSec = currentFrame / fps;
  const activeScene = useMemo(() => getActiveScene(previewScript, currentTimeSec), [previewScript, currentTimeSec]);
  const activeCue = useMemo(() => getActiveCue(previewScript, currentTimeSec), [previewScript, currentTimeSec]);
  const timelineLayout = useMemo(() => buildTimelineLayout(timeline, durationSec), [timeline, durationSec]);

  useEffect(() => {
    if (!previewIndex.length) {
      if (activeId) {
        setActiveId(null);
      }
      return;
    }
    if (!activeId || !previewIndex.find((entry) => entry.id === activeId)) {
      setActiveId(previewIndex[0]?.id ?? null);
    }
  }, [activeId, previewIndex]);

  useEffect(() => {
    let canceled = false;
    const loadIndex = async () => {
      try {
        const response = await fetch(`/preview/index.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Preview index unavailable (${response.status}).`);
        }
        const data = (await response.json()) as PreviewIndexResponse;
        if (canceled) {
          return;
        }
        const entries = Array.isArray(data?.compositions) ? data.compositions : [];
        setPreviewIndex(entries);
        setPreviewUpdatedAt(data.updatedAt ?? null);
        setPreviewError(null);
        if (!activeId && entries.length) {
          setActiveId(entries[0]?.id ?? null);
        }
      } catch (error) {
        if (!canceled) {
          setPreviewError(error instanceof Error ? error.message : "Preview index unavailable.");
        }
      }
    };

    void loadIndex();
    const interval = window.setInterval(loadIndex, 4000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [activeId]);

  useEffect(() => {
    let canceled = false;
    const scriptName = activeEntry?.script ?? (activeId ? `${activeId}.script.json` : null);
    if (!scriptName) {
      setScript(null);
      return;
    }

    const loadScript = async () => {
      try {
        const response = await fetch(`/preview/${scriptName}?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Script not found (${response.status}).`);
        }
        const data = (await response.json()) as ScriptData;
        if (!canceled) {
          setScript(data);
          setScriptError(null);
        }
      } catch (error) {
        if (!canceled) {
          setScript(null);
          setScriptError(error instanceof Error ? error.message : "Script unavailable.");
        }
      }
    };

    void loadScript();
    const interval = window.setInterval(loadScript, 4000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [activeEntry?.script, activeId]);

  useEffect(() => {
    let canceled = false;
    const timelineName = activeEntry?.timeline ?? (activeId ? `${activeId}.timeline.json` : null);
    if (!timelineName) {
      setTimeline(null);
      return;
    }

    const loadTimeline = async () => {
      try {
        const response = await fetch(`/preview/${timelineName}?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Timeline not found (${response.status}).`);
        }
        const data = (await response.json()) as TimelineData;
        if (!canceled) {
          setTimeline(data);
          setTimelineError(null);
        }
      } catch (error) {
        if (!canceled) {
          setTimeline(null);
          setTimelineError(error instanceof Error ? error.message : "Timeline unavailable.");
        }
      }
    };

    void loadTimeline();
    const interval = window.setInterval(loadTimeline, 4000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [activeEntry?.timeline, activeId]);

  useEffect(() => {
    setCurrentFrame(0);
    setPlaying(false);
  }, [activeEntry?.id]);

  useEffect(() => {
    setCurrentFrame((prev) => Math.min(prev, maxFrame));
  }, [maxFrame]);

  const clampFrame = useCallback(
    (value: number) => Math.max(0, Math.min(maxFrame, Math.round(value))),
    [maxFrame],
  );

  const syncAudioToFrame = useCallback((frame: number) => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }
    const target = frame / fps;
    if (!Number.isFinite(target)) {
      return;
    }
    if (Math.abs(audio.currentTime - target) > 0.08) {
      try {
        audio.currentTime = target;
      } catch {
        return;
      }
    }
  }, [audioSrc, fps]);

  useEffect(() => {
    if (!audioSrc) {
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (playing) {
      syncAudioToFrame(currentFrame);
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [audioSrc, currentFrame, fps, playing, syncAudioToFrame]);

  useEffect(() => {
    if (!playing) {
      syncAudioToFrame(currentFrame);
    }
  }, [audioSrc, currentFrame, playing, syncAudioToFrame]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    let raf = 0;
    let lastTime = performance.now();
    let accumulator = 0;

    const tick = (time: number) => {
      if (audioSrc) {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.currentTime)) {
          setCurrentFrame(clampFrame(Math.round(audio.currentTime * fps)));
        }
      } else {
        const frameDurationMs = 1000 / fps;
        const delta = time - lastTime;
        if (delta > 0) {
          accumulator += delta / frameDurationMs;
          const advance = Math.floor(accumulator);
          if (advance > 0) {
            accumulator -= advance;
            let shouldStop = false;
            setCurrentFrame((prev) => {
              const next = clampFrame(prev + advance);
              if (next >= maxFrame) {
                shouldStop = true;
              }
              return next;
            });
            if (shouldStop) {
              setPlaying(false);
              return;
            }
          }
          lastTime = time;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [audioSrc, clampFrame, fps, maxFrame, playing]);

  const handleFrameChange = (value: number) => {
    const clamped = clampFrame(value);
    setCurrentFrame(clamped);
    if (audioSrc) {
      syncAudioToFrame(clamped);
    }
  };

  const handleTogglePlayback = () => {
    setPlaying((prev) => !prev);
  };

  const handlePreviewChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setActiveId(next || null);
  };

  const jumpToTime = (timeSec?: number | null) => {
    const target = Math.max(0, Math.round((timeSec ?? 0) * fps));
    handleFrameChange(target);
  };

  const handleRender = async () => {
    if (!activeEntry) {
      setRenderError("Select a preview entry before rendering.");
      return;
    }
    const parsedWorkers = Number(renderWorkers);
    const workers = Number.isFinite(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : undefined;
    const ffmpegArgs = renderFfmpegArgs.trim() ? parseArgList(renderFfmpegArgs) : undefined;
    setRendering(true);
    setRenderError(null);
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeEntry.id,
          script: activeEntry.script,
          timeline: activeEntry.timeline,
          audio: activeEntry.audio,
          title: activeEntry.title ?? activeEntry.id,
          subtitle: previewScript?.scenes?.[0]?.title ?? null,
          workers,
          ffmpegArgs,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Render failed (${response.status}).`);
      }
      const payload = (await response.json()) as RenderResult;
      setLastRender({ ...payload, createdAt: payload.createdAt ?? new Date().toISOString() });
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Render failed.");
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold">Core Renderer Preview</h2>
        </div>
        <div className="flex items-center gap-2">
           <div className="status-pill">
            Preview index: {previewIndex.length ? "loaded" : "waiting"}
          </div>
          <div className="status-pill">Updated: {formatTimestamp(previewUpdatedAt)}</div>
        </div>
      </div>
      
      <section className="core-grid">
        <div className="core-column">
          <section className="panel">
            <div className="panel-title">Preview Source</div>
            <div className="preview-row">
              <label className="preview-label" htmlFor="preview-select">
                Composition
              </label>
              <select
                id="preview-select"
                className="preview-select"
                value={activeEntry?.id ?? ""}
                onChange={handlePreviewChange}
                disabled={!previewIndex.length}
              >
                {previewIndex.length === 0 ? <option value="">Demo</option> : null}
                {previewIndex.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title ?? entry.id}
                  </option>
                ))}
              </select>
            </div>
            {previewError ? <div className="notice notice--error">{previewError}</div> : null}
            {!previewIndex.length ? (
              <div className="notice">
                Generate preview artifacts with
                <code>npm run studio:preview -- content/your-video.babulus.ts</code>.
              </div>
            ) : null}
            <div className="artifact-list">
              <div>
                <span className="artifact-label">Script</span>
                <span className="artifact-value">{activeEntry?.script ?? "preview.script.json"}</span>
              </div>
              <div>
                <span className="artifact-label">Timeline</span>
                <span className="artifact-value">{activeEntry?.timeline ?? "preview.timeline.json"}</span>
              </div>
              <div>
                <span className="artifact-label">Audio</span>
                <span className="artifact-value">{activeEntry?.audio ?? "none"}</span>
              </div>
            </div>
            {scriptError ? <div className="notice notice--error">{scriptError}</div> : null}
            {timelineError ? <div className="notice notice--error">{timelineError}</div> : null}
          </section>

          <section className="panel">
            <div className="panel-title">Transport</div>
            <div className="transport-row">
              <button className="button" type="button" onClick={handleTogglePlayback}>
                {playing ? "Pause" : "Play"}
              </button>
              <div className="transport-meta">
                {formatTime(currentTimeSec)} / {formatTime(durationSec)}
              </div>
              <div className="transport-meta">
                frame {currentFrame} / {maxFrame}
              </div>
            </div>
            <input
              className="transport-slider"
              type="range"
              min={0}
              max={maxFrame}
              value={currentFrame}
              onChange={(event) => handleFrameChange(Number(event.currentTarget.value))}
            />
            <div className="transport-meta">{fps} fps · {width}x{height}</div>
          </section>

          <section className="panel">
            <div className="panel-title">Active Moment</div>
            <div className="moment-card">
              <div className="moment-label">{sceneLabel(activeScene)}</div>
              <div className="moment-value">{cueLabel(activeCue)}</div>
              <div className="moment-meta">{formatTime(currentTimeSec)} into composition</div>
            </div>
            <div className="scene-list">
              {(previewScript.scenes ?? []).map((scene) => (
                <div key={scene.id ?? scene.title} className="scene-item">
                  <button type="button" className="scene-title" onClick={() => jumpToTime(scene.startSec)}>
                    {scene.title ?? scene.id ?? "Scene"}
                  </button>
                  <div className="scene-meta">
                    {formatTime(scene.startSec ?? 0)} - {formatTime(scene.endSec ?? 0)}
                  </div>
                  <div className="cue-list">
                    {(scene.cues ?? []).map((cue) => (
                      <button
                        key={cue.id ?? cue.label ?? cue.text}
                        type="button"
                        className="cue-chip"
                        onClick={() => jumpToTime(cue.startSec)}
                      >
                        {cue.label ?? cue.text ?? cue.id ?? "Cue"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">Timeline</div>
            <div className="timeline-summary">
              {timelineSummary.trackCount} tracks · {timelineSummary.clipCount} clips
            </div>
            <div className="timeline">
              {timelineLayout.length === 0 ? (
                <div className="notice">No timeline tracks yet.</div>
              ) : (
                timelineLayout.map((track, index) => (
                  <div key={`${track.id ?? track.kind ?? "track"}-${index}`} className="timeline-track">
                    <div className="timeline-track-label">{track.kind ?? track.id ?? `Track ${index + 1}`}</div>
                    <div className="timeline-track-bar">
                      {track.clips.map((clip, clipIndex) => {
                        const active = currentTimeSec >= clip.range.startSec && currentTimeSec < clip.range.endSec;
                        return (
                          <div
                            key={`${clip.id ?? clip.kind ?? "clip"}-${clipIndex}`}
                            className={`timeline-clip${active ? " timeline-clip--active" : ""}`}
                            style={{ left: `${clip.leftPct}%`, width: `${clip.widthPct}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="core-column">
          <section className="panel panel--player">
            <div className="panel-title">Preview</div>
            <Player
              component={StoryboardRenderer}
              config={{
                fps,
                width,
                height,
                durationFrames,
              }}
              inputProps={{ script: previewScript }}
              frame={currentFrame}
              onFrameChange={handleFrameChange}
              playing={playing}
              onPlayingChange={setPlaying}
              clock="external"
              showControls={false}
              surfaceStyle={{ width: "100%", height: "auto", aspectRatio: "16 / 9" }}
            />
            <audio ref={audioRef} src={audioSrc ?? undefined} preload="auto" onEnded={() => setPlaying(false)} />
          </section>

          <section className="panel">
            <div className="panel-title">Render MP4</div>
            <div className="render-row">
              <button className="button button--primary" type="button" onClick={handleRender} disabled={rendering}>
                {rendering ? "Rendering..." : "Render storyboard MP4"}
              </button>
              <div className="render-meta">Uses Playwright + ffmpeg locally.</div>
            </div>
            <div className="render-controls">
              <label className="render-field">
                <span>Workers</span>
                <input
                  value={renderWorkers}
                  onChange={(event) => setRenderWorkers(event.target.value)}
                  placeholder="auto"
                />
              </label>
              <label className="render-field">
                <span>ffmpeg args</span>
                <input
                  value={renderFfmpegArgs}
                  onChange={(event) => setRenderFfmpegArgs(event.target.value)}
                  placeholder='-preset ultrafast -c:v h264_videotoolbox'
                />
              </label>
            </div>
            {renderError ? <div className="notice notice--error">{renderError}</div> : null}
            {lastRender ? (
              <div className="render-result">
                <div>Latest render: {lastRender.id}</div>
                <a href={lastRender.output} target="_blank" rel="noreferrer">
                  {lastRender.output}
                </a>
                <div className="render-meta">{formatTimestamp(lastRender.createdAt)}</div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}
