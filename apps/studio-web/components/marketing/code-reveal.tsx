"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { mountVmlPlayer } from "@videoml/player";

export function CodeReveal() {
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const helloWorldXml = useMemo(() => {
    // Keep this example intentionally small but obviously "playing":
    // - motion-bars animates from timeline:tick
    // - inline script updates progress-bar percent over time
    return `<vml id="hello-world" title="Hello World" fps="30" width="1920" height="1080">
  <scene id="intro" duration="6s">
    <!-- Note: this is parsed via DOMParser(\"text/html\"), so avoid XML self-closing tags. -->
    <video-background style="position:absolute;inset:0;display:block;"></video-background>
    <motion-bars style="position:absolute;inset:0;display:block;height:100%;width:100%;" props='{"eyebrow":"VideoML (VML)","title":"HELLO WORLD","subtitle":"This is real VML playing in your browser."}'></motion-bars>
    <progress-bar id="progress" style="position:absolute;left:48px;right:48px;bottom:48px;display:block;" props='{"label":"Timeline","progress":0}'></progress-bar>
    <script>
      const durationSec = 6;
      const bar = root.querySelector('#progress');
      if (bar) {
        root.addEventListener('timeline:tick', (event) => {
          const time = event?.detail?.time ?? 0;
          const pct = Math.max(0, Math.min(100, (time / durationSec) * 100));
          bar.setAttribute('props', JSON.stringify({ label: 'Timeline', progress: pct }));
        });
      }
    </script>
  </scene>
</vml>`;
  }, []);

  useEffect(() => {
    if (mode !== "preview") return;
    const el = previewRef.current;
    if (!el) return;

    // Use the runtime directly so the preview always fills its container.
    setPreviewError(null);
    return mountVmlPlayer(el, {
      xml: helloWorldXml,
      autoPlay: true,
      clockMode: "bounded",
      loop: true,
      onError: setPreviewError,
    });
  }, [mode, helloWorldXml]);

  return (
    <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-2xl bg-card text-card-foreground">
      <div className="flex items-center justify-between bg-recess p-4">
        <div className="flex space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex space-x-2">
          <Button
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("preview")}
          >
            Preview
          </Button>
          <Button
            variant={mode === "code" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("code")}
          >
            Code
          </Button>
        </div>
      </div>
      <div className="p-0 overflow-hidden min-h-[400px] relative">
        {mode === "preview" ? (
          <div className="absolute inset-0 bg-recess p-3">
            <div className="h-full w-full overflow-hidden rounded-xl bg-background relative">
              <div ref={previewRef} className="h-full w-full" />
              {process.env.NODE_ENV !== "production" && previewError && (
                <div className="absolute left-3 top-3 rounded-md bg-background/80 px-2 py-1 text-xs text-foreground/70">
                  Error: {previewError}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-background p-6 overflow-auto text-sm font-mono text-foreground/80">
            <pre>
              {helloWorldXml}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
