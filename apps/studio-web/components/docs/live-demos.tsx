"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VomPreviewPlayer } from "@/components/vom-preview-player";
import { executeVomXml } from "@/lib/dsl-executor";
import { dslToScriptData, type PlaceholderTimingStrategy } from "@babulus/shared/dsl-to-script";
import type { ScriptData } from "@babulus/shared";
import { ComposableRenderer, RendererProvider, dispatchLiveAction } from "@babulus/renderer";

const VIDEO_FPS = 30;

type DemoShellProps = {
  children: React.ReactNode;
  note?: string;
};

function DemoShell({ children, note }: DemoShellProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl bg-card p-3 md:p-4">{children}</div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function useScriptFromXml(xml: string, timingStrategy: PlaceholderTimingStrategy): ScriptData | null {
  return useMemo(() => {
    const videoSpec = executeVomXml(xml, undefined, false);
    const composition = videoSpec.compositions?.[0];
    if (!composition) return null;
    return dslToScriptData(composition, timingStrategy);
  }, [xml, timingStrategy]);
}

export function TemporalReflowDemo({ autoPlay }: { autoPlay?: boolean }) {
  const xml = useMemo(
    () => `
<video id="temporal-reflow" title="Temporal Reflow" fps="30" width="1280" height="720">
  <scene id="reflow">
    <layer id="content">
      <sequence>
        <title duration="1s" props='{"text":"Beat 1","position":{"x":96,"y":140},"fontSize":64}' />
        <title duration="1.2s" props='{"text":"Beat 2","position":{"x":96,"y":260},"fontSize":64,"color":"#3b82f6"}' />
        <title duration="0.8s" props='{"text":"Beat 3","position":{"x":96,"y":380},"fontSize":64,"color":"#10b981"}' />
      </sequence>
    </layer>
  </scene>
</video>`.trim(),
    [],
  );
  return (
    <DemoShell note="Scene duration is derived from the sequence total.">
      <VomPreviewPlayer
        xml={xml}
        width={1280}
        height={720}
        autoPlay={autoPlay}
        showControls
        timingStrategy={{ type: "auto", secondsPerCue: 2 }}
      />
    </DemoShell>
  );
}

export function SequenceStackDemo() {
  const sequenceXml = useMemo(
    () => `
<video id="sequence-demo" title="Sequence Demo" fps="30" width="1280" height="720">
  <scene id="sequence">
    <layer id="content">
      <sequence>
        <title duration="1.2s" props='{"text":"Seq A","position":{"x":96,"y":140},"fontSize":64,"color":"#f97316"}' />
        <title duration="1.2s" props='{"text":"Seq B","position":{"x":96,"y":260},"fontSize":64,"color":"#22c55e"}' />
        <title duration="1.2s" props='{"text":"Seq C","position":{"x":96,"y":380},"fontSize":64,"color":"#3b82f6"}' />
      </sequence>
    </layer>
  </scene>
</video>`.trim(),
    [],
  );
  const stackXml = useMemo(
    () => `
<video id="stack-demo" title="Stack Demo" fps="30" width="1280" height="720">
  <scene id="stack">
    <layer id="content">
      <stack>
        <rectangle duration="3s" props='{"width":1280,"height":720,"color":"#111827"}' />
        <title duration="3s" props='{"text":"Stacked Title","position":{"x":96,"y":220},"fontSize":64,"color":"#f472b6"}' />
        <subtitle duration="3s" props='{"text":"Overlayed in parallel","position":{"x":96,"y":320},"fontSize":36,"color":"#e5e7eb"}' />
      </stack>
    </layer>
  </scene>
</video>`.trim(),
    [],
  );
  return (
    <DemoShell note="Sequence plays items one after another; stack overlays items in parallel.">
      <div className="grid gap-4 md:grid-cols-2">
        <VomPreviewPlayer
          xml={sequenceXml}
          width={640}
          height={360}
          showControls
          timingStrategy={{ type: "auto", secondsPerCue: 2 }}
        />
        <VomPreviewPlayer
          xml={stackXml}
          width={640}
          height={360}
          showControls
          timingStrategy={{ type: "auto", secondsPerCue: 2 }}
        />
      </div>
    </DemoShell>
  );
}

export function LiveOpenEndedDemo() {
  const [scenes, setScenes] = useState(() => [
    {
      id: "scene-001",
      start: 0,
      duration: null as number | null,
      title: "Open-ended live scene",
      color: "#38bdf8",
    },
  ]);
  const [count, setCount] = useState(2);
  const currentTimeRef = useRef(0);

  const xml = useMemo(() => {
    const body = scenes
      .map((scene) => {
        const durationAttr = scene.duration != null ? ` duration="${scene.duration.toFixed(2)}s"` : "";
        return `
  <scene id="${scene.id}" start="${scene.start.toFixed(2)}s"${durationAttr}>
    <layer id="content">
      <title props='{"text":"${scene.title}","position":{"x":96,"y":180},"fontSize":64,"color":"${scene.color}"}' />
    </layer>
  </scene>`;
      })
      .join("\n");
    return `
<video id="live-open" title="Live Open" fps="30" width="1280" height="720">${body}
</video>`.trim();
  }, [scenes]);

  const appendScene = useCallback(() => {
    const now = currentTimeRef.current;
    const nextId = `scene-${String(count).padStart(3, "0")}`;
    setCount((prev) => prev + 1);
    setScenes((prev) => {
      const last = prev[prev.length - 1];
      const end = now + 0.35;
      const duration = Math.max(0.2, end - last.start);
      const updatedLast = { ...last, duration };
      const next = {
        id: nextId,
        start: updatedLast.start + duration,
        duration: 3,
        title: `Queued ${nextId}`,
        color: "#facc15",
      };
      return [...prev.slice(0, -1), updatedLast, next];
    });
  }, [count]);

  return (
    <DemoShell note="Press the button to cut the open-ended scene and queue the next.">
      <div className="flex flex-col gap-3">
        <VomPreviewPlayer
          xml={xml}
          width={1280}
          height={720}
          autoPlay
          showControls={false}
          clockMode="live"
          timingStrategy={{ type: "live", secondsPerCue: 2 }}
          onTimeUpdate={(timeSec) => {
            currentTimeRef.current = timeSec;
          }}
        />
        <div className="flex justify-center">
          <Button onClick={appendScene}>Add Scene</Button>
        </div>
      </div>
    </DemoShell>
  );
}

