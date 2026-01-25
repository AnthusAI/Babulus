import { defineFunction } from "@aws-amplify/backend";
import { loadConfig, getProviderConfig } from "../../../../../src/config.js";

// Load config from ~/.babulus/config.yml during deployment
// This injects API keys as Lambda environment variables
const config = loadConfig();

// Extract provider configs
const openaiConfig = getProviderConfig(config, "openai");
const elevenlabsConfig = getProviderConfig(config, "elevenlabs");
const awsPollyConfig = getProviderConfig(config, "aws_polly");
const azureConfig = getProviderConfig(config, "azure_speech");

export const generationWorker = defineFunction({
  name: "generation-worker",
  entry: "./handler.ts",
  timeoutSeconds: 900, // 15 minutes for TTS generation
  memoryMB: 2048, // 2GB for TTS processing
  environment: {
    // API keys from ~/.babulus/config.yml
    OPENAI_API_KEY: String(openaiConfig.api_key ?? ''),
    ELEVENLABS_API_KEY: String(elevenlabsConfig.api_key ?? ''),
    AWS_POLLY_REGION: String(awsPollyConfig.region ?? 'us-east-1'),
    AZURE_SPEECH_KEY: String(azureConfig.api_key ?? ''),
    AZURE_SPEECH_REGION: String(azureConfig.region ?? ''),
  },
});
