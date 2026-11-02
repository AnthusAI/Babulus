"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VomPreviewPlayer } from "@/components/vom-preview-player";
import { VideomlDomPlayer } from "@/components/videoml-dom-player";

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

export function TemporalReflowDemo({ autoPlay }: { autoPlay?: boolean }) {
  const xml = useMemo(
    () => `
<vml id="temporal-reflow" title="Temporal Reflow" fps="30" width="1280" height="720">
  <scene id="reflow">
    <layer id="content">
      <sequence>
        <video-title duration="1s" props='{"text":"Beat 1","position":{"x":96,"y":140},"fontSize":64}' />
        <video-title duration="1.2s" props='{"text":"Beat 2","position":{"x":96,"y":260},"fontSize":64,"color":"#3b82f6"}' />
        <video-title duration="0.8s" props='{"text":"Beat 3","position":{"x":96,"y":380},"fontSize":64,"color":"#10b981"}' />
      </sequence>
    </layer>
  </scene>
</vml>`.trim(),
    [],
  );
  return (
    <DemoShell note="Scene duration is derived from the sequence total.">
      <VomPreviewPlayer xml={xml} width={1280} height={720} autoPlay={autoPlay} showControls />
    </DemoShell>
  );
}

export function SequenceStackDemo() {
  const sequenceXml = useMemo(
    () => `
<vml id="sequence-demo" title="Sequence Demo" fps="30" width="1280" height="720">
  <scene id="sequence">
    <layer id="content">
      <sequence>
        <video-title duration="1.2s" props='{"text":"Seq A","position":{"x":96,"y":140},"fontSize":64,"color":"#f97316"}' />
        <video-title duration="1.2s" props='{"text":"Seq B","position":{"x":96,"y":260},"fontSize":64,"color":"#22c55e"}' />
        <video-title duration="1.2s" props='{"text":"Seq C","position":{"x":96,"y":380},"fontSize":64,"color":"#3b82f6"}' />
      </sequence>
    </layer>
  </scene>
</vml>`.trim(),
    [],
  );
  const stackXml = useMemo(
    () => `
<vml id="stack-demo" title="Stack Demo" fps="30" width="1280" height="720">
  <scene id="stack">
    <layer id="content">
      <stack>
        <video-rectangle duration="3s" props='{"width":1280,"height":720,"color":"#111827"}' />
        <video-title duration="3s" props='{"text":"Stacked Title","position":{"x":96,"y":220},"fontSize":64,"color":"#f472b6"}' />
        <video-subtitle duration="3s" props='{"text":"Overlayed in parallel","position":{"x":96,"y":320},"fontSize":36,"color":"#e5e7eb"}' />
      </stack>
    </layer>
  </scene>
</vml>`.trim(),
    [],
  );
  return (
    <DemoShell note="Sequence plays items one after another; stack overlays items in parallel.">
      <div className="grid gap-4 md:grid-cols-2">
        <VomPreviewPlayer xml={sequenceXml} width={640} height={360} showControls />
        <VomPreviewPlayer xml={stackXml} width={640} height={360} showControls />
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
      <video-title props='{"text":"${scene.title}","position":{"x":96,"y":180},"fontSize":64,"color":"${scene.color}"}' />
    </layer>
  </scene>`;
      })
      .join("\n");
    return `
<vml id="live-open" title="Live Open" fps="30" width="1280" height="720">${body}
</vml>`.trim();
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
<vml id="live-dom" title="Live DOM" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <video-title props='{"text":"${title}","position":{"x":96,"y":220},"fontSize":64,"color":"#a78bfa"}' />
    </layer>
  </scene>
</vml>`.trim());

  useEffect(() => {
    setXml(`
<vml id="live-dom" title="Live DOM" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <video-title props='{"text":"${title}","position":{"x":96,"y":220},"fontSize":64,"color":"#a78bfa"}' />
    </layer>
  </scene>
</vml>`.trim());
  }, [title]);

  const updateTitle = useCallback(() => {
    const now = new Date();
    setTitle(`Updated at ${now.toLocaleTimeString()}`);
  }, []);

  return (
    <DemoShell note="Edits to visible nodes appear immediately.">
      <div className="flex flex-col gap-3">
        <VomPreviewPlayer xml={xml} width={1280} height={720} autoPlay showControls={false} clockMode="live" />
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
<vml id="named-actions" title="Named Actions" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <title-slide id="inline-demo" props='{"eyebrow":"Inline JS","title":"Click to mutate DOM","subtitle":"Events run in the live VOM","verticalAlign":"center","horizontalAlign":"center","entranceStartFrame":-999}' />
      <button on:click='const el=root.querySelector(\"#inline-demo\");const props=JSON.parse(el.getAttribute(\"props\")||\"{}\");props.subtitle=\"Updated @ \"+new Date().toLocaleTimeString();el.setAttribute(\"props\",JSON.stringify(props));' style="position:absolute;left:48px;bottom:48px;padding:12px 18px;border-radius:12px;background:#111827;color:#e5e7eb;font-size:16px;border:none;cursor:pointer;">
        Update Subtitle
      </button>
    </layer>
  </scene>
</vml>`.trim(),
    [],
  );

  return (
    <DemoShell note="Inline JS or external events can mutate the live DOM.">
      <div className="flex flex-col gap-3">
        <VomPreviewPlayer xml={xml} width={1280} height={720} autoPlay showControls={false} clockMode="live" />
      </div>
    </DemoShell>
  );
}

export function MultiScreenSyncDemo() {
  const xml = useMemo(
    () => `
<vml id="sync-demo" title="Sync Demo" fps="30" width="1280" height="720">
  <scene id="scene-001" start="0s">
    <layer id="content">
      <sequence>
        <video-title duration="1.2s" props='{"text":"Sync A","position":{"x":96,"y":200},"fontSize":64,"color":"#38bdf8"}' />
        <video-title duration="1.2s" props='{"text":"Sync B","position":{"x":96,"y":320},"fontSize":64,"color":"#f472b6"}' />
        <video-title duration="1.2s" props='{"text":"Sync C","position":{"x":96,"y":440},"fontSize":64,"color":"#facc15"}' />
      </sequence>
    </layer>
  </scene>
</vml>`.trim(),
    [],
  );
  const [sync, setSync] = useState(true);

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
          <VideomlDomPlayer
            xml={xml}
            width={640}
            height={360}
            autoPlay
            clockMode="live"
            loop={false}
            syncGroup={sync ? "docs-sync" : "docs-sync-a"}
          />
          <VideomlDomPlayer
            xml={xml}
            width={640}
            height={360}
            autoPlay
            clockMode="live"
            loop={false}
            syncGroup={sync ? "docs-sync" : "docs-sync-b"}
          />
        </div>
      </div>
    </DemoShell>
  );
}
