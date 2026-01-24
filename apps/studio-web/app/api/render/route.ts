import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { renderStoryboardVideo } from "@babulus/renderer/src/storyboard-render.js";
import type { ScriptData } from "@babulus/shared";
import type { TimelineData } from "@babulus/shared";

type RenderRequest = {
  id?: string | null;
  script?: string | null;
  timeline?: string | null;
  audio?: string | null;
  title?: string | null;
  subtitle?: string | null;
  workers?: number | null;
  ffmpegArgs?: string[] | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: RenderRequest | null = null;
  try {
    body = (await request.json()) as RenderRequest;
  } catch {
    body = null;
  }

  const scriptFile = body?.script?.trim();
  if (!scriptFile) {
    return Response.json({ error: "Missing script file." }, { status: 400 });
  }

  const root = process.cwd();
  const previewDir = join(root, "apps/studio-web/public/preview");
  const scriptPath = join(previewDir, scriptFile);
  if (!existsSync(scriptPath)) {
    return Response.json({ error: `Script not found: ${scriptFile}` }, { status: 404 });
  }

  const script = JSON.parse(readFileSync(scriptPath, "utf8")) as ScriptData;
  const timelineFile = body?.timeline?.trim();
  const timelinePath = timelineFile ? join(previewDir, timelineFile) : null;
  const timeline = timelinePath && existsSync(timelinePath)
    ? (JSON.parse(readFileSync(timelinePath, "utf8")) as TimelineData)
    : null;

  const audioFile = body?.audio?.trim();
  const audioPath = audioFile ? join(previewDir, audioFile) : null;
  const resolvedAudio = audioPath && existsSync(audioPath) ? audioPath : null;

  const renderId = `${body?.id ?? "preview"}-${Date.now()}`;
  const workers = typeof body?.workers === "number" ? body.workers : undefined;
  const ffmpegArgs = Array.isArray(body?.ffmpegArgs)
    ? body.ffmpegArgs.filter((arg) => typeof arg === "string")
    : undefined;
  const outputDir = join(root, "apps/studio-web/public/renders");
  const framesDir = join(root, "apps/studio-web/.render-cache", renderId, "frames");
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(framesDir, { recursive: true });

  try {
    await renderStoryboardVideo({
      script,
      timeline,
      title: body?.title ?? undefined,
      subtitle: body?.subtitle ?? undefined,
      framesDir,
      outputPath: join(outputDir, `${renderId}.mp4`),
      audioPath: resolvedAudio,
      framePattern: "frame-%06d.png",
      deviceScaleFactor: 1,
      workers,
      ffmpegPath: "ffmpeg",
      ffmpegArgs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render failed.";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({
    id: renderId,
    output: `/renders/${renderId}.mp4`,
    createdAt: new Date().toISOString(),
  });
}
