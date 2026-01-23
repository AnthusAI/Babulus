import type { ResolveContext, VideoModule, VideoSpec } from "./types.js";

const isVideoModule = (value: unknown): value is VideoModule =>
  typeof value === "object" &&
  value !== null &&
  "resolve" in value &&
  typeof (value as VideoModule).resolve === "function";

export async function resolveVideoModule(module: unknown, ctx: ResolveContext): Promise<VideoSpec> {
  if (!isVideoModule(module)) {
    throw new Error("Module must export a defineVideo() result.");
  }
  return await module.resolve(ctx);
}
