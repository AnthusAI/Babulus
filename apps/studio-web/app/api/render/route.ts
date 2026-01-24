import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

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

  const audioFile = body?.audio?.trim();
  const audioPath = audioFile ? join(previewDir, audioFile) : null;
  const resolvedAudio = audioPath && existsSync(audioPath) ? audioPath : null;
  const timelineFile = body?.timeline?.trim();
  const timelinePath = timelineFile ? join(previewDir, timelineFile) : null;
  if (timelinePath && !existsSync(timelinePath)) {
    return Response.json({ error: `Timeline not found: ${timelineFile}` }, { status: 404 });
  }

  const renderId = `${body?.id ?? "preview"}-${Date.now()}`;
  const workers = typeof body?.workers === "number" ? body.workers : undefined;
  const ffmpegArgs = Array.isArray(body?.ffmpegArgs)
    ? body.ffmpegArgs.filter((arg) => typeof arg === "string")
    : undefined;
  const outputDir = join(root, "apps/studio-web/public/renders");
  const framesDir = join(root, "apps/studio-web/.render-cache", renderId, "frames");
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(framesDir, { recursive: true });

  const scriptRelative = join("apps", "studio-web", "public", "preview", scriptFile);
  const timelineRelative = timelineFile ? join("apps", "studio-web", "public", "preview", timelineFile) : null;
  const outputPath = join(outputDir, `${renderId}.mp4`);
  const tsxBin = process.platform === "win32" ? "tsx.cmd" : "tsx";
  const tsxPath = join(process.cwd(), "node_modules", ".bin", tsxBin);
  const scriptCliPath = join(process.cwd(), "scripts", "render-storyboard.ts");
  const args = [
    scriptCliPath,
    "--script",
    scriptRelative,
    "--frames",
    framesDir,
    "--out",
    outputPath,
  ];
  if (timelineRelative) {
    args.push("--timeline", timelineRelative);
  }
  if (resolvedAudio) {
    args.push("--audio", resolvedAudio);
  }
  if (workers != null) {
    args.push("--workers", String(workers));
  }
  if (ffmpegArgs && ffmpegArgs.length) {
    for (const arg of ffmpegArgs) {
      args.push("--ffmpeg-arg", arg);
    }
  }

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(tsxPath, args, { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      stderr += error instanceof Error ? error.message : String(error);
      resolve({ code: 1, stdout, stderr });
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  if (result.code !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim() || "Render failed.";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({
    id: renderId,
    output: `/renders/${renderId}.mp4`,
    createdAt: new Date().toISOString(),
  });
}
