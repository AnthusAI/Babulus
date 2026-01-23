"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Player, StoryboardRenderer } from "@babulus/renderer";
import {
  buildTimelineLayout,
  deriveVideoConfig,
  getActiveClips,
  getActiveCue,
  getActiveScene,
  summarizeTimeline,
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

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatMarkupValue = (value: unknown) => {
  if (value == null) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatMarkupValue).slice(0, 3).join(", ");
  }
  return "object";
};

const renderMarkupTags = (markup?: Record<string, unknown>) => {
  const entries = Object.entries(markup ?? {});
  if (!entries.length) {
    return null;
  }
  const labels = entries.slice(0, 3).map(([key, value]) => `${key}:${formatMarkupValue(value)}`);
  const extra = entries.length - labels.length;
  return (
    <span className="markup-tags">
      {labels.map((label, index) => (
        <span key={`${label}-${index}`} className="markup-tag">
          {label}
        </span>
      ))}
      {extra > 0 ? <span className="markup-tag">+{extra}</span> : null}
    </span>
  );
};

export default function Home() {
  const fallbackScript: ScriptData = {
    fps: 30,
    meta: { width: 1280, height: 720 },
    scenes: [
      {
        id: "scene-1",
        title: "Opening Hook",
        startSec: 0,
        endSec: 6,
        cues: [
          { id: "cue-1", label: "Problem statement", startSec: 0, endSec: 3 },
          { id: "cue-2", label: "Credibility signal", startSec: 3, endSec: 6 },
        ],
      },
      {
        id: "scene-2",
        title: "Product Reveal",
        startSec: 6,
        endSec: 12,
        cues: [
          { id: "cue-3", label: "Capability overview", startSec: 6, endSec: 9 },
          { id: "cue-4", label: "Outcome promise", startSec: 9, endSec: 12 },
        ],
      },
      {
        id: "scene-3",
        title: "Call to Action",
        startSec: 12,
        endSec: 18,
        cues: [
          { id: "cue-5", label: "Invite signup", startSec: 12, endSec: 15 },
          { id: "cue-6", label: "Next steps", startSec: 15, endSec: 18 },
        ],
      },
    ],
  };

  const messages = [
    { role: "assistant", content: "I drafted a tighter hook and added a stronger CTA. Want to preview?" },
    { role: "user", content: "Yes, but keep the tone calm and confident." },
    { role: "assistant", content: "Done. I also shortened the second scene to keep pacing tight." },
  ];

  const [script, setScript] = useState<ScriptData | null>(null);
  const [previewEntry, setPreviewEntry] = useState<PreviewEntry | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRaf = useRef<number | null>(null);
  const audioSrc = previewEntry?.audio ? `/preview/${previewEntry.audio}` : null;

  const previewScript = script ?? fallbackScript;
  const scenes = previewScript.scenes ?? [];
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
  const currentTimeSec = currentFrame / fps;
  const activeAudioClips = useMemo(() => getActiveClips(timeline, currentTimeSec), [timeline, currentTimeSec]);
  const timelineLayout = useMemo(() => buildTimelineLayout(timeline, durationSec), [timeline, durationSec]);
  const activeClipKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of activeAudioClips) {
      const trackKey = entry.trackId ?? entry.trackKind ?? "track";
      const clipKey = entry.clip.id ?? entry.clip.kind ?? "clip";
      keys.add(`${trackKey}:${clipKey}`);
    }
    return keys;
  }, [activeAudioClips]);

  const cueCount = useMemo(
    () => scenes.reduce((sum, scene) => sum + (scene.cues?.length ?? 0), 0),
    [scenes],
  );

  const activeScene = useMemo(() => getActiveScene(previewScript, currentTimeSec), [previewScript, currentTimeSec]);
  const activeCue = useMemo(() => getActiveCue(previewScript, currentTimeSec), [previewScript, currentTimeSec]);

  useEffect(() => {
    let canceled = false;
    const loadIndex = async () => {
      try {
        const res = await fetch(`/preview/index.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        const first = data?.compositions?.[0];
        if (first?.id && !canceled) {
          setPreviewEntry(first as PreviewEntry);
          setActiveId((prev) => prev ?? first.id);
        }
      } catch {
        // ignore
      }
    };
    loadIndex();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    let canceled = false;
    const scriptName = previewEntry?.script ?? `${activeId}.script.json`;

    const loadScript = async () => {
      try {
        const res = await fetch(`/preview/${scriptName}?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (canceled || !data?.scenes) {
          return;
        }
        const mappedScenes: ScriptScene[] = data.scenes.map((scene: ScriptScene) => ({
          id: scene.id,
          title: scene.title ?? scene.id,
          startSec: scene.startSec ?? 0,
          endSec: scene.endSec ?? 0,
          markup: scene.markup ?? undefined,
          cues: (scene.cues ?? []).map((cue) => ({
            id: cue.id,
            label: cue.label ?? cue.text ?? cue.id,
            text: cue.text ?? "",
            startSec: cue.startSec ?? 0,
            endSec: cue.endSec ?? cue.startSec ?? 0,
            markup: cue.markup ?? undefined,
          })),
        }));
        setScript({
          scenes: mappedScenes,
          fps: data.fps,
          meta: data.meta,
        });
        setLastSync(new Date().toLocaleTimeString());
      } catch {
        // ignore
      }
    };

    loadScript();
    const interval = setInterval(loadScript, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeId, previewEntry?.script]);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    let canceled = false;
    const timelineName = previewEntry?.timeline ?? `${activeId}.timeline.json`;

    const loadTimeline = async () => {
      try {
        const res = await fetch(`/preview/${timelineName}?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (canceled) {
          return;
        }
        setTimeline(data as TimelineData);
      } catch {
        // ignore
      }
    };

    loadTimeline();
    const interval = setInterval(loadTimeline, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeId, previewEntry?.timeline]);

  useEffect(() => {
    setCurrentFrame(0);
    setPlaying(false);
  }, [activeId]);

  useEffect(() => {
    const maxFrame = Math.max(0, durationFrames - 1);
    setCurrentFrame((prev) => Math.min(prev, maxFrame));
  }, [durationFrames]);

  const syncAudioToFrame = (frame: number) => {
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
  };

  useEffect(() => {
    syncAudioToFrame(currentFrame);
  }, [audioSrc, fps]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }
    if (playing) {
      syncAudioToFrame(currentFrame);
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [playing, audioSrc]);

  useEffect(() => {
    if (!playing || !audioSrc) {
      if (playbackRaf.current != null) {
        cancelAnimationFrame(playbackRaf.current);
      }
      playbackRaf.current = null;
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (audio && Number.isFinite(audio.currentTime)) {
        const nextFrame = Math.max(0, Math.min(durationFrames - 1, Math.round(audio.currentTime * fps)));
        setCurrentFrame(nextFrame);
      }
      playbackRaf.current = requestAnimationFrame(tick);
    };
    playbackRaf.current = requestAnimationFrame(tick);
    return () => {
      if (playbackRaf.current != null) {
        cancelAnimationFrame(playbackRaf.current);
      }
      playbackRaf.current = null;
    };
  }, [playing, audioSrc, durationFrames, fps]);

  useEffect(() => {
    if (!playing) {
      syncAudioToFrame(currentFrame);
    }
  }, [currentFrame, playing]);

  const seekToSeconds = (seconds: number) => {
    const frame = Math.round(seconds * fps);
    const clamped = Math.max(0, Math.min(durationFrames - 1, frame));
    setCurrentFrame(clamped);
    syncAudioToFrame(clamped);
  };

  const playheadPct = durationSec > 0 ? Math.min(100, Math.max(0, (currentTimeSec / durationSec) * 100)) : 0;

  const handleFrameChange = (frame: number) => {
    if (audioSrc) {
      seekToSeconds(frame / fps);
      return;
    }
    setCurrentFrame(frame);
  };

  const seekToRatio = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    seekToSeconds(clamped * durationSec);
  };

  const onTimelineClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) {
      return;
    }
    seekToRatio((event.clientX - rect.left) / rect.width);
  };

  const trackColor = (kind: string | null) => {
    switch (kind) {
      case "music":
        return "rgba(56, 189, 248, 0.7)";
      case "sfx":
        return "rgba(251, 191, 36, 0.75)";
      case "narration":
        return "rgba(129, 140, 248, 0.75)";
      default:
        return "rgba(148, 163, 184, 0.6)";
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <div className="brand">Babulus Studio</div>
          <div className="header-meta">Tactus / {activeId} / preview</div>
        </div>
        <div className="header-actions">
          <button className="button button--ghost" type="button">
            Generate
          </button>
          <button className="button button--ghost" type="button">
            Render
          </button>
          <button className="button button--primary" type="button">
            Share Preview
          </button>
        </div>
      </header>

      <section className="app-body">
        <aside className="panel panel--storyboard">
          <div className="panel-title">Storyboard</div>
          <ul className="story-list">
            {scenes.map((scene) => (
              <li key={scene.id} className={`story-item ${activeScene?.id === scene.id ? "story-item--active" : ""}`}>
                <button className="story-title story-link" type="button" onClick={() => seekToSeconds(scene.startSec)}>
                  <span>
                    {scene.title}
                    {renderMarkupTags(scene.markup)}
                  </span>
                  <span className="story-time">{formatTime(scene.startSec)}</span>
                </button>
                <ul className="cue-list">
                  {scene.cues.map((cue) => (
                    <li key={cue.id}>
                      <button
                        className={`cue-item ${activeCue?.id === cue.id ? "cue-item--active" : ""}`}
                        type="button"
                        onClick={() => seekToSeconds(cue.startSec)}
                      >
                        <span className="cue-label">
                          {cue.label ?? cue.text ?? cue.id}
                          {renderMarkupTags(cue.markup)}
                        </span>
                        <span className="cue-time">{formatTime(cue.startSec)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="panel-footer">
            {scenes.length} scenes · {cueCount} cues · {formatTime(durationSec)} · {fps} fps
            {lastSync ? ` · synced ${lastSync}` : " · using demo data"}
          </div>
        </aside>

        <section className="panel panel--chat">
          <div className="panel-title">Agent Chat</div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={`${msg.role}-${index}`} className={`chat-bubble chat-bubble--${msg.role}`}>
                <div className="chat-role">{msg.role === "assistant" ? "Agent" : "You"}</div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input placeholder="Describe the change you want..." />
            <button className="button button--primary" type="button">
              Send
            </button>
          </div>
        </section>

        <aside className="panel panel--preview">
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
            clock={audioSrc ? "external" : "internal"}
            surfaceStyle={{ width: "100%", height: "auto", aspectRatio: "16 / 9" }}
          />
          <audio
            ref={audioRef}
            src={audioSrc ?? undefined}
            preload="auto"
            onEnded={() => setPlaying(false)}
            style={{ display: "none" }}
          />
          <div className="artifact-grid">
            <div className="artifact-card">
              <div className="artifact-title">Artifacts</div>
              <div className="artifact-meta">
                {previewEntry?.script ?? `${activeId ?? "preview"}.script.json`} ·{" "}
                {previewEntry?.timeline ?? `${activeId ?? "preview"}.timeline.json`}
              </div>
            </div>
            <div className="artifact-card">
              <div className="artifact-title">Audio</div>
              <div className="artifact-meta">
                {previewEntry?.audio ?? "voiceover.wav"} · {timelineSummary.trackCount} tracks · {timelineSummary.clipCount} clips
              </div>
            </div>
          </div>
          <div className="audio-summary">
            <div className="panel-title">Active Audio</div>
            {activeAudioClips.length ? (
              <ul className="audio-list">
                {activeAudioClips.map((entry, index) => (
                  <li
                    key={`${entry.trackId ?? entry.trackKind ?? "track"}-${entry.clip.id ?? entry.clip.kind ?? index}`}
                    className="audio-item"
                  >
                    <span className="audio-badge">{entry.trackKind ?? entry.trackId ?? "track"}</span>
                    <span className="audio-label">{entry.clip.id ?? entry.clip.kind ?? "clip"}</span>
                    <span className="audio-time">
                      {formatTime(entry.range.startSec)}–{formatTime(entry.range.endSec)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="audio-empty">No active clips</div>
            )}
          </div>
          <div className="timeline-panel">
            <div className="panel-title">Timeline</div>
            <div className="timeline-rows">
              {timelineLayout.length ? (
                timelineLayout.map((track) => {
                  const trackKey = track.id ?? track.kind ?? "track";
                  return (
                    <div key={trackKey} className="timeline-row">
                      <div className="timeline-label">{track.kind ?? track.id ?? "track"}</div>
                      <div className="timeline-track" onClick={onTimelineClick} role="presentation">
                        <div className="timeline-playhead" style={{ left: `${playheadPct}%` }} />
                        {track.clips.map((clip, index) => {
                          const clipKey = `${trackKey}:${clip.id ?? clip.kind ?? index}`;
                          const isActive = activeClipKeys.has(clipKey);
                          return (
                            <button
                              key={clipKey}
                              type="button"
                              className={`timeline-clip ${isActive ? "timeline-clip--active" : ""}`}
                              style={{
                                left: `${clip.leftPct}%`,
                                width: `${clip.widthPct}%`,
                                background: trackColor(track.kind ?? null),
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                seekToSeconds(clip.range.startSec);
                              }}
                              title={`${clip.id ?? clip.kind ?? "clip"} ${formatTime(clip.range.startSec)}–${formatTime(clip.range.endSec)}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="audio-empty">No timeline clips</div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
