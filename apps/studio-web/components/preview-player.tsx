'use client';

/**
 * Instant preview player for Babulus DSL files.
 *
 * Provides play/pause/seek controls and renders ScriptData using ComposableRenderer
 * without requiring full generation (no TTS, no audio, placeholder timing).
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ComposableRenderer, RendererProvider } from '@babulus/renderer';
import type { ScriptData } from '@babulus/shared';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, X } from 'lucide-react';

export type PreviewPlayerProps = {
  script: ScriptData;
  width?: number;
  height?: number;
  overlayControls?: boolean;
  align?: 'center' | 'start';
  fillHeight?: boolean;
  initialTime?: number;
  autoPlay?: boolean;
  loop?: boolean;
  preserveTimeOnScriptChange?: boolean;
  clockMode?: 'bounded' | 'live';
  liveHorizonSeconds?: number;
  showControls?: boolean;
  onExitFullscreen?: () => void;
  onTimeUpdate?: (timeSec: number, durationSec: number) => void;
  hideControlsDelayMs?: number;
  themeStyle?: React.CSSProperties;
};

/**
 * Preview player component with timeline controls.
 *
 * Usage:
 * ```tsx
 * <PreviewPlayer script={scriptData} width={1280} height={720} />
 * ```
 */
export function PreviewPlayer({
  script,
  width = 1280,
  height = 720,
  overlayControls = false,
  align = 'center',
  fillHeight = true,
  initialTime = 0,
  autoPlay = false,
  loop = true,
  preserveTimeOnScriptChange = false,
  clockMode = 'bounded',
  liveHorizonSeconds = 6 * 60 * 60,
  showControls = true,
  onExitFullscreen,
  onTimeUpdate,
  hideControlsDelayMs = 2200,
  themeStyle,
}: PreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [showOverlayControls, setShowOverlayControls] = useState(true);
  const animationFrameRef = useRef<number>();
  const lastTimestampRef = useRef<number>();
  const currentTimeRef = useRef<number>(initialTime);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);

  const fps = script.fps ?? 30;
  const derivedDuration = useMemo(() => {
    const scenes = script?.scenes ?? [];
    if (!scenes.length) return null;
    let maxEnd = 0;
    for (const scene of scenes) {
      if (typeof scene.endSec === 'number' && scene.endSec > maxEnd) {
        maxEnd = scene.endSec;
      }
    }
    return maxEnd > 0 ? maxEnd : null;
  }, [script]);
  const duration = script.meta?.durationSeconds ?? derivedDuration ?? 10;
  const renderDuration = clockMode === 'live' ? liveHorizonSeconds : duration;
  const currentFrame = Math.floor(currentTime * fps);

  useEffect(() => {
    if (preserveTimeOnScriptChange) {
      lastTimestampRef.current = undefined;
      return;
    }
    setCurrentTime(initialTime);
    currentTimeRef.current = initialTime;
    setIsPlaying(autoPlay);
    lastTimestampRef.current = undefined;
  }, [autoPlay, initialTime, preserveTimeOnScriptChange, script]);

  useEffect(() => {
    const element = previewAreaRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      setPreviewSize({ width: nextWidth, height: nextHeight });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Animation loop using requestAnimationFrame for smooth playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }

      const deltaMs = timestamp - lastTimestampRef.current;
      const deltaSec = deltaMs / 1000;
      const newTime = currentTimeRef.current + deltaSec;

      if (clockMode === 'live') {
        currentTimeRef.current = newTime;
        setCurrentTime(newTime);
        lastTimestampRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (newTime >= duration) {
        if (loop) {
          const nextTime = duration > 0 ? newTime % duration : 0;
          currentTimeRef.current = nextTime;
          setCurrentTime(nextTime);
          lastTimestampRef.current = timestamp;
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          currentTimeRef.current = duration;
          setCurrentTime(duration);
          lastTimestampRef.current = timestamp;
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      } else {
        currentTimeRef.current = newTime;
        setCurrentTime(newTime);
        lastTimestampRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, loop, clockMode]);

  useEffect(() => {
    if (!onTimeUpdate) {
      return;
    }
    onTimeUpdate(currentTime, duration);
  }, [currentTime, duration, onTimeUpdate]);

  const handlePlayPause = () => {
    const nextPlaying = !isPlaying;
    if (nextPlaying && currentTime >= duration && clockMode !== 'live') {
      setCurrentTime(0);
      currentTimeRef.current = 0;
    }
    setIsPlaying(nextPlaying);
    lastTimestampRef.current = undefined;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(e.target.value);
    currentTimeRef.current = nextTime;
    setCurrentTime(nextTime);
    lastTimestampRef.current = undefined;
  };

  const handleReset = () => {
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setIsPlaying(false);
    lastTimestampRef.current = undefined;
  };

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    if (!overlayControls) {
      return;
    }
    clearHideControlsTimeout();
    if (!isPlaying) {
      setShowOverlayControls(true);
      return;
    }
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setShowOverlayControls(false);
    }, hideControlsDelayMs);
  }, [clearHideControlsTimeout, hideControlsDelayMs, isPlaying, overlayControls]);

  useEffect(() => {
    scheduleHideControls();
    return () => clearHideControlsTimeout();
  }, [scheduleHideControls, clearHideControlsTimeout]);

  const handleUserActivity = useCallback(() => {
    if (!overlayControls) {
      return;
    }
    setShowOverlayControls(true);
    scheduleHideControls();
  }, [overlayControls, scheduleHideControls]);

  const scale = useMemo(() => {
    const widthRatio = previewSize.width / width;
    const heightRatio = previewSize.height / height;
    const nextScale = Math.min(widthRatio, heightRatio);
    return Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
  }, [height, previewSize.height, previewSize.width, width]);

  const displayWidth = Math.max(1, Math.floor(width * scale));
  const displayHeight = Math.max(1, Math.floor(height * scale));
  const transportHeight = overlayControls ? 72 : 64;
  const overlayWidth = Math.max(240, Math.min(previewSize.width * 0.9, 960));
  const controlsVisible = overlayControls ? (showOverlayControls || !isPlaying) : true;
  const sceneBackground = script?.scenes?.[0]?.styles?.background;
  const backgroundColor = typeof sceneBackground === 'string' ? sceneBackground : '#000000';

  return (
    <div
      className="preview-player relative flex flex-col w-full"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <div
        ref={previewAreaRef}
        className={`${fillHeight ? 'flex-1 min-h-0' : 'flex-none'} flex ${
          align === 'start' ? 'items-start' : 'items-center'
        } justify-center`}
        style={
          fillHeight
            ? undefined
            : {
                width: "100%",
                aspectRatio: `${width} / ${height}`,
              }
        }
      >
        <div
          className="preview-canvas relative overflow-hidden"
          style={{
            width: displayWidth,
            height: displayHeight,
            backgroundColor,
            border: "none",
            borderRadius: 0,
            boxShadow: "none",
          }}
        >
          <div
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              ...(themeStyle ?? {}),
            }}
          >
              <RendererProvider
                frame={currentFrame}
                config={{
                  fps,
                  width,
                  height,
                  durationFrames: Math.floor(renderDuration * fps),
                }}
              >
                <ComposableRenderer script={script} liveMode={clockMode === 'live'} />
              </RendererProvider>
            </div>
        </div>
      </div>

      {showControls ? (
        overlayControls ? (
        <>
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-6 flex justify-center transition-opacity duration-300 ${
              controlsVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="pointer-events-auto flex flex-col rounded-2xl overflow-hidden bg-neutral-900/70 text-neutral-200 pt-1.5"
              style={{
                width: overlayWidth,
                height: transportHeight,
              }}
            >
              <input
                type="range"
                min="0"
                max={duration}
                step={1 / fps}  // Step by 1 frame
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-neutral-700 appearance-none cursor-pointer accent-blue-400 mt-1"
              />

              <div className="flex items-center gap-2 px-3 py-2 flex-1">
                <Button
                  onClick={handlePlayPause}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 px-2 text-neutral-100 hover:text-white"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 px-2 text-neutral-100 hover:text-white"
                  aria-label="Reset"
                  title="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <div className="text-xs text-neutral-300 ml-auto font-mono">
                  {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                  <span className="text-neutral-500 mx-1">•</span>
                  Frame {currentFrame}
                </div>
              </div>
            </div>
          </div>
          {onExitFullscreen && (
            <div
              className={`pointer-events-none absolute top-4 right-4 transition-opacity duration-300 ${
                controlsVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={onExitFullscreen}
                className="pointer-events-auto h-10 w-10 rounded-full bg-neutral-900/70 text-neutral-100 hover:text-white"
                title="Exit fullscreen"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </>
        ) : (
        <div
          className="preview-controls flex flex-col border-l border-r border-b border-gray-700 bg-gray-900 mx-auto rounded-none"
          style={{
            width: displayWidth,
            height: transportHeight,
          }}
        >
          <input
            type="range"
            min="0"
            max={duration}
            step={1 / fps}  // Step by 1 frame
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-700 appearance-none cursor-pointer accent-blue-500 mt-0.5"
          />

          <div className="flex items-center gap-2 px-2 py-2 flex-1">
            <Button
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 px-2"
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 px-2"
              aria-label="Reset"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <div className="text-xs text-gray-400 ml-auto font-mono">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
              <span className="text-gray-600 mx-1">•</span>
              Frame {currentFrame}
            </div>
          </div>
        </div>
        )
      ) : null}
    </div>
  );
}
