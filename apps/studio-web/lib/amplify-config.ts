import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

/**
 * Configure Amplify with the generated outputs from the backend deployment.
 * This should be called once at app startup (in the root layout).
 */
export function configureAmplify() {
  Amplify.configure(outputs, {
    ssr: true, // Enable SSR support for Next.js
  });
}
