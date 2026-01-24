# Worker Job Spec (v1)

This document defines the portable job format used by the local execution-plane worker. The goal is a minimal, queue-friendly contract that can be dispatched to any machine with the right assets and toolchain.

## Design goals

- **Portable:** job payload can travel through any queue (SQS, Redis, etc.).
- **Explicit paths:** inputs/outputs are listed and resolved relative to the job file.
- **Toolchain-ready:** render options can pass through to Playwright/ffmpeg.
- **Future-proof:** versioned spec with a stable, minimal surface area.

## JSON shape

```json
{
  "version": 1,
  "kind": "render-storyboard",
  "meta": {
    "jobId": "job-123",
    "createdAt": "2026-01-24T00:00:00Z",
    "source": "local"
  },
  "input": {
    "scriptPath": "preview/demo.script.json",
    "timelinePath": "preview/demo.timeline.json",
    "audioPath": "preview/demo.wav",
    "framesDir": "renders/demo/frames",
    "outputPath": "renders/demo.mp4",
    "options": {
      "workers": 4,
      "framePattern": "frame-%06d.png",
      "deviceScaleFactor": 1,
      "ffmpegArgs": ["-preset", "ultrafast"],
      "ffmpegPath": "ffmpeg"
    }
  }
}
```

### Field notes

- `version` (required): spec version. Only `1` is supported.
- `kind` (required): currently only `render-storyboard` is supported.
- `meta` (optional): freeform job metadata (jobId, source, etc.).
- `input.scriptPath` (required): path to `script.json`.
- `input.timelinePath` (optional): path to `timeline.json`.
- `input.audioPath` (optional): path to audio file.
- `input.framesDir` (required): output directory for PNG frames.
- `input.outputPath` (required): output MP4 path.
- `input.options` (optional): render options passed to the renderer.

### Path resolution

Relative paths are resolved against the directory containing the job file. This makes job specs portable and self-contained.

### Result JSON

When you run the worker with `--result <path>`, it writes a summary payload:

```json
{
  "jobId": "job-123",
  "kind": "render-storyboard",
  "status": "succeeded",
  "startedAt": "2026-01-24T00:00:00Z",
  "finishedAt": "2026-01-24T00:00:10Z",
  "durationMs": 10000,
  "outputPath": "/abs/path/renders/demo.mp4",
  "framesDir": "/abs/path/renders/demo/frames"
}
```

## CLI usage

```bash
# Dry-run validation (no rendering)
babulus worker run --job job.json --result result.json --dry-run

# Full execution
babulus worker run --job job.json --result result.json
```
