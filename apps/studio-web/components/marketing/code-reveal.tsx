"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CodeReveal() {
  const [mode, setMode] = useState<"preview" | "code">("preview");

  return (
    <div className="w-full max-w-4xl mx-auto rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
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
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-white tracking-tighter">
                HELLO WORLD
              </div>
              <p className="text-zinc-400">Generated from TypeScript</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#1e1e1e] p-6 overflow-auto text-sm font-mono text-zinc-300">
            <pre>
              {`import { Composition, Scene, Audio } from "@babulus/dsl";

export default new Composition({
  width: 1920,
  height: 1080,
  fps: 30,
  scenes: [
    new Scene({
      duration: 5,
      elements: [
        {
          type: "text",
          content: "HELLO WORLD",
          style: {
            fontSize: 120,
            fontWeight: "bold",
            color: "white"
          }
        }
      ],
      audio: new Audio({
        src: "./assets/intro.mp3"
      })
    })
  ]
});`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
