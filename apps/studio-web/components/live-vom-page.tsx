"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VomPreviewPlayer } from "@/components/vom-preview-player";

const TRANSITION_BUFFER_SECONDS = 0.35;
const MIN_SCENE_DURATION_SECONDS = 0.2;
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const VIDEO_FPS = 30;
const DEFAULT_SESSION_TITLE = "Live VOM Session";

type SceneTemplate = {
  label: string;
  duration: number;
  voice: string;
  componentTag: string;
  props: Record<string, unknown>;
};

type SceneEntry = {
  id: string;
  start: number;
  duration?: number | null;
  end?: number | null;
  xml: string;
  componentTag: string;
  voice: string;
  props: Record<string, unknown>;
};

const TEMPLATES: Record<string, SceneTemplate> = {
  title: {
    label: "Title",
    duration: 4,
    voice: "This is a title scene in the live VOM.",
    componentTag: "title-slide",
    props: {
      eyebrow: "Live VOM",
      title: "Queued in real time",
      subtitle: "Append scenes while playback continues",
      verticalAlign: "center",
      horizontalAlign: "center",
      entranceStartFrame: -999,
    },
  },
  bullets: {
    label: "Bullets",
    duration: 5,
    voice: "Bulleted scenes can be appended on demand.",
    componentTag: "bullet-list-screen",
    props: {
      eyebrow: "Bullet List",
      title: "Structured points",
      subtitle: "Rendered from XML",
      bullets: {
        items: ["Define a scene", "Queue it in time", "Render instantly"],
        bulletStyle: "icon",
        bulletIcon: { kind: "lucide", name: "check", size: 40, strokeWidth: 3 },
        fontSize: 48,
        lineHeight: 1.2,
        spacing: 24,
      },
    },
  },
  twoColumn: {
    label: "Two Column",
    duration: 5,
    voice: "Two column layouts work alongside narration cues.",
    componentTag: "two-column-screen",
    props: {
      eyebrow: "Two Column",
      title: "Parallel layout",
      subtitle: "Left and right panels",
      headerAlign: "left",
      left: {
        type: "PlaceholderPanel",
        id: "left",
        flex: 1,
        props: { label: "Left Panel", text: "Charts, visuals, or lists" },
      },
      right: {
        type: "PlaceholderPanel",
        id: "right",
        flex: 1,
        props: { label: "Right Panel", text: "Narration or callouts" },
      },
    },
  },
  chapter: {
    label: "Chapter Heading",
    duration: 4,
    voice: "Chapter headings pace the story with clear transitions.",
    componentTag: "chapter-heading",
    props: {
      number: "01",
      title: "Chapter break",
      subtitle: "Clean segmentation",
      layout: "side-by-side",
      numberEntrance: { type: "fade", from: 1, to: 1, durationFrames: 1 },
      titleEntrance: { type: "fade", from: 1, to: 1, durationFrames: 1 },
    },
  },
};

const TEMPLATE_ORDER = ["title", "bullets", "twoColumn", "chapter"];

const escapeXmlText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeXmlAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const SCENE_STYLES = escapeXmlAttribute(
  JSON.stringify({
    background: "#0f1117",
    color: "#e8eaf0",
  })
);

const formatSeconds = (value: number) => {
  const rounded = Math.max(0, value);
  const fixed = rounded.toFixed(2);
  return `${fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}s`;
};

const buildSceneXml = (entry: SceneEntry) => {
  const props = escapeXmlAttribute(JSON.stringify(entry.props));
  const voice = escapeXmlText(entry.voice);
  const durationAttr = entry.duration != null ? ` duration="${formatSeconds(entry.duration)}"` : "";

  return [
    `  <scene id="${entry.id}" start="${formatSeconds(entry.start)}"${durationAttr} styles='${SCENE_STYLES}'>`,
    `    <layer id="${entry.id}-layer">`,
    `      <${entry.componentTag} props='${props}' />`,
    "    </layer>",
    `    <cue id="${entry.id}-cue" label="${entry.id}-cue">`,
    `      <voice>${voice}</voice>`,
    "    </cue>",
    "  </scene>",
  ].join("\n");
};

const buildXmlDocument = (scenes: SceneEntry[], sessionTitle: string, recordedAtIso: string) => {
  const body = scenes.map((scene) => scene.xml).join("\n");
  const safeTitle = escapeXmlAttribute(sessionTitle || DEFAULT_SESSION_TITLE);
  const safeRecordedAt = escapeXmlAttribute(recordedAtIso);
  return [
    `<video id="live-vom" title="${safeTitle}" recordedAt="${safeRecordedAt}" fps="${VIDEO_FPS}" width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}">`,
    body,
    "</video>",
  ]
    .filter(Boolean)
    .join("\n");
};

