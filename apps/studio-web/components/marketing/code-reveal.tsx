"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
export function CodeReveal() {
  const [mode, setMode] = useState<"preview" | "code">("preview");

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
          <div className="absolute inset-0 flex items-center justify-center bg-[#6a6a6a]">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-white/90 tracking-tighter">
                HELLO WORLD
              </div>
              <p className="text-white/70">Generated from XML</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#1e1e1e] p-6 overflow-auto text-sm font-mono text-white/80">
            <pre>
              {`<video id="hello-world" title="Hello World" fps="30" width="1920" height="1080">
  <scene id="intro" duration="5s">
    <layer id="content">
      <text props='{"content":"HELLO WORLD","fontSize":120,"fontWeight":"bold","color":"white"}' />
    </layer>
    <audio src="./assets/intro.mp3" />
  </scene>
</video>`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
