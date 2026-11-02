/** What the Amplify backend publishes for the `babulus` command, under `custom.cliLogin` in amplify_outputs.json. */
export interface CliLoginOutputs {
  auth?: {
    user_pool_id?: string;
    user_pool_client_id?: string;
    aws_region?: string;
    oauth?: { domain?: string; redirect_sign_in_uri?: string[] };
  };
  custom?: {
    cliLogin?: {
      apiEndpoint?: string;
      appOrigin?: string;
      brokerEndpoint?: string;
      remoteCallbackUri?: string;
      pagesFunctionArn?: string;
    } | null;
  };
}

/** Read the deployed backend's outputs, or nothing when they are not there yet (the same fallback as lib/amplify-config.ts). */
export function readCliLoginOutputs(): CliLoginOutputs | null {
  try {
    return require("../amplify_outputs.json") as CliLoginOutputs;
  } catch {
    return null;
  }
}
