'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ScriptData } from '@babulus/shared';
import { PreviewPlayer } from '@/components/preview-player';

type DocsPreviewPlayerProps = {
  id: string;
  defaultWidth?: number;
  defaultHeight?: number;
};

export function DocsPreviewPlayer({ id, defaultWidth = 1920, defaultHeight = 1080 }: DocsPreviewPlayerProps) {
  const searchParams = useSearchParams();
  const [script, setScript] = useState<ScriptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const width = useMemo(() => {
    const value = Number(searchParams?.get('w') ?? defaultWidth);
    return Number.isFinite(value) && value > 0 ? value : defaultWidth;
  }, [defaultWidth, searchParams]);

  const height = useMemo(() => {
    const value = Number(searchParams?.get('h') ?? defaultHeight);
    return Number.isFinite(value) && value > 0 ? value : defaultHeight;
  }, [defaultHeight, searchParams]);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        setError(null);
        const response = await fetch(`/preview/${id}.script.json?ts=${Date.now()}`, {
          cache: 'no-store',
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
        const message = err instanceof Error ? err.message : 'Failed to load preview.';
        setError(message);
      }
    };

    load();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [id]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
        {error} Generate previews with <code>npm run studio:preview -- examples/{id}.video.tsx</code>.
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

  return <PreviewPlayer script={script} width={width} height={height} overlayControls />;
}
