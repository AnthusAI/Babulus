# Babulus Configuration Setup

## Overview

Babulus uses a single configuration file (`~/.babulus/config.yml`) as the universal source of truth for all API keys and provider settings. This file works across all environments:

- ✅ CLI tools (local development)
- ✅ Web app in Node mode (Next.js server)
- ✅ Web app in Electron mode (desktop)
- ✅ Cloud Lambda functions
- ✅ CI/CD test runs

**Key Benefits:**
- 🔒 **No Cloud Dependencies** - Works offline without AWS Secrets Manager
- 📁 **Single Source of Truth** - One config file for all environments
- 🔑 **No Vendor Lock-in** - Take your keys with you
- 🚀 **Simple Deployment** - Lambda reads from config during deploy

---

## Quick Start

### 1. Create Config File

Create the config directory and file:

```bash
mkdir -p ~/.babulus
touch ~/.babulus/config.yml
chmod 600 ~/.babulus/config.yml  # Secure permissions
```

### 2. Add Your API Keys

Edit `~/.babulus/config.yml`:

```yaml
# ~/.babulus/config.yml
providers:
  # OpenAI TTS (Recommended for development - cheapest)
  openai:
    api_key: "sk-proj-..."  # Get from https://platform.openai.com/api-keys
    model: "gpt-4o-mini-tts"  # Fast and cheap
    voice: "alloy"  # Options: alloy, echo, fable, onyx, nova, shimmer

  # ElevenLabs TTS (Premium quality)
  elevenlabs:
    api_key: "sk_..."  # Get from https://elevenlabs.io/app/settings/api-keys
    voice_id: "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
    model_id: "eleven_multilingual_v2"  # Or eleven_turbo_v2_5 for speed

    # Optional: Music generation
    music_model_id: "music_v1"

    # Optional: Sound effects
    sfx_model_id: "eleven_text_to_sound_v2"

  # AWS Polly TTS (Uses AWS credentials, no API key needed)
  aws_polly:
    region: "us-east-1"
    voice_id: "Joanna"
    engine: "standard"  # Or "neural" for better quality

  # Azure Cognitive Services TTS
  azure_speech:
    api_key: "..."  # Get from Azure portal
    region: "eastus"
    voice: "en-US-JennyNeural"

# Default provider selection
tts:
  default_provider: openai  # Change to elevenlabs for production

audio:
  default_sfx_provider: elevenlabs
  default_music_provider: elevenlabs
```

### 3. Test Configuration

Verify your config works:

```bash
# Test with CLI
npx babulus generate examples/hello.babulus.yml

# Or run tests
npm test
```

---

## Configuration Search Order

Babulus searches for config in this order:

1. **`BABULUS_PATH` environment variable** (highest priority)
   ```bash
   export BABULUS_PATH=/path/to/custom/config.yml
   ```

2. **Project directory** `./.babulus/config.yml`
   - Useful for project-specific overrides
   - Inherits from home directory config

3. **Current working directory** `$(pwd)/.babulus/config.yml`

4. **Home directory** `~/.babulus/config.yml` (recommended default)

**Example Override:**
```bash
# Use project-specific config
cd /path/to/project
mkdir .babulus
cp ~/.babulus/config.yml .babulus/config.yml
# Edit .babulus/config.yml with project-specific keys
```

---

## Provider-Specific Setup

### OpenAI TTS

**Get API Key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)

**Config:**
```yaml
providers:
  openai:
    api_key: "sk-proj-..."
    model: "gpt-4o-mini-tts"  # $2/1M chars (cheapest)
    voice: "alloy"  # Options: alloy, echo, fable, onyx, nova, shimmer
```

**Cost:** $0.002 per 1000 characters (~$2 per million)

**Best For:** Development, iteration, high volume

---

### ElevenLabs

**Get API Key:**
1. Go to https://elevenlabs.io/app/settings/api-keys
2. Click "Create API Key"
3. Copy the key (starts with `sk_...`)

