"use client";

import { useEffect, useState } from "react";
import { Player, interpolate, useCurrentFrame, useVideoConfig } from "@babulus/renderer";

const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationFrames } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, fps], [0, 1], { clamp: true });
  const subtitleOpacity = interpolate(frame, [fps * 0.6, fps * 1.4], [0, 1], { clamp: true });
  const offset = interpolate(frame, [0, fps * 4], [0, width * 0.4], { clamp: true });
  const progress = interpolate(frame, [0, durationFrames], [0, 1], { clamp: true });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top left, #1e293b 0%, #0b1220 60%, #05070f 100%)",
        color: "white",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 40,
          border: "1px solid rgba(148,163,184,0.2)",
          borderRadius: 24,
        }}
      />
      <div style={{ maxWidth: 520, zIndex: 2, textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.5, opacity: titleOpacity }}>
          Babulus Studio
        </div>
        <div style={{ marginTop: 12, fontSize: 18, color: "#cbd5f5", opacity: subtitleOpacity }}>
          Frame-driven previews with deterministic playback
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 60 + offset,
          height: 8,
          width: 240,
          borderRadius: 999,
          background: "rgba(148,163,184,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, progress * 100)}%`,
            background: "linear-gradient(90deg, #38bdf8, #818cf8)",
            transition: "width 0.1s linear",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 32,
          padding: "8px 12px",
          borderRadius: 999,
          background: "rgba(15,23,42,0.7)",
          color: "#cbd5f5",
          fontSize: 12,
          letterSpacing: 0.4,
        }}
      >
        {Math.round(frame)} / {durationFrames} frames · {height}p
      </div>
    </div>
  );
};

export default function Home() {
  const fallbackScenes = [
    {
      id: "scene-1",
      title: "Opening Hook",
      cues: ["Problem statement", "Credibility signal"],
    },
    {
      id: "scene-2",
      title: "Product Reveal",
      cues: ["Capability overview", "Outcome promise"],
    },
    {
      id: "scene-3",
      title: "Call to Action",
      cues: ["Invite signup", "Next steps"],
    },
  ];

  const messages = [
    { role: "assistant", content: "I drafted a tighter hook and added a stronger CTA. Want to preview?" },
    { role: "user", content: "Yes, but keep the tone calm and confident." },
    { role: "assistant", content: "Done. I also shortened the second scene to keep pacing tight." },
  ];

  const [scenes, setScenes] = useState(fallbackScenes);
  const [activeId, setActiveId] = useState("intro");
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    let currentId = activeId;

    const loadIndex = async () => {
      try {
        const res = await fetch(`/preview/index.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        const first = data?.compositions?.[0];
        if (first?.id && !canceled) {
          currentId = first.id;
          setActiveId(first.id);
        }
      } catch {
        // ignore
      }
    };

    const loadScript = async () => {
      try {
        const res = await fetch(`/preview/${currentId}.script.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (canceled || !data?.scenes) {
          return;
        }
        const mapped = data.scenes.map((scene: { id: string; title?: string; cues: Array<{ id: string; label?: string; text?: string }> }) => ({
          id: scene.id,
          title: scene.title ?? scene.id,
          cues: scene.cues.map((cue) => cue.label ?? cue.text ?? cue.id),
        }));
        setScenes(mapped);
        setLastSync(new Date().toLocaleTimeString());
      } catch {
        // ignore
      }
    };

    loadIndex().then(loadScript);
    const interval = setInterval(loadScript, 3000);

    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeId]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <div className="brand">Babulus Studio</div>
          <div className="header-meta">Tactus / {activeId} / preview</div>
        </div>
        <div className="header-actions">
          <button className="button button--ghost" type="button">
            Generate
          </button>
          <button className="button button--ghost" type="button">
            Render
          </button>
          <button className="button button--primary" type="button">
            Share Preview
          </button>
        </div>
      </header>

      <section className="app-body">
        <aside className="panel panel--storyboard">
          <div className="panel-title">Storyboard</div>
          <ul className="story-list">
            {scenes.map((scene) => (
              <li key={scene.id} className="story-item">
                <div className="story-title">{scene.title}</div>
                <ul className="cue-list">
                  {scene.cues.map((cue) => (
                    <li key={cue} className="cue-item">
                      {cue}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="panel-footer">
            {scenes.length} scenes · {scenes.reduce((sum, scene) => sum + scene.cues.length, 0)} cues
            {lastSync ? ` · synced ${lastSync}` : ""}
          </div>
        </aside>

        <section className="panel panel--chat">
          <div className="panel-title">Agent Chat</div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={`${msg.role}-${index}`} className={`chat-bubble chat-bubble--${msg.role}`}>
                <div className="chat-role">{msg.role === "assistant" ? "Agent" : "You"}</div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input placeholder="Describe the change you want..." />
            <button className="button button--primary" type="button">
              Send
            </button>
          </div>
        </section>

        <aside className="panel panel--preview">
          <div className="panel-title">Preview</div>
          <Player
            component={IntroScene}
            config={{
              fps: 30,
              width: 1280,
              height: 720,
              durationFrames: 450,
            }}
            surfaceStyle={{ width: "100%", height: "auto", aspectRatio: "16 / 9" }}
          />
          <div className="artifact-grid">
            <div className="artifact-card">
              <div className="artifact-title">Artifacts</div>
              <div className="artifact-meta">script.json · timeline.json</div>
            </div>
            <div className="artifact-card">
              <div className="artifact-title">Audio</div>
              <div className="artifact-meta">voiceover.wav · 00:15</div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
