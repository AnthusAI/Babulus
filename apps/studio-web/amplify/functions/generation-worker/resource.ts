import { defineFunction } from "@aws-amplify/backend";

export const generationWorker = defineFunction({
  name: "generation-worker",
  entry: "./handler.ts",
  timeoutSeconds: 900, // 15 minutes for TTS generation
  memoryMB: 2048, // 2GB for TTS processing
  environment: {
    // API keys will be added from environment/secrets
    // OPENAI_API_KEY: process.env.OPENAI_API_KEY
    // ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY
    // AWS_POLLY_REGION: process.env.AWS_POLLY_REGION
  },
});
