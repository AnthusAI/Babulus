"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScriptData } from "@babulus/shared";
import { PreviewPlayer } from "@/components/preview-player";
import { COLOR_SCHEMES } from "@videoml/stdlib/tokens";
import { TYPOGRAPHY_SCHEMES } from "@/lib/theme/typography-schemes";

type PreviewEmbedProps = {
  id: string;
  width?: number;
  height?: number;
  showControls?: boolean;
  showThemeControls?: boolean;
  audio?: boolean;
  defaultColorScheme?: string;
  defaultTypographyScheme?: string;
};

export function PreviewEmbed({
  id,
  width = 1920,
  height = 1080,
  showControls = true,
  showThemeControls = false,
  audio: audioEnabled = true,
  defaultColorScheme = "cool-dark",
  defaultTypographyScheme = "classic-news",
}: PreviewEmbedProps) {
  const [script, setScript] = useState<ScriptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [colorSchemeId, setColorSchemeId] = useState(defaultColorScheme);
  const [typographySchemeId, setTypographySchemeId] = useState(defaultTypographyScheme);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSyncLogRef = useRef(0);
  const isPlayingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const [timelineClips, setTimelineClips] = useState<
    Array<{ id: string; startSec: number; durationSec: number; src: string }>
  >([]);
  const currentClipRef = useRef<{ id: string; startSec: number; durationSec: number; src: string } | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const preloadCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const lastResyncRef = useRef(0);
  const warnedClipsRef = useRef<Set<string>>(new Set());
  const pendingClipRef = useRef<{ id: string; src: string; desiredTime: number } | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        setError(null);
        const response = await fetch(`/preview/${id}.script.json?ts=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Preview script not found for ${id}.`);
        }
        const data = (await response.json()) as ScriptData;
        if (isActive) {
          setScript(data);
        }
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : "Failed to load preview.";
        setError(message);
      }
    };

    load();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!audioEnabled) {
      setTimelineClips([]);
      currentClipRef.current = null;
      return;
    }
    let isActive = true;
    const controller = new AbortController();

    const loadTimeline = async () => {
      try {
        const response = await fetch(`/preview/${id}.timeline.json?ts=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Preview timeline not found for ${id}.`);
        }
        const data = (await response.json()) as {
          audio?: {
            tracks?: Array<{ kind?: string; clips?: Array<{ id: string; startSec: number; durationSec: number; src?: string }> }>;
          };
        };
        if (!isActive) return;
        const tracks = data.audio?.tracks ?? [];
        const narration = tracks.find((track) => track.kind === "narration") ?? tracks[0];
        const clips = (narration?.clips ?? [])
          .filter((clip) => typeof clip.src === "string")
          .map((clip) => ({
            id: clip.id,
            startSec: clip.startSec,
            durationSec: clip.durationSec,
            src: clip.src as string,
          }))
          .sort((a, b) => a.startSec - b.startSec);
        setTimelineClips(clips);
        currentClipRef.current = null;
      } catch {
        if (!isActive) return;
        setTimelineClips([]);
        currentClipRef.current = null;
      }
    };

    loadTimeline();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [audioEnabled, id]);

  useEffect(() => {
    if (!audioEnabled) {
      setAudioSrc(null);
      return;
    }
    let isActive = true;
    const controller = new AbortController();

    const loadIndex = async () => {
      try {
        const response = await fetch(`/preview/index.json?ts=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Preview index not found.");
        }
        const data = (await response.json()) as {
          compositions?: Array<{ id: string; audio?: string | null }>;
        };
        if (!isActive) return;
        const entry = data.compositions?.find((comp) => comp.id === id);
        const nextAudio = entry?.audio ? `/preview/${entry.audio}` : `/preview/${id}.wav`;
        setAudioSrc(nextAudio);
        console.info("[preview-audio] source", nextAudio);
      } catch {
        if (!isActive) return;
        const fallback = `/preview/${id}.wav`;
        setAudioSrc(fallback);
        console.info("[preview-audio] source", fallback);
      }
    };

    loadIndex();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [audioEnabled, id]);

  useEffect(() => {
    if (!audioEnabled) return;
    const cache = preloadCacheRef.current;
    for (const clip of timelineClips) {
      if (cache.has(clip.src)) continue;
      const preloader = new Audio();
      preloader.preload = "auto";
      preloader.src = clip.src;
      preloader.load();
      cache.set(clip.src, preloader);
    }
  }, [audioEnabled, timelineClips]);

  useEffect(() => {
    if (!audioEnabled) return;
    const audioEl = audioRef.current;
    if (!audioEl || !audioSrc) return;
    audioEl.muted = false;
    audioEl.volume = 1;
    audioEl.load();
    console.info("[preview-audio] load", audioSrc);
  }, [audioEnabled, audioSrc]);

  useEffect(() => {
    if (!audioEnabled) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const handleLoaded = () => {
      if (pendingClipRef.current && audioEl.src === pendingClipRef.current.src) {
        audioEl.currentTime = pendingClipRef.current.desiredTime;
        pendingClipRef.current = null;
      } else if (pendingSeekRef.current != null) {
        audioEl.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
      if (isPlayingRef.current) {
        void audioEl.play().catch(() => null);
      }
    };
    audioEl.addEventListener("loadedmetadata", handleLoaded);
    audioEl.addEventListener("canplay", handleLoaded);
    return () => {
      audioEl.removeEventListener("loadedmetadata", handleLoaded);
      audioEl.removeEventListener("canplay", handleLoaded);
    };
  }, [audioEnabled]);

  const colorScheme =
    COLOR_SCHEMES.find((scheme) => scheme.id === colorSchemeId) ?? COLOR_SCHEMES[0];
  const typographyScheme =
    TYPOGRAPHY_SCHEMES.find((scheme) => scheme.id === typographySchemeId) ?? TYPOGRAPHY_SCHEMES[0];

  const themeStyle: React.CSSProperties = useMemo(() => {
    if (!colorScheme) return {};
    return {
      ["--color-bg" as any]: colorScheme.palette.bg,
      ["--color-bg-subtle" as any]: colorScheme.palette.surface,
      ["--color-surface" as any]: colorScheme.palette.surface,
      ["--color-surface-strong" as any]: colorScheme.palette.surfaceStrong,
      ["--color-surface-2" as any]: colorScheme.palette.surfaceStrong,
      ["--color-text" as any]: colorScheme.palette.text,
      ["--color-text-strong" as any]: colorScheme.palette.textStrong,
      ["--color-text-muted" as any]: colorScheme.palette.textMuted,
      ["--color-primary" as any]: colorScheme.palette.primary,
      ["--color-secondary" as any]: colorScheme.palette.secondary,
      ["--color-accent" as any]: colorScheme.palette.primary,
      ["--color-accent-2" as any]: colorScheme.palette.secondary,
      ["--color-muted" as any]: colorScheme.palette.muted,
      ["--color-muted-more" as any]: colorScheme.palette.mutedMore,
      ...(typographyScheme
        ? {
            ["--font-eyebrow" as any]: typographyScheme.vars.eyebrow,
            ["--font-headline" as any]: typographyScheme.vars.headline,
            ["--font-subhead" as any]: typographyScheme.vars.subhead,
          }
        : {}),
    };
  }, [colorScheme, typographyScheme]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
        {error} Generate previews with <code>npm run studio:preview -- examples/{id}.video.tsx</code> or <code>examples/{id}.babulus.xml</code>.
      </div>
    );
  }

  if (!script) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted p-6 text-sm text-muted-foreground">
        Loading preview…
      </div>
    );
  }

  const handlePlayStateChange = (playing: boolean) => {
    isPlayingRef.current = playing;
    if (!audioEnabled) return;
    const audioEl = audioRef.current;
    if (!audioEl || (!audioSrc && timelineClips.length === 0)) {
      if (playing) {
        console.info("[preview-audio] no audio source available.");
      }
      return;
    }
    if (playing) {
      if (timelineClips.length > 0) {
        handleTimeUpdate(lastTimeRef.current);
      } else {
        audioEl.currentTime = audioEl.currentTime || 0;
        void audioEl.play().catch((err) => {
          console.warn("[preview-audio] play failed", err);
        });
        console.info("[preview-audio] play", audioSrc);
      }
    } else {
      audioEl.pause();
      console.info("[preview-audio] pause");
    }
  };

  const syncAudioToTime = (timeSec: number) => {
    const audioEl = audioRef.current;
    if (!audioEl || timelineClips.length === 0) return;
    if (pendingClipRef.current && audioEl.readyState < 2) {
      return;
    }
    let active: typeof timelineClips[number] | null = null;
    const current = currentClipRef.current;
    if (current && timeSec >= current.startSec && timeSec <= current.startSec + current.durationSec) {
      active = current;
    } else {
      for (const clip of timelineClips) {
        if (timeSec >= clip.startSec && timeSec <= clip.startSec + clip.durationSec) {
          active = clip;
          break;
        }
      }
    }
    if (!active) {
      currentClipRef.current = null;
      if (!audioEl.paused) audioEl.pause();
      return;
    }
    if (isPlayingRef.current && audioEl.readyState < 2) {
      const warnKey = `${active.id}:${active.src}`;
      if (!warnedClipsRef.current.has(warnKey)) {
        console.warn("[preview-audio] clip not ready", {
          id: active.id,
          src: active.src,
          readyState: audioEl.readyState,
          networkState: audioEl.networkState,
        });
        warnedClipsRef.current.add(warnKey);
      }
    }
    const desiredTime = Math.max(0, timeSec - active.startSec);
    if (!current || current.id !== active.id) {
      currentClipRef.current = active;
      if (audioEl.src !== active.src) {
        audioEl.src = active.src;
        pendingSeekRef.current = desiredTime;
        audioEl.load();
        if (audioEl.readyState < 2) {
          pendingClipRef.current = { id: active.id, src: active.src, desiredTime };
        } else if (isPlayingRef.current) {
          void audioEl.play().catch(() => null);
        }
        return;
      }
      audioEl.currentTime = desiredTime;
      if (isPlayingRef.current) {
        void audioEl.play().catch(() => null);
      }
      return;
    }
    const now = performance.now();
    if (
      audioEl.readyState >= 2 &&
      Math.abs(audioEl.currentTime - desiredTime) > 0.4 &&
      now - lastResyncRef.current > 600
    ) {
      audioEl.currentTime = desiredTime;
      lastResyncRef.current = now;
    }
    if (isPlayingRef.current && audioEl.paused) {
      void audioEl.play().catch(() => null);
    }
    const nextIndex = timelineClips.findIndex((clip) => clip.id === active.id) + 1;
    const next = timelineClips[nextIndex];
    if (next) {
      const preloaded = preloadCacheRef.current.get(next.src);
      if (!preloaded) {
        const preloader = new Audio();
        preloader.preload = "auto";
        preloader.src = next.src;
        preloader.load();
        preloadCacheRef.current.set(next.src, preloader);
      }
    }
  };

  const handleTimeUpdate = (timeSec: number) => {
    if (!audioEnabled) return;
    const audioEl = audioRef.current;
    if (timelineClips.length > 0) {
      syncAudioToTime(timeSec);
      return;
    }
    if (!audioEl || !audioSrc || !Number.isFinite(audioEl.currentTime)) {
      return;
    }
    if (isPlayingRef.current && audioEl.paused) {
      void audioEl.play().catch((err) => {
        console.warn("[preview-audio] resume failed", err);
      });
    }
    const last = lastTimeRef.current;
    lastTimeRef.current = timeSec;
    const delta = Math.abs(audioEl.currentTime - timeSec);
    const looped = timeSec + 0.05 < last;
    if (looped || delta > 0.5) {
      audioEl.currentTime = timeSec;
      const now = performance.now();
      if (now - lastSyncLogRef.current > 1000) {
        console.info("[preview-audio] sync", { timeSec, delta });
        lastSyncLogRef.current = now;
      }
    }
  };

  return (
    <div className="relative w-full">
      {showThemeControls ? (
        <div className="absolute right-2 top-2 z-10 flex gap-2">
          <select
            value={colorSchemeId}
            onChange={(event) => setColorSchemeId(event.target.value)}
            className="rounded-lg bg-muted/80 px-2 py-1 text-[11px] font-medium text-foreground/80"
          >
            {COLOR_SCHEMES.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.name}
              </option>
            ))}
          </select>
          <select
            value={typographySchemeId}
            onChange={(event) => setTypographySchemeId(event.target.value)}
            className="rounded-lg bg-muted/80 px-2 py-1 text-[11px] font-medium text-foreground/80"
          >
            {TYPOGRAPHY_SCHEMES.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <PreviewPlayer
        script={script}
        width={width}
        height={height}
        overlayControls={false}
        showControls={showControls}
        initialTime={0}
        autoPlay={false}
        align="start"
        fillHeight={false}
        themeStyle={themeStyle}
        onPlayStateChange={handlePlayStateChange}
        onTimeUpdate={handleTimeUpdate}
      />
      {audioEnabled ? (
        <audio
          ref={audioRef}
          src={audioSrc ?? undefined}
          preload="auto"
          onCanPlay={() => {
            if (audioSrc) {
              console.info("[preview-audio] canplay", audioSrc);
            }
          }}
          onEnded={() => {
            console.info("[preview-audio] ended");
          }}
          onError={(event) => {
            console.warn("[preview-audio] error", audioSrc, event);
          }}
        />
      ) : null}
    </div>
  );
}
