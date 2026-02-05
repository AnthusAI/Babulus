"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScriptData } from "@babulus/shared";
import { dslToScriptData, type PlaceholderTimingStrategy } from "@babulus/shared/dsl-to-script";
import { PreviewPlayer, type PreviewPlayerProps } from "@/components/preview-player";
import { executeVomXml, type VomPatchInput } from "@/lib/dsl-executor";

const DEFAULT_TIMING_STRATEGY: PlaceholderTimingStrategy = {
  type: "auto",
  secondsPerCue: 2,
};

type VomPreviewPlayerProps = {
  xml: string;
  patches?: VomPatchInput[];
  enforceSealed?: boolean;
  timingStrategy?: PlaceholderTimingStrategy;
} & Omit<PreviewPlayerProps, "script">;

export function VomPreviewPlayer({
  xml,
  patches,
  enforceSealed = false,
  timingStrategy = DEFAULT_TIMING_STRATEGY,
  ...playerProps
}: VomPreviewPlayerProps) {
  const [script, setScript] = useState<ScriptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patchKey = useMemo(() => JSON.stringify(patches ?? []), [patches]);
  const timingKey = useMemo(() => JSON.stringify(timingStrategy), [timingStrategy]);
  const stableTimingStrategy = useMemo(() => timingStrategy, [timingKey]);

  useEffect(() => {
    try {
      setError(null);
      const videoSpec = executeVomXml(xml, patches, enforceSealed);
      const composition = videoSpec.compositions?.[0];
      if (!composition) {
        throw new Error("No composition found in VOM XML.");
      }
      const nextScript = dslToScriptData(composition, stableTimingStrategy);
      setScript(nextScript);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to render VOM preview.";
      setError(message);
    }
  }, [xml, patchKey, enforceSealed, stableTimingStrategy]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
        {error}
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

  return <PreviewPlayer script={script} {...playerProps} />;
}
