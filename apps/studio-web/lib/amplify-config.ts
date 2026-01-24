import { Amplify } from "aws-amplify";

/**
 * Configure Amplify with the generated outputs from the backend deployment.
 * This should be called once at app startup (in the root layout).
 *
 * Note: If amplify_outputs.json doesn't exist yet, this is a no-op.
 * The app will continue to work with the in-memory control-plane store.
 */
export function configureAmplify() {
  try {
    // Dynamic import to handle missing amplify_outputs.json gracefully
    const outputs = require("../amplify_outputs.json");
    Amplify.configure(outputs, {
      ssr: true, // Enable SSR support for Next.js
    });
  } catch (error) {
    // amplify_outputs.json doesn't exist yet (backend not deployed)
    // App will use in-memory store instead
    console.warn("Amplify outputs not found. Using in-memory control-plane store.");
  }
}
