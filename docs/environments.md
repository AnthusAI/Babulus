# Environment-Based Configuration

Babulus supports environment-specific configuration to use cheaper/faster providers during development and higher-quality providers for production.

## Basic Usage

Set the `BABULUS_ENV` environment variable to control which providers are used:

```bash
# Development (cheap/fast)
BABULUS_ENV=development babulus generate intro.babulus.yml

# Production (high quality)
BABULUS_ENV=production babulus generate intro.babulus.yml
```

**Default:** If `BABULUS_ENV` is not set, defaults to `development` (cheaper/faster for iteration).

---

## DSL Syntax

### Simple (Backward Compatible)
```yaml
voiceover:
  provider: elevenlabs  # Always use elevenlabs
```

### Environment-Specific (New)
```yaml
voiceover:
  provider:
    development: openai      # Fast, cheap ($0.015/1K chars)
    staging: aws-polly       # Mid-tier
    production: elevenlabs   # Best quality (~$0.30/1K chars)
```

---

## Supported Fields

Any DSL field can be environment-specific:

```yaml
voiceover:
  provider:
    development: dry-run
    production: elevenlabs

  voice:
    development: null          # No specific voice for dry-run
    production: "Rachel"       # ElevenLabs voice

  model:
    development: null
    production: "eleven_multilingual_v2"

  lead_in_seconds:
    development: 0             # Skip for speed
    production: 0.25           # Prevent clipping in prod

audio:
  sfx_provider:
    development: dry-run       # No SFX in dev
    production: elevenlabs

  music_provider:
    development: dry-run       # No music in dev
    production: elevenlabs
```

---

## Per-Cue Overrides

You can also use environment-specific providers at the cue level:

```yaml
voiceover:
  provider:
    development: openai
    production: elevenlabs

scenes:
  - id: intro
    cues:
      - id: hook
        voice: "Welcome"  # Uses voiceover.provider

      - id: special
        # Override for this specific cue
        provider:
          development: dry-run
          production: openai  # Use OpenAI even in production
        voice: "Special narration"
```

---

## Common Patterns

### Cost-Optimized Development
```yaml
voiceover:
  provider:
    development: dry-run      # Free, instant (no API calls)
    production: elevenlabs

audio:
  sfx_provider:
    development: dry-run      # Skip SFX in dev
    production: elevenlabs
  music_provider:
    development: dry-run      # Skip music in dev
    production: elevenlabs
```

### Multi-Tier Quality
```yaml
voiceover:
  provider:
    development: dry-run                    # Free (silent)
    staging: openai                         # Cheap ($)
    production: elevenlabs                  # Expensive ($$$)

  voice:
    staging: "alloy"                        # OpenAI voice
    production: "Rachel"                    # ElevenLabs voice
```

### Hybrid Approach
```yaml
voiceover:
  provider:
    development: openai         # OpenAI in dev (cheap)
    production: elevenlabs      # ElevenLabs in prod (quality)

audio:
  # Always use ElevenLabs for SFX/Music (even in dev)
  sfx_provider: elevenlabs
  music_provider: elevenlabs
```

---

## NPM Scripts Example

```json
{
  "scripts": {
    "babulus:dev": "BABULUS_ENV=development babulus generate --watch",
    "babulus:prod": "BABULUS_ENV=production babulus generate",
    "babulus:staging": "BABULUS_ENV=staging babulus generate"
  }
}
```

---

## Fallback Behavior

If an environment is not found in the configuration:

1. Try to use the requested environment (e.g., `staging`)
2. Fall back to `production` if available
3. If neither exists, treat as a non-environment-specific value

**Example:**
```yaml
voiceover:
  provider:
    production: elevenlabs
    # No development or staging keys
```

Running with `BABULUS_ENV=staging` will fall back to `elevenlabs` (production).

**Note:** If you don't specify `development` but do specify `production`, development mode will fall back to production settings.

---

## Benefits

- **Cost Savings:** Use free/cheap providers during development
- **Speed:** Skip expensive API calls while iterating on structure
- **Quality Control:** Reserve high-quality providers for final renders
- **Flexibility:** Mix and match providers per environment
- **Backward Compatible:** Existing single-value configs still work

---

## See Also

- [OpenAI Quick Start](./openai-quickstart.md) - OpenAI TTS setup
- [Provider Comparison](./provider-comparison.md) - Compare TTS providers
- [ElevenLabs Guide](./elevenlabs-guide.md) - ElevenLabs-specific features