**Get Voice ID:**
1. Go to https://elevenlabs.io/voice-library
2. Select a voice
3. Copy the Voice ID from the URL or API

**Config:**
```yaml
providers:
  elevenlabs:
    api_key: "sk_..."
    voice_id: "21m00Tcm4TlvDq8ikWAM"  # Rachel
    model_id: "eleven_multilingual_v2"  # Premium quality

    # Optional: Voice settings
    voice_settings:
      stability: 0.5
      similarity_boost: 0.75
```

**Cost:** ~$0.30 per 1000 characters (varies by tier)

**Best For:** Production, premium quality, custom voices

---

### AWS Polly

**Prerequisites:**
- AWS account with Polly access
- AWS credentials configured (`~/.aws/credentials`)

**Config:**
```yaml
providers:
  aws_polly:
    region: "us-east-1"
    voice_id: "Joanna"
    engine: "standard"  # Or "neural" for $16/1M chars
```

**Authentication:** Uses AWS SDK default credential chain:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. IAM role (for Lambda/ECS)

**Cost:** $4 per million characters (standard), $16 (neural)

**Best For:** AWS-native deployments, compliance requirements

---

### Azure Cognitive Services

**Get API Key:**
1. Go to https://portal.azure.com
2. Create a Speech Service resource
3. Copy the API key and region from "Keys and Endpoint"

**Config:**
```yaml
providers:
  azure_speech:
    api_key: "..."
    region: "eastus"
    voice: "en-US-JennyNeural"
```

**Cost:** $16 per million characters (neural voices)

**Best For:** Microsoft ecosystem, Azure-native deployments

---

## Lambda Deployment

### How It Works

When you deploy to AWS Lambda with `npx ampx deploy`:

1. **Build Time**: Amplify reads your `~/.babulus/config.yml`
2. **Injection**: Extracts API keys and injects as Lambda environment variables
3. **Runtime**: Lambda code reads from `process.env.OPENAI_API_KEY`

**Config File Location:**
```typescript
// apps/studio-web/amplify/functions/generation-worker/resource.ts
import { loadConfig, getProviderConfig } from '../../../../../src/config.js';

const config = loadConfig(); // Reads ~/.babulus/config.yml
const openaiConfig = getProviderConfig(config, 'openai');

export const generationWorker = defineFunction({
  environment: {
    OPENAI_API_KEY: String(openaiConfig.api_key ?? ''),
    ELEVENLABS_API_KEY: String(elevenlabsConfig.api_key ?? ''),
    // ...
  },
});
```

**Security:**
- Environment variables are encrypted at rest by AWS
- Not visible in AWS console without IAM permissions
- Redeployed when config changes

---

## Security Best Practices

### 1. File Permissions

Restrict access to your config file:

```bash
chmod 600 ~/.babulus/config.yml
```

This ensures only you can read the file.

### 2. Never Commit Config

Add to your global `.gitignore`:

```bash
# ~/.gitignore_global
**/.babulus/config.yml
```

Configure git to use it:

```bash
git config --global core.excludesfile ~/.gitignore_global
```

### 3. Project-Level Secrets

For team projects, use project-specific config:

```bash
# Project directory
cd /path/to/project
mkdir .babulus
cp ~/.babulus/config.yml .babulus/config.yml

# Add to project .gitignore
echo ".babulus/config.yml" >> .gitignore
```

**⚠️ Warning:** Only commit project configs to private repos with proper access control.

### 4. CI/CD Secrets

For GitHub Actions or similar:

```yaml
# .github/workflows/test.yml
- name: Setup Babulus Config
  run: |
    mkdir -p ~/.babulus
    echo "$BABULUS_CONFIG" > ~/.babulus/config.yml
  env:
    BABULUS_CONFIG: ${{ secrets.BABULUS_CONFIG }}
```

Store the full config file as a GitHub secret.

