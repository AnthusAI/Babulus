"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScriptData } from "@babulus/shared";
import { PreviewPlayer } from "@/components/preview-player";
import { COLOR_SCHEMES } from "@/lib/theme/color-schemes";
import { TYPOGRAPHY_SCHEMES } from "@/lib/theme/typography-schemes";

type PreviewEmbedProps = {
  id: string;
  width?: number;
  height?: number;
  showControls?: boolean;
  showThemeControls?: boolean;
  defaultColorScheme?: string;
  defaultTypographyScheme?: string;
};

export function PreviewEmbed({
  id,
  width = 1920,
  height = 1080,
  showControls = true,
  showThemeControls = false,
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
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    audio.muted = false;
    audio.volume = 1;
    audio.load();
    console.info("[preview-audio] load", audioSrc);
  }, [audioSrc]);

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
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      if (playing) {
        console.info("[preview-audio] no audio source available.");
      }
      return;
    }
    if (playing) {
      audio.currentTime = audio.currentTime || 0;
      void audio.play().catch((err) => {
        console.warn("[preview-audio] play failed", err);
      });
      console.info("[preview-audio] play", audioSrc);
    } else {
      audio.pause();
      console.info("[preview-audio] pause");
    }
  };

  const handleTimeUpdate = (timeSec: number) => {
    const audio = audioRef.current;
    if (!audio || !audioSrc || !Number.isFinite(audio.currentTime)) {
      return;
    }
    if (isPlayingRef.current && audio.paused) {
      void audio.play().catch((err) => {
        console.warn("[preview-audio] resume failed", err);
      });
    }
    const last = lastTimeRef.current;
    lastTimeRef.current = timeSec;
    const delta = Math.abs(audio.currentTime - timeSec);
    const looped = timeSec + 0.05 < last;
    if (looped || delta > 0.5) {
      audio.currentTime = timeSec;
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
    </div>
  );
}