export function LiveDomEditDemo() {
  const [title, setTitle] = useState("Live DOM edit");
  const [xml, setXml] = useState(() => `
<video id="live-dom" title="Live DOM" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <title props='{"text":"${title}","position":{"x":96,"y":220},"fontSize":64,"color":"#a78bfa"}' />
    </layer>
  </scene>
</video>`.trim());

  useEffect(() => {
    setXml(`
<video id="live-dom" title="Live DOM" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <title props='{"text":"${title}","position":{"x":96,"y":220},"fontSize":64,"color":"#a78bfa"}' />
    </layer>
  </scene>
</video>`.trim());
  }, [title]);

  const updateTitle = useCallback(() => {
    const now = new Date();
    setTitle(`Updated at ${now.toLocaleTimeString()}`);
  }, []);

  return (
    <DemoShell note="Edits to visible nodes appear immediately.">
      <div className="flex flex-col gap-3">
        <VomPreviewPlayer
          xml={xml}
          width={1280}
          height={720}
          autoPlay
          showControls={false}
          clockMode="live"
          timingStrategy={{ type: "live", secondsPerCue: 2 }}
        />
        <div className="flex justify-center">
          <Button onClick={updateTitle}>Update Title</Button>
        </div>
      </div>
    </DemoShell>
  );
}

export function NamedActionsDemo() {
  const xml = useMemo(
    () => `
<video id="named-actions" title="Named Actions" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <action-pulse props='{"actionName":"pulse","label":"Action: pulse","targetId":"pulse-card"}' />
    </layer>
  </scene>
</video>`.trim(),
    [],
  );

  const fireAction = useCallback(() => {
    dispatchLiveAction({ name: "pulse", targetId: "pulse-card" });
  }, []);

  return (
    <DemoShell note="Named actions dispatch to components without inline JS.">
      <div className="flex flex-col gap-3">
        <VomPreviewPlayer
          xml={xml}
          width={1280}
          height={720}
          autoPlay
          showControls={false}
          clockMode="live"
          timingStrategy={{ type: "live", secondsPerCue: 2 }}
        />
        <div className="flex justify-center">
          <Button onClick={fireAction}>Dispatch Action</Button>
        </div>
      </div>
    </DemoShell>
  );
}

function RenderSurface({
  script,
  width,
  height,
  timeSec,
}: {
  script: ScriptData;
  width: number;
  height: number;
  timeSec: number;
}) {
  const fps = script.fps ?? VIDEO_FPS;
  const frame = Math.floor(timeSec * fps);
  return (
    <div style={{ width, height }}>
      <RendererProvider frame={frame} config={{ fps, width, height, durationFrames: Math.floor(60 * fps) }}>
        <ComposableRenderer script={script} liveMode />
      </RendererProvider>
    </div>
  );
}

export function MultiScreenSyncDemo() {
  const xml = useMemo(
    () => `
<video id="sync-demo" title="Sync Demo" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <sequence>
        <title duration="1.2s" props='{"text":"Sync A","position":{"x":96,"y":200},"fontSize":64,"color":"#38bdf8"}' />
        <title duration="1.2s" props='{"text":"Sync B","position":{"x":96,"y":320},"fontSize":64,"color":"#f472b6"}' />
        <title duration="1.2s" props='{"text":"Sync C","position":{"x":96,"y":440},"fontSize":64,"color":"#facc15"}' />
      </sequence>
    </layer>
  </scene>
</video>`.trim(),
    [],
  );
  const script = useScriptFromXml(xml, { type: "auto", secondsPerCue: 2 });
  const [sync, setSync] = useState(true);
  const [timeSec, setTimeSec] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setTimeSec((prev) => prev + delta);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!script) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <DemoShell note="Toggle sync to see shared vs independent clocks.">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant={sync ? "default" : "secondary"} onClick={() => setSync(true)}>
            Sync On
          </Button>
          <Button variant={!sync ? "default" : "secondary"} onClick={() => setSync(false)}>
            Sync Off
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <RenderSurface script={script} width={640} height={360} timeSec={timeSec} />
          <RenderSurface script={script} width={640} height={360} timeSec={sync ? timeSec : timeSec * 1.3} />
        </div>
      </div>
    </DemoShell>
  );
}