---

## Troubleshooting

### Config Not Found

**Symptom:** `Error: OpenAI TTS requires providers.openai.api_key in config`

**Solutions:**
1. Verify config exists: `cat ~/.babulus/config.yml`
2. Check file permissions: `ls -la ~/.babulus/config.yml`
3. Test config loading: `BABULUS_PATH=~/.babulus/config.yml npx babulus generate ...`

### Invalid API Key

**Symptom:** `Error: OpenAI TTS failed (401): Unauthorized`

**Solutions:**
1. Verify key format (should start with `sk-` for OpenAI, ElevenLabs)
2. Check key hasn't expired
3. Test key with curl:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $(grep api_key ~/.babulus/config.yml | awk '{print $2}' | tr -d '\"')"
   ```

### Config Not Loaded in Lambda

**Symptom:** Lambda logs show "API key not found"

**Solutions:**
1. Verify config exists locally: `cat ~/.babulus/config.yml`
2. Redeploy: `npx ampx deploy`
3. Check Lambda environment variables in AWS console
4. Ensure deployment ran from machine with config file

### YAML Parsing Error

**Symptom:** `Error: Invalid config: ~/.babulus/config.yml`

**Solutions:**
1. Validate YAML syntax: https://www.yamllint.com/
2. Check indentation (use spaces, not tabs)
3. Ensure colons have space after them: `key: value` not `key:value`

---

## Migration from Environment Variables

If you're currently using `export OPENAI_API_KEY=...`:

### Option 1: Keep Environment Variables (Easiest)

Environment variables take precedence over config:

```bash
# Still works!
export OPENAI_API_KEY="sk-proj-..."
npx babulus generate ...
```

### Option 2: Migrate to Config File (Recommended)

1. **Extract current keys:**
   ```bash
   echo "providers:" > ~/.babulus/config.yml
   echo "  openai:" >> ~/.babulus/config.yml
   echo "    api_key: \"$OPENAI_API_KEY\"" >> ~/.babulus/config.yml
   ```

2. **Remove from environment:**
   ```bash
   # Edit ~/.bashrc or ~/.zshrc
   # Remove: export OPENAI_API_KEY=...
   ```

3. **Test:**
   ```bash
   unset OPENAI_API_KEY
   npx babulus generate ...  # Should still work
   ```

---

## Advanced: Custom Config Locations

### Per-Project Config

```bash
cd /path/to/project
mkdir .babulus
cat > .babulus/config.yml << EOF
providers:
  openai:
    api_key: "sk-proj-project-specific-key"
EOF
```

### Environment-Specific Configs

```bash
# Development
export BABULUS_PATH=~/.babulus/config.dev.yml

# Production
export BABULUS_PATH=~/.babulus/config.prod.yml

# Staging
export BABULUS_PATH=~/.babulus/config.staging.yml
```

### Docker/Container Config

Mount config as volume:

```bash
docker run -v ~/.babulus:/root/.babulus my-babulus-app
```

Or use environment variables:

```dockerfile
ENV OPENAI_API_KEY="sk-proj-..."
ENV ELEVENLABS_API_KEY="sk_..."
```

---

## Next Steps

1. ✅ **Create config file**: `~/.babulus/config.yml`
2. ✅ **Add API keys**: Start with OpenAI for development
3. ✅ **Test locally**: Run `npx babulus generate`
4. ✅ **Deploy to Lambda**: `npx ampx deploy`
5. ✅ **Monitor usage**: Check provider dashboards

For more examples, see:
- [ElevenLabs Guide](./elevenlabs-guide.md)
- [AWS Polly Quickstart](./aws-polly-quickstart.md)
- [Azure Speech Quickstart](./azure-speech-quickstart.md)

---

## Support

**Questions?** Open an issue at https://github.com/anthropics/babulus/issues

**Security Concerns?** Email security@babulus.ai (do not post keys publicly)
