# AWS Polly TTS Quick Start

AWS Polly is Amazon's text-to-speech service. It's cost-effective (~$4 per 1 million characters) and works well for development and production workloads.

## Prerequisites

1. **AWS Account** with Polly access
2. **AWS Credentials** configured via one of:
   - Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - AWS credentials file: `~/.aws/credentials`
   - IAM role (if running on EC2/ECS)

3. **Python boto3** library installed:
   ```bash
   pip install boto3
   ```

## Configuration

### 1. Add AWS Polly to your config

Edit `.babulus/config.yml`:

```yaml
providers:
  aws_polly:
    region: "us-east-1"
    voice_id: "Joanna"
    engine: "standard"  # or "neural" for better quality
```

### 2. Set provider in your DSL

Edit your `.babulus.yml` file:

```yaml
voiceover:
  provider: aws-polly  # or just "aws"
  sample_rate_hz: 16000  # Required: Polly PCM only supports 8000 or 16000 Hz
```

**Important**: AWS Polly's PCM format only supports **8000 Hz or 16000 Hz** sample rates. Use 16000 Hz for best quality.

### 3. Environment-Based Configuration (Recommended)

For multi-environment workflows:

```yaml
voiceover:
  provider:
    development: openai
    aws: aws           # Use Polly for AWS testing
    production: elevenlabs

  sample_rate_hz:
    development: 24000  # OpenAI
    aws: 16000          # Polly PCM maximum
    production: 44100   # ElevenLabs
```

Then generate with:
```bash
BABULUS_ENV=aws babulus generate your-video.babulus.yml
```

## Available Voices

### Standard Engine (Cheaper)
- **English (US)**: Joanna, Matthew, Ivy, Kendra, Kimberly, Salli, Joey, Justin
- **English (UK)**: Amy, Emma, Brian
- **Many other languages**: See [AWS Polly Voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)

### Neural Engine (Better Quality)
- **English (US)**: Joanna, Matthew, Ivy, Kendra, Kimberly, Salli, Joey, Justin, Kevin, Ruth, Stephen
- Requires `engine: "neural"` in config
- Slightly higher cost

## Voice Selection

You can override the voice per DSL:

```yaml
voiceover:
  provider: aws
  voice: Matthew  # Override default voice
  sample_rate_hz: 16000
```

Or use the default from config.

## Pricing

- **Standard voices**: $4.00 per 1 million characters (~$0.004/1K chars)
- **Neural voices**: $16.00 per 1 million characters (~$0.016/1K chars)
- Much cheaper than ElevenLabs (~$0.30/1K chars)
- More expensive than OpenAI ($0.015/1K chars)

## Troubleshooting

### Error: "AWS Polly PCM only supports sample_rate_hz [8000, 16000]"

**Solution**: Set `sample_rate_hz: 16000` in your voiceover config.

### Error: "Unable to locate credentials"

**Solutions**:
1. Set environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your_key_id
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

2. Or create `~/.aws/credentials`:
   ```ini
   [default]
   aws_access_key_id = your_key_id
   aws_secret_access_key = your_secret_key
   ```

3. Or use IAM roles if running on AWS infrastructure

### Low Audio Quality

**Solution**: Switch to neural engine for better quality:
```yaml
providers:
  aws_polly:
    engine: "neural"
```

Note: Neural voices cost 4x more than standard but sound significantly better.

## Comparison with Other Providers

| Feature | AWS Polly | OpenAI TTS | ElevenLabs |
|---------|-----------|------------|------------|
| Price (per 1K chars) | $0.004-0.016 | $0.015 | ~$0.30 |
| Quality | Good (neural) / OK (standard) | Very Good | Excellent |
| Sample rates | 8000, 16000 Hz | 24000 Hz | 22050-44100 Hz |
| Voices | 60+ voices, 20+ languages | 6 voices | 1000+ voices |
| Credentials | AWS credentials | API key | API key |
| Best for | Cost-conscious production | Development/prototyping | Final production |

## Example: Complete DSL

```yaml
voiceover:
  provider: aws
  voice: Matthew
  sample_rate_hz: 16000
  seed: 1337
  lead_in_seconds: 0.25

scenes:
  - id: intro
    title: "Introduction"
    cues:
      - id: welcome
        label: "Welcome"
        voice: "Welcome to our presentation. Let's get started."
```

## AWS Polly Features Not (Yet) Supported

- SSML tags for prosody control
- Speech marks for word-level timing
- Lexicons for pronunciation customization

These may be added in future releases. For now, Babulus uses plain text synthesis.
