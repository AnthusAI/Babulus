import { createServerRunner } from "@aws-amplify/adapter-nextjs";

/**
 * Server-side Amplify configuration using Next.js adapter.
 * This creates a runner that allows executing Amplify commands in an isolated server context
 * (e.g. Server Actions, API routes, middleware) by extracting tokens from cookies.
 *
 * Note: If amplify_outputs.json doesn't exist, this will throw an error.
 * The app will still build but server actions will fail at runtime.
 */

let runner: ReturnType<typeof createServerRunner> | null = null;

try {
  const outputs = require("../amplify_outputs.json");
  runner = createServerRunner({ config: outputs });
} catch (error) {
  console.warn("Amplify outputs not found. Server actions will not work.");
}

export const { runWithAmplifyServerContext } = runner ?? {
  runWithAmplifyServerContext: () => {
    throw new Error("Amplify not configured. Ensure amplify_outputs.json exists.");
  },
};