const formatTimestamp = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return formatter.format(date).replace(",", "");
};

const formatIsoTimestamp = (date: Date) => date.toISOString().replace("T", " ").replace("Z", " UTC");

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const TITLE_VARIANTS = [
  "Queued live at {time}",
  "Live VOM update @ {time}",
  "Scene appended at {time}",
];

const BULLET_VARIANTS = [
  ["Timestamp: {time}", "Frame-accurate render", "XML is the recording"],
  ["Inserted at {time}", "Queued without pause", "Deterministic playback"],
  ["Now: {time}", "Frame-driven UI", "Reactive scene graph"],
];

const TWO_COLUMN_VARIANTS = [
  { left: "Left panel updated at {time}", right: "Right panel queued live" },
  { left: "Generated at {time}", right: "Rendered deterministically" },
  { left: "Live data: {time}", right: "Playback never stops" },
];

const CHAPTER_VARIANTS = [
  "Cut to chapter at {time}",
  "New segment queued at {time}",
  "Live marker: {time}",
];

export function LiveVomPage() {
  const [scenes, setScenes] = useState<SceneEntry[]>(() => {
    const entry: SceneEntry = {
      id: "scene-001",
      start: 0,
      duration: null,
      end: null,
      xml: "",
      componentTag: TEMPLATES.title.componentTag,
      voice: TEMPLATES.title.voice,
      props: TEMPLATES.title.props,
    };
    entry.xml = buildSceneXml(entry);
    return [entry];
  });
  const [sessionTitle, setSessionTitle] = useState(DEFAULT_SESSION_TITLE);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [timelineLabel, setTimelineLabel] = useState("0.00s · 0f");
  const currentTimeRef = useRef(0);
  const sceneIndexRef = useRef(2);
  const recordingStartRef = useRef<Date>(new Date());

  const recordingStartLabel = useMemo(
    () => formatTimestamp(recordingStartRef.current),
    []
  );
  const recordingStartIso = useMemo(
    () => recordingStartRef.current.toISOString(),
    []
  );

  const xml = useMemo(
    () => buildXmlDocument(scenes, sessionTitle, recordingStartIso),
    [scenes, sessionTitle, recordingStartIso]
  );

  const handleTimeUpdate = useCallback((timeSec: number, _durationSec: number) => {
    currentTimeRef.current = timeSec;
    const frame = Math.floor(timeSec * VIDEO_FPS);
    setTimelineLabel(`${timeSec.toFixed(2)}s · ${frame}f`);
  }, []);

  const appendScene = useCallback((templateKey: string) => {
    const template = TEMPLATES[templateKey];
    if (!template) {
      return;
    }
    setScenes((prev) => {
      const now = currentTimeRef.current;
      const timestamp = new Date();
      const displayTime = formatTimestamp(timestamp);
      const isoTime = formatIsoTimestamp(timestamp);
      const replaceTime = (value: string) => value.replace("{time}", displayTime);
      const futureScenes = prev.filter((scene) => scene.start > now);
      const lastScene = prev[prev.length - 1];
      let nextScenes = prev;
      let start: number;

      if (lastScene && futureScenes.length === 0) {
        const nextStart = now + TRANSITION_BUFFER_SECONDS;
        const duration = Math.max(MIN_SCENE_DURATION_SECONDS, nextStart - lastScene.start);
        const updatedLast: SceneEntry = {
          ...lastScene,
          duration,
          end: lastScene.start + duration,
          xml: "",
        };
        updatedLast.xml = buildSceneXml(updatedLast);
        nextScenes = [...prev.slice(0, -1), updatedLast];
        start = updatedLast.end;
      } else {
        const lastEnd = prev.length ? prev[prev.length - 1].end : null;
        const lastEndValue = lastEnd ?? now;
        start = Math.max(lastEndValue, now + TRANSITION_BUFFER_SECONDS);
      }

      const duration = template.duration;
      const id = `scene-${String(sceneIndexRef.current).padStart(3, "0")}`;
      let templateProps: Record<string, unknown> = template.props;
      let voice = template.voice;

      if (templateKey === "title") {
        const titleVariant = replaceTime(pick(TITLE_VARIANTS));
        templateProps = {
          ...template.props,
          title: titleVariant,
          subtitle: `Rendered ${isoTime}`,
        };
        voice = `Title scene appended at ${displayTime}.`;
      } else if (templateKey === "bullets") {
        const bullets = pick(BULLET_VARIANTS).map(replaceTime);
        templateProps = {
          ...template.props,
          subtitle: `Queued ${displayTime}`,
          bullets: {
            ...(template.props.bullets as Record<string, unknown>),
            items: bullets,
          },
        };
        voice = `Bullet scene added at ${displayTime}.`;
      } else if (templateKey === "twoColumn") {
        const variant = pick(TWO_COLUMN_VARIANTS);
        templateProps = {
          ...template.props,
          left: {
            ...(template.props.left as Record<string, unknown>),
            props: {
              ...(template.props.left as { props?: Record<string, unknown> }).props,
              text: replaceTime(variant.left),
            },
          },
          right: {
            ...(template.props.right as Record<string, unknown>),
            props: {
              ...(template.props.right as { props?: Record<string, unknown> }).props,
              text: replaceTime(variant.right),
            },
          },
        };
        voice = `Two column scene queued at ${displayTime}.`;
      } else if (templateKey === "chapter") {
        const subtitle = replaceTime(pick(CHAPTER_VARIANTS));
        templateProps = {
          ...template.props,
          number: String(sceneIndexRef.current).padStart(2, "0"),
          subtitle,
        };
        voice = `Chapter scene queued at ${displayTime}.`;
      }

      sceneIndexRef.current += 1;
      const entry: SceneEntry = {
        id,
        start,
        duration,
        end: start + duration,
        xml: "",
        componentTag: template.componentTag,
        voice,
        props: templateProps,
      };
      entry.xml = buildSceneXml(entry);
      return [...nextScenes, entry];
    });
  }, []);

  const handleCopyXml = useCallback(async () => {
    try {
      const now = currentTimeRef.current;
      const lastScene = scenes[scenes.length - 1];
      let nextScenes = scenes;
      if (lastScene && lastScene.duration == null) {
        const end = now + TRANSITION_BUFFER_SECONDS;
        const duration = Math.max(MIN_SCENE_DURATION_SECONDS, end - lastScene.start);
        const updatedLast: SceneEntry = {
          ...lastScene,
          duration,
          end: lastScene.start + duration,
          xml: "",
        };
        updatedLast.xml = buildSceneXml(updatedLast);
        nextScenes = [...scenes.slice(0, -1), updatedLast];
        setScenes(nextScenes);
      }
      const nextXml = buildXmlDocument(nextScenes, sessionTitle, recordingStartIso);
      await navigator.clipboard.writeText(nextXml);
      setCopyStatus("XML copied");
      window.setTimeout(() => setCopyStatus(null), 1800);
    } catch (err) {
      console.error(err);
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(null), 1800);
    }
  }, [scenes]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <section className="container flex flex-1 flex-col gap-10 py-12 md:py-16 lg:py-20">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/60">
            Live VOM
          </p>
          <h1 className="font-heading text-3xl leading-[1.1] sm:text-4xl md:text-5xl">
            Realtime video composition from XML
          </h1>
          <p className="mx-auto max-w-[46rem] text-base text-muted-foreground">
            This player never stops. Tap a layout to queue a new scene into the near
            future while the VOM keeps rendering.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="relative">
            <VomPreviewPlayer
              xml={xml}
              width={VIDEO_WIDTH}
              height={VIDEO_HEIGHT}
              fillHeight={false}
              align="center"
              autoPlay
              loop={false}
              preserveTimeOnScriptChange
              clockMode="live"
              showControls={false}
              timingStrategy={{ type: "live", secondsPerCue: 2 }}
              onTimeUpdate={handleTimeUpdate}
            />
            <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl bg-black/60 px-3 py-2 text-xs font-mono text-white/90">
              {timelineLabel}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="uppercase tracking-[0.2em] text-foreground/60">Recording</span>
                <span>{recordingStartLabel}</span>
              </div>
              <div className="flex w-full max-w-md items-center gap-2">
                <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.22em] text-foreground/60">
                  Title
                </span>
                <Input
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  className="h-8 flex-1 rounded-xl border-none bg-muted text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Live VOM Session"
                />
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
              {TEMPLATE_ORDER.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="default"
                  className="min-w-[140px]"
                  onClick={() => appendScene(key)}
                >
                  {TEMPLATES[key].label}
                </Button>
              ))}
              <Button type="button" variant="ghost" onClick={handleCopyXml}>
                Copy XML
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {copyStatus ?? "Press a layout to cut to the next scene."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
