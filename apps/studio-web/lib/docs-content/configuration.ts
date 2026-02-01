export const configurationContent = `
# Configuration

Babulus uses a YAML configuration file to store API keys, provider settings, and global options.

## Configuration File Location

Babulus searches for \`config.yml\` in the following locations (in order):

1. **Project directory**: \`./.babulus/config.yml\`
2. **Home directory**: \`~/.babulus/config.yml\`
3. **Environment variable**: Path specified in \`BABULUS_PATH\`
4. **CLI flag**: \`--config /path/to/config.yml\`

The first configuration file found will be used.

## Creating Your Configuration

1. Copy the example configuration:
   \`\`\`bash
   cp .babulus/config.yml.example .babulus/config.yml
   \`\`\`

2. Add your API keys to \`.babulus/config.yml\`

3. **Important**: The \`.babulus/config.yml\` file is in \`.gitignore\` to protect your API keys. Never commit this file to version control.

## Configuration Format

\`\`\`yaml
# TTS Provider Configuration
providers:
  # OpenAI TTS (recommended for development)
  openai:
    api_key: "sk-..."
    model: "gpt-4o-mini-tts"
    voice: "alloy"

  # ElevenLabs (recommended for production)
  elevenlabs:
    api_key: "..."
    voice_id: "..."
    model_id: "eleven_multilingual_v2"

  # Azure Speech (alternative)
  azure_speech:
    api_key: "..."
    region: "eastus"
    voice: "en-US-JennyNeural"

# Environment-specific defaults
environments:
  development:
    default_provider: "openai"

  production:
    default_provider: "elevenlabs"
\`\`\`

## Provider Selection

### In Your DSL Code

You can specify the provider in your video definition:

\`\`\`typescript
export default defineVideo((video) => {
  video.composition("My Video", (composition) => {
    // Use OpenAI for this video
    composition.voiceover({ provider: "openai" });

    // Or use ElevenLabs
    composition.voiceover({
      provider: "elevenlabs",
      voice: "specific-voice-id"
    });
  });
});
\`\`\`

### Via CLI Flags

Override the provider when generating:

\`\`\`bash
# Use OpenAI
npx babulus generate video.babulus.ts --provider openai

# Use ElevenLabs
npx babulus generate video.babulus.ts --provider elevenlabs

# Use development environment defaults
npx babulus generate video.babulus.ts --env development
\`\`\`

### Via Environment Variables

API keys can also be provided via environment variables:

\`\`\`bash
export OPENAI_API_KEY="sk-..."
export ELEVENLABS_API_KEY="..."
export AZURE_SPEECH_KEY="..."
export AZURE_SPEECH_REGION="eastus"

npx babulus generate video.babulus.ts --provider openai
\`\`\`

Environment variables take precedence over the configuration file.

## TTS Providers

### OpenAI TTS

**Best for**: Development, cost-effective, fast generation

**Pricing**: ~$0.015 per 1000 characters (~$0.01 per minute of audio)

**Models**:
- \`gpt-4o-mini-tts\` - Best quality, latest model (recommended)
- \`gpt-4o-audio-preview\` - Advanced audio with real-time capabilities
- \`tts-1\` - Fast, lower latency
- \`tts-1-hd\` - Higher quality

**Voices**: \`alloy\`, \`echo\`, \`fable\`, \`onyx\`, \`nova\`, \`shimmer\`

**Setup**:
1. Get API key from https://platform.openai.com/api-keys
2. Add to \`.babulus/config.yml\`:
   \`\`\`yaml
   providers:
     openai:
       api_key: "sk-..."
       model: "gpt-4o-mini-tts"
       voice: "alloy"
   \`\`\`

### ElevenLabs

**Best for**: Production, highest quality, voice cloning

**Pricing**: Varies by plan, ~$0.30 per 1000 characters

**Models**:
- \`eleven_multilingual_v2\` - Best quality, 29 languages (recommended)
- \`eleven_turbo_v2\` - Fastest, lower latency
- \`eleven_monolingual_v1\` - English only

**Setup**:
1. Get API key from https://elevenlabs.io/app/settings/api-keys
2. Choose or create a voice at https://elevenlabs.io/app/voices
3. Add to \`.babulus/config.yml\`:
   \`\`\`yaml
   providers:
     elevenlabs:
       api_key: "..."
       voice_id: "..."
       model_id: "eleven_multilingual_v2"
   \`\`\`

### Azure Speech

**Best for**: Enterprise, Microsoft ecosystem integration

**Pricing**: ~$0.016 per 1000 characters

**Setup**:
1. Create Azure Speech resource in Azure Portal
2. Get API key and region
3. Choose voice from https://learn.microsoft.com/azure/ai-services/speech-service/language-support
4. Add to \`.babulus/config.yml\`:
   \`\`\`yaml
   providers:
     azure_speech:
       api_key: "..."
       region: "eastus"
       voice: "en-US-JennyNeural"
   \`\`\`

## Dry-Run Mode

For testing without API calls, use the \`dry-run\` provider:

\`\`\`typescript
composition.voiceover({ provider: "dry-run" });
\`\`\`

This generates silent audio files with correct timing but makes no API calls and incurs no cost.

## Configuration via Environment Variables

You can also set configuration via environment variables instead of the config file:

\`\`\`bash
# Required for each provider
export OPENAI_API_KEY="sk-..."
export ELEVENLABS_API_KEY="..."
export AZURE_SPEECH_KEY="..."
export AZURE_SPEECH_REGION="eastus"

# Optional: specify config file location
export BABULUS_PATH="/path/to/config.yml"
\`\`\`

## Troubleshooting

### "No API key" or silent audio

**Problem**: Generated audio is silent or you see "dry-run" provider in logs.

**Solutions**:
1. Verify \`.babulus/config.yml\` exists and contains your API keys
2. Check that API keys don't start with "test-" (these trigger dry-run mode)
3. Ensure you're using \`--provider openai\` or \`--provider elevenlabs\` flag
4. Verify environment variables are set if not using config file

### "Config not found"

**Problem**: Babulus can't find your configuration file.

**Solutions**:
1. Verify file location: \`./.babulus/config.yml\` or \`~/.babulus/config.yml\`
2. Check file permissions (must be readable)
3. Use \`--config /path/to/config.yml\` to specify explicitly
4. Set \`BABULUS_PATH\` environment variable

### "Invalid config"

**Problem**: Configuration file has syntax errors.

**Solutions**:
1. Verify YAML syntax (use a YAML validator)
2. Ensure proper indentation (2 spaces, not tabs)
3. Check that all strings with special characters are quoted
4. Validate against the example: \`.babulus/config.yml.example\`

## Security Best Practices

1. **Never commit config.yml**: The file is in \`.gitignore\` by default
2. **Use environment variables in CI/CD**: Don't store API keys in code
3. **Rotate keys regularly**: Especially for shared/team accounts
4. **Use separate keys per environment**: Different keys for dev/staging/prod
5. **Restrict key permissions**: Use read-only keys when possible
`;
