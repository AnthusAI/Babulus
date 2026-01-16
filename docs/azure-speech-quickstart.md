# Azure Speech TTS Quick Start

Azure Speech (also called Azure Cognitive Services Speech) is Microsoft's text-to-speech service. It offers high-quality neural voices and supports many languages.

## Prerequisites

1. **Azure Account** with Cognitive Services access
2. **Azure Speech API Key** from Azure Portal
3. **Region** where your Speech resource is deployed (e.g., `eastus`, `westus2`)
4. **Python requests** library (should already be installed)

## Getting Your Credentials

1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a "Speech" resource (Cognitive Services → Speech)
3. After creation, go to "Keys and Endpoint"
4. Copy:
   - **Key 1** or **Key 2** (your API key)
   - **Location/Region** (e.g., `eastus`)

## Configuration

### 1. Add Azure Speech to your config

Edit `.babulus/config.yml`:

```yaml
providers:
  azure_speech:
    api_key: "your_azure_api_key_here"
    region: "eastus"  # Your Azure region
    voice: "en-US-JennyNeural"  # Default voice
```

### 2. Set provider in your DSL

Edit your `.babulus.yml` file:

```yaml
voiceover:
  provider: azure-speech  # or just "azure"
  sample_rate_hz: 24000  # Azure supports: 8000, 16000, 24000, 44100
```

### 3. Environment-Based Configuration (Recommended)

For multi-environment workflows:

```yaml
voiceover:
  provider:
    development: openai
    aws: aws
    azure: azure        # Use Azure Speech for testing
    production: elevenlabs

  sample_rate_hz:
    development: 24000  # OpenAI
    aws: 16000          # Polly
    azure: 24000        # Azure Speech (good balance)
    production: 44100   # ElevenLabs
```

Then generate with:
```bash
BABULUS_ENV=azure babulus generate your-video.babulus.yml
```

## Available Voices

Azure offers 400+ voices across 140+ languages. Here are popular English options:

### US English Neural Voices
- **en-US-JennyNeural** (Female, friendly)
- **en-US-GuyNeural** (Male, warm)
- **en-US-AriaNeural** (Female, professional)
- **en-US-DavisNeural** (Male, professional)
- **en-US-AmberNeural** (Female, young adult)
- **en-US-AnaNeural** (Female, child)
- **en-US-AndrewNeural** (Male, young adult)
- **en-US-BrianNeural** (Male, child)

### UK English Neural Voices
- **en-GB-SoniaNeural** (Female)
- **en-GB-RyanNeural** (Male)
- **en-GB-LibbyNeural** (Female, young)

### Other English Variants
- **en-AU** (Australian): Natasha, William, Annette
- **en-CA** (Canadian): Clara, Liam
- **en-IN** (Indian): Neerja, Prabhat
- **en-IE** (Irish): Emily, Connor

See [full voice list](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support?tabs=tts) for all languages.

## Voice Selection

Override the voice per DSL:

```yaml
voiceover:
  provider: azure
  voice: en-US-GuyNeural  # Override default voice
  sample_rate_hz: 24000
```

Or use the default from config.

## Sample Rate Options

Azure Speech supports flexible sample rates:
- **8000 Hz**: Telephony quality (smallest files)
- **16000 Hz**: Good quality (medium files)
- **24000 Hz**: High quality (recommended, good balance)
- **44100 Hz**: Maximum quality (largest files)

## Pricing

- **Standard voices**: Free for first 0.5M characters/month, then $4/1M chars
- **Neural voices**: Free for first 0.5M characters/month, then **$16/1M chars** (~$0.016/1K chars)
- More expensive than OpenAI ($0.015/1K) and AWS Polly ($0.004-0.016/1K)
- Less expensive than ElevenLabs (~$0.30/1K)

## Troubleshooting

### Error: "Azure TTS failed (401)"

**Solution**: Check your API key and region are correct in config.

```yaml
providers:
  azure_speech:
    api_key: "YOUR_ACTUAL_KEY"  # Get from Azure Portal
    region: "YOUR_REGION"       # e.g., eastus, westus2
```

### Error: "Azure TTS sample_rate_hz must be one of 8000, 16000, 24000, 44100"

**Solution**: Use a supported sample rate:
```yaml
voiceover:
  sample_rate_hz: 24000  # Change to 8000, 16000, 24000, or 44100
```

### Voice Not Found

**Solution**: Check the voice name is correct. Voice names are case-sensitive and must include language prefix:
- ✅ Correct: `en-US-JennyNeural`
- ❌ Wrong: `jenny`, `JennyNeural`, `en-us-jennyneural`

## SSML Support

Azure Speech uses SSML (Speech Synthesis Markup Language) internally. Currently, Babulus sends plain text which Azure wraps in basic SSML. Future versions may expose more SSML features for:
- Prosody control (rate, pitch, volume)
- Pauses and breaks
- Pronunciation hints
- Emphasis and expression

## Comparison with Other Providers

| Feature | Azure Speech | OpenAI TTS | AWS Polly | ElevenLabs |
|---------|--------------|------------|-----------|------------|
| Price (per 1K chars) | $0.016 | $0.015 | $0.004-0.016 | ~$0.30 |
| Quality | Excellent | Very Good | Good | Excellent |
| Sample rates | 8000-44100 Hz | 24000 Hz | 8000, 16000 Hz | 22050-44100 Hz |
| Voices | 400+ voices, 140+ languages | 6 voices | 60+ voices | 1000+ voices |
| Credentials | API key + region | API key | AWS credentials | API key |
| Free tier | 0.5M chars/month | None | None | 10K chars/month |
| Best for | Multilingual, enterprise | Development | Cost-conscious | Final production |

## Example: Complete DSL

```yaml
voiceover:
  provider: azure
  voice: en-US-GuyNeural
  sample_rate_hz: 24000
  seed: 1337
  lead_in_seconds: 0.25

scenes:
  - id: intro
    title: "Introduction"
    cues:
      - id: welcome
        label: "Welcome"
        voice: "Welcome to our presentation about Azure Speech services."
```

## Advanced: Multiple Voices

You can mix voices within a video by overriding voice per cue:

```yaml
voiceover:
  provider: azure
  voice: en-US-JennyNeural  # Default female voice
  sample_rate_hz: 24000

scenes:
  - id: dialog
    cues:
      - id: host
        voice: "Hello, I'm the host."
        # Uses default: en-US-JennyNeural

      - id: guest
        voice:
          model: en-US-GuyNeural  # Override to male voice
          segments:
            - voice: "And I'm the guest speaker."
```

## Regional Endpoints

Azure Speech uses regional endpoints. Common regions:
- **eastus** - East US (Virginia)
- **westus2** - West US 2 (Washington)
- **westeurope** - West Europe (Netherlands)
- **southeastasia** - Southeast Asia (Singapore)

Choose the region closest to you for lower latency, or use the region where you created the Azure resource.
