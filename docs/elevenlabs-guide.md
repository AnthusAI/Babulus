# Babulus + ElevenLabs Guide for AI Agents

**Target Audience:** AI coding agents
**Purpose:** Enable YAML generation for Babulus projects using ElevenLabs TTS, SFX, and Music

---

## ESSENTIALS

### Quick Config: Two-Level YAML

Babulus loads config in this order:

1. `./.babulus/config.yml` (project-specific)
2. `~/.babulus/config.yml` (global)

**Global Config** (`~/.babulus/config.yml`):
```yaml
providers:
  elevenlabs:
    api_key: "sk_..."          # <req> ElevenLabs API key
    voice_id: "abc123..."      # [opt] Default voice for TTS
    model_id: "eleven_multilingual_v2"  # [opt] TTS model
    sfx_model_id: "eleven_text_to_sound_v2"  # [opt] SFX model
    music_model_id: "music_v1"  # [opt] Music model
```

**Project DSL** (`.babulus.yml`):
```yaml
voiceover:
  provider: elevenlabs  # Use ElevenLabs for TTS

audio:
  sfx_provider: elevenlabs    # [opt] For sound effects
  music_provider: elevenlabs  # [opt] For background music

scenes:
  - id: intro
    title: "Introduction"
    cues:
      - id: hook
        label: "Hook"
        voice: "Narration text here."
```

---

### TTS Pattern 1: Minimal Voiceover

```yaml
voiceover:
  provider: elevenlabs  # Activate ElevenLabs TTS

scenes:
  - id: intro
    title: "Introduction"
    cues:
      - id: hook
        label: "Hook"  # Timeline marker
        voice: "Welcome to the video."  # Synthesized text
```

---

### TTS Pattern 2: Multi-Segment with Pauses

```yaml
scenes:
  - id: content
    title: "Content"
    cues:
      - id: explanation
        label: "Explanation"
        voice:
          segments:
            - voice: "First sentence here."
            - pause_seconds: 0.5  # Mid-narration pause
            - voice: "Second sentence after pause."
            - pause_seconds: 0.35
            - voice: "Final thought."
```

**Use case:** Control pacing and add dramatic pauses mid-narration.

---

### TTS Pattern 3: Pronunciation Dictionary (Auto-Managed)

**Method 1: Alias (Simple)**
```yaml
voiceover:
  provider: elevenlabs
  pronunciation_dictionary:
    name: myproject
  pronunciations:
    - lexeme:
        grapheme: "Babulus"
        alias: "bab-u-lus"  # Simple phonetic guide
```

**Method 2: CMU Arpabet (RECOMMENDED)**
```yaml
voiceover:
  provider: elevenlabs
  pronunciation_dictionary:
    name: myproject
  pronunciations:
    - lexeme:
        grapheme: "Tactus"
        phoneme: "T AE1 K T AH0 S"  # CMU Arpabet notation
        alphabet: "cmu-arpabet"     # MUST specify alphabet
```

**Method 3: IPA (Alternative)**
```yaml
voiceover:
  provider: elevenlabs
  pronunciation_dictionary:
    name: myproject
  pronunciations:
    - lexeme:
        grapheme: "Tactus"
        phoneme: "ˈtæktəs"  # IPA notation
        alphabet: "ipa"     # MUST specify alphabet
```

**Behavior:** Babulus auto-creates/updates an ElevenLabs pronunciation dictionary and attaches it to every TTS request. Dictionary cached in `.babulus/out/<video>/manifest.json`.

**Key Point:** When using `phoneme`, you MUST specify `alphabet: "cmu-arpabet"` or `alphabet: "ipa"`. CMU Arpabet is recommended for better AI model reliability.

---

## PRONUNCIATION DICTIONARIES

### When to Use

Fix mispronunciation of project-specific terms (brand names, technical jargon, acronyms).

### Three Pronunciation Methods

| Method | Format | Alphabet | Example | Use Case |
|--------|--------|----------|---------|----------|
| **alias** | Plain text phonetic guide | N/A | `"tack-tus"` | Simple, good for basic cases |
| **phoneme (CMU Arpabet)** ⭐ | CMU phoneme notation | `"cmu-arpabet"` | `"T AE1 K T AH0 S"` | **RECOMMENDED** - Most reliable with AI models |
| **phoneme (IPA)** | International Phonetic Alphabet | `"ipa"` | `"ˈtæktəs"` | Alternative, less reliable |

**Note:** CMU Arpabet is recommended by ElevenLabs for better consistency with AI voice models. IPA is supported but may produce less reliable results.

### Auto-Managed vs Pre-Existing Dictionaries

**Option A: Auto-Managed** (Recommended)

Method 1: Alias (simple)
```yaml
voiceover:
  pronunciation_dictionary:
    name: myproject
  pronunciations:
    - lexeme:
        grapheme: "BrandName"
        alias: "brand-name"
```

Method 2: CMU Arpabet (RECOMMENDED for precision)
```yaml
voiceover:
  pronunciation_dictionary:
    name: myproject
  pronunciations:
    - lexeme:
        grapheme: "Tactus"
        phoneme: "T AE1 K T AH0 S"
        alphabet: "cmu-arpabet"
```

Method 3: IPA (alternative)
```yaml
voiceover:
  pronunciation_dictionary:
    name: myproject
  pronunciations:
    - lexeme:
        grapheme: "Tactus"
        phoneme: "ˈtæktəs"
        alphabet: "ipa"
```

**Option B: Reference Existing Dictionary**
```yaml
voiceover:
  pronunciation_dictionaries:
    - id: "pd_your_dictionary_id"  # Pre-existing ElevenLabs dict
      version_id: null  # null = latest version
```

**Limits:** Max 3 dictionaries per TTS request. Auto-managed dictionary counts as 1.

---

### Real-World Example (from Tactus project)

**Current (using CMU Arpabet for precision):**
```yaml
voiceover:
  provider: elevenlabs
  pronunciation_dictionary:
    name: tactus
  pronunciations:
    - lexeme:
        grapheme: "Tactus"
        phoneme: "T AE1 K T AH0 S"  # CMU Arpabet - most reliable
        alphabet: "cmu-arpabet"
```

**CMU Arpabet Notes:**
- Numeric stress indicators: `1` = primary stress, `0` = no stress
- Space-separated phonemes: `T AE1 K` = "tack"
- Full example: `T AE1 K T AH0 S` = "TAK-tus" (stress on first syllable)

---

## PAUSES & TIMING

### Delay Cue Start (pause before narration begins)

```yaml
cues:
  - label: "Hook"
    voice:
      pause_seconds: 1  # Wait 1 second before speaking
      segments:
        - voice: "Content starts after delay."
```

### Mid-Narration Pauses (between segments)

```yaml
voice:
  segments:
    - voice: "First part."
    - pause_seconds: 0.5  # Explicit pause
    - voice: "Second part."
```

### Gaussian Pause Distribution (Natural Variance)

Adds subtle, stochastic pausing between segments for natural-sounding narration.

```yaml
voiceover:
  seed: 1337  # Deterministic randomness (same seed = same pauses)
  pause_between_items_gaussian:
    mean_seconds: 0.18    # Average pause duration
    std_seconds: 0.07     # Standard deviation
    min_seconds: 0.06     # Floor value
    max_seconds: 0.5      # Ceiling value
```

**Use case:** Prevent robotic-sounding narration with fixed pauses.

### Prevent First-Word Clipping

```yaml
voiceover:
  lead_in_seconds: 0.25  # Add silence before first word
```

**Why:** Prevents audio decode/playback startup from clipping the first word.

---

### Real-World Example (from Tactus project)

```yaml
voiceover:
  provider: elevenlabs
  seed: 1337  # Reproducible variation
  lead_in_seconds: 0.25  # Prevent clipping
  trim_end_seconds: 0  # Disable global trimming (safety)
  pause_between_items_gaussian:
    mean_seconds: 0.18
    std_seconds: 0.07
    min_seconds: 0.06
    max_seconds: 0.5
```

---

## AUDIO CLIPS: SOUND EFFECTS (SFX)

### Inline SFX Definition

```yaml
scenes:
  - id: transition
    title: "Transition"
    cues:
      - label: "Scene Change"
        audio:
          - kind: sfx  # <req> Clip type
            id: whoosh  # <req> Unique identifier
            prompt: "Fast cinematic whoosh transition"  # <req> Text description
            duration_seconds: 3  # <req> SFX length
            volume: 65%  # [opt] 0-1, 0-100, or "65%" (default: 1.0)
            at: "+1.5s"  # [opt] Start time (default: scene start)
```

### Variants/Pick Workflow (Generate Multiple, Select Best)

```yaml
audio:
  - kind: sfx
    id: whoosh
    prompt: "Fast cinematic whoosh transition, deep bass, airy, clean"
    duration_seconds: 3
    variants: 8  # Generate 8 different SFX variants
    pick: 2      # Use variant #2 (0-indexed: 0, 1, 2, ..., 7)
    volume: 65%
```

**Use case:** Generate multiple options, audition them, then lock in the best one with `pick`.

**Caching:** Variants keyed by prompt + duration + seed. Stored in `.babulus/out/<video>/cache/`.

### Audio Library Pattern (Define Once, Use Many)

```yaml
audio:
  sfx_provider: elevenlabs
  library:
    whoosh:  # Reusable clip ID
      kind: sfx
      prompt: "Fast cinematic whoosh"
      duration_seconds: 3
      variants: 8

scenes:
  - id: scene1
    audio:
      - use: whoosh  # Reference library clip
        pick: 2
        volume: 35%
  - id: scene2
    audio:
      - use: whoosh
        pick: 5
        volume: 80%
```

### Volume Formats

All three formats are valid:

- `0.8` (float: 0-1)
- `80` (integer: 0-100)
- `"80%"` (string with %)

### Timing Options

```yaml
audio:
  - kind: sfx
    at: "2.5s"  # Absolute time (from scene start)
    # OR
    at: "+1.5s"  # Relative to previous audio/cue
    # OR
    pause_seconds: 3.5  # Delay after 'at' time
```

---

### Real-World Example (from Tactus project)

```yaml
scenes:
  - id: problem
    title: "Problem"
    cues:
      - label: "Problem"
        audio:
          - kind: sfx
            id: whoosh
            prompt: "Fast cinematic whoosh transition, deep bass, airy, clean, no harsh distortion, no voice"
            duration_seconds: 3
            variants: 8  # Generated 8 options
            pick: 2      # Selected variant #2
            volume: 65%
            pause_seconds: 3.5  # Play 3.5 seconds after cue start
```

---

## AUDIO CLIPS: MUSIC

### Music Generation

```yaml
scenes:
  - id: intro
    title: "Introduction"
    audio:
      - kind: music  # <req> Clip type
        id: bed  # <req> Unique identifier
        prompt: "Warm ambient background music, light percussion, no vocals"  # <req> Description
        duration_seconds: 30  # [opt] Length (default: scene duration)
        volume: 80%  # [opt] Playback volume
```

### Fade To (Gradual Volume Change)

```yaml
audio:
  - kind: music
    id: bed
    prompt: "Ambient music, no vocals"
    volume: 80%  # Starting volume
    fade_to:
      volume: 10%  # Target volume (0-1 scale)
      after_seconds: 4  # Start fade at 4s
      fade_duration_seconds: 4  # Fade over 4 seconds
```

**Behavior:** From 4s to 8s, volume transitions 80% → 10%.

### Fade Out (Before End)

```yaml
audio:
  - kind: music
    id: bed
    volume: 80%
    fade_out:
      volume: 92%  # Starting volume for fade (not target!)
      before_end_seconds: 4  # Start fade 4s before clip ends
      fade_duration_seconds: 4  # Fade over 4 seconds
```

**Behavior:** 4 seconds before clip ends, fade from 92% → 0% over 4 seconds.

### Play Through (Extend Beyond Scene)

```yaml
audio:
  - kind: music
    id: bed
    play_through: true  # Extend to end of video (not just scene)
```

**Default:** Music clips only play for the current scene. Use `play_through` for continuous background music.

### Force Instrumental

```yaml
audio:
  - kind: music
    id: bed
    prompt: "Upbeat electronic music"
    force_instrumental: true  # No vocals
```

---

### Real-World Example (from Tactus project)

```yaml
scenes:
  - id: title
    title: "Title"
    audio:
      - kind: music
        id: bed
        prompt: "Warm ambient background music, light percussion, deep bass, energetic, no vocals, clean, unobtrusive"
        play_through: true  # Continue through entire video
        volume: 80%
        fade_to:
          volume: 10%  # Duck volume for narration
          after_seconds: 4
          fade_duration_seconds: 4
        fade_out:
          volume: 92%  # Fade out at end
          before_end_seconds: 4
          fade_duration_seconds: 4
```

---

## REFERENCE: COMPLETE SCHEMAS

### VoiceoverConfig

| Field | Type | Default | Description | Example |
|-------|------|---------|-------------|---------|
| `provider` | string | `"dry-run"` | TTS provider | `"elevenlabs"` |
| `voice` | string? | `null` | Voice ID override | `"EXAVITQu4vr4xnSDxMaL"` |
| `model` | string? | `null` | Model override | `"eleven_multilingual_v2"` |
| `format` | string | `"wav"` | Output format | `"wav"` |
| `sample_rate_hz` | int | `44100` | Audio sample rate | `22050`, `24000`, `44100` |
| `seed` | int | `0` | Deterministic variation | `1337` |
| `lead_in_sec` | float | `0.0` | Silence before first word | `0.25` |
| `default_trim_end_sec` | float | `0.0` | Global end trimming | `0.0` (disabled) |
| `pause_between_items_sec` | float | `0.0` | Fixed pause between segments | `0.5` |
| `pause_between_items_gaussian` | GaussianPause? | `null` | Natural pause variance | See GaussianPause schema |
| `pronunciations` | list | `[]` | Auto-managed lexemes | See PronunciationLexemeSpec |
| `pronunciation_dictionary.name` | string? | `null` | Auto-managed dict name | `"myproject"` |
| `pronunciation_dictionary.workspace_access` | string? | `null` | Workspace access level | `"private"` |
| `pronunciation_dictionary.description` | string? | `null` | Dictionary description | `"Project pronunciations"` |
| `pronunciation_dictionaries` | list? | `null` | Pre-existing dict IDs | `[{"id": "pd_...", "version_id": null}]` |

---

### GaussianPause

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mean_seconds` | float | yes | Average pause duration |
| `std_seconds` | float | yes | Standard deviation |
| `min_seconds` | float? | no | Floor value |
| `max_seconds` | float? | no | Ceiling value |

**Example:**
```yaml
pause_between_items_gaussian:
  mean_seconds: 0.18
  std_seconds: 0.07
  min_seconds: 0.06
  max_seconds: 0.5
```

---

### AudioClipSpec (SFX / Music / File)

| Field | Type | Default | Description | Example |
|-------|------|---------|-------------|---------|
| `kind` | `"file"` \| `"sfx"` \| `"music"` | required | Clip type | `"sfx"` |
| `id` | string | required | Unique identifier | `"whoosh"` |
| `at` | string? | scene start | Start time (absolute or relative) | `"+1.5s"`, `"2.0s"` |
| `pause_seconds` | float? | `0` | Delay after `at` time | `3.5` |
| `volume` | float \| int \| string | `1.0` | Playback volume | `0.8`, `80`, `"80%"` |
| `fade_to` | VolumeFadeToSpec? | `null` | Gradual volume change | See VolumeFadeToSpec |
| `fade_out` | VolumeFadeOutSpec? | `null` | Fade before end | See VolumeFadeOutSpec |
| `play_through` | bool | `false` | Extend to video end (music only) | `true` |
| `source_id` | string? | `null` | Variant cache key override | `"shared_clip"` |

**SFX-specific fields:**

| Field | Type | Default | Description | Example |
|-------|------|---------|-------------|---------|
| `prompt` | string | required* | SFX description | `"Fast whoosh transition..."` |
| `duration_seconds` | float | required* | SFX length | `3` |
| `variants` | int | `1` | Number to generate | `8` |
| `pick` | int | `0` | Which variant to use (0-indexed) | `2` |

**Music-specific fields:**

| Field | Type | Default | Description | Example |
|-------|------|---------|-------------|---------|
| `prompt` | string | required* | Music description | `"Ambient background..."` |
| `duration_seconds` | float | scene length | Music length | `30` |
| `model_id` | string? | config default | ElevenLabs music model | `"music_v1"` |
| `force_instrumental` | bool? | `null` | No vocals | `true` |

**File-specific fields:**

| Field | Type | Default | Description | Example |
|-------|------|---------|-------------|---------|
| `src` | string | required* | File path | `"public/audio/clip.mp3"` |

---

### VolumeFadeToSpec

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `volume` | float | required | Target volume (0-1) |
| `after_seconds` | float | required | Start fade at this time |
| `fade_duration_seconds` | float | `2.0` | Fade transition length |

**Example:**
```yaml
fade_to:
  volume: 0.1  # Target 10%
  after_seconds: 4  # Start at 4s
  fade_duration_seconds: 4  # Fade over 4s
```

---

### VolumeFadeOutSpec

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `volume` | float | required | Starting volume for fade (NOT target) |
| `before_end_seconds` | float | required | Start fade this long before end |
| `fade_duration_seconds` | float | `2.0` | Fade transition length |

**Example:**
```yaml
fade_out:
  volume: 0.92  # Starting volume
  before_end_seconds: 4  # Start 4s before end
  fade_duration_seconds: 4  # Fade over 4s
```

---

### PronunciationLexemeSpec

| Field | Type | Default | Description | Example |
|-------|------|---------|-------------|---------|
| `grapheme` | string | required | Text to replace | `"Tactus"` |
| `alias` | string? | `null` | Phonetic guide (simple method) | `"tack-tus"` |
| `phoneme` | string? | `null` | IPA or CMU Arpabet notation | `"T AE1 K T AH0 S"`, `"ˈtæktəs"` |
| `alphabet` | string | `"ipa"` | Phoneme alphabet (required if phoneme used) | `"cmu-arpabet"` ⭐, `"ipa"` |

**Note:** Provide EITHER `alias` OR (`phoneme` + `alphabet`). Not both.

**Example (alias - simple):**
```yaml
pronunciations:
  - lexeme:
      grapheme: "BrandName"
      alias: "brand-name"
```

**Example (CMU Arpabet - RECOMMENDED):**
```yaml
pronunciations:
  - lexeme:
      grapheme: "Tactus"
      phoneme: "T AE1 K T AH0 S"
      alphabet: "cmu-arpabet"
```

**Example (IPA - alternative):**
```yaml
pronunciations:
  - lexeme:
      grapheme: "Tactus"
      phoneme: "ˈtæktəs"
      alphabet: "ipa"
```

**CMU Arpabet Quick Reference:**
- Vowels: `AA`, `AE`, `AH`, `AO`, `AW`, `AY`, `EH`, `ER`, `EY`, `IH`, `IY`, `OW`, `OY`, `UH`, `UW`
- Stress: `0` (none), `1` (primary), `2` (secondary) - appended to vowels (e.g., `AE1`)
- Consonants: Standard letters (T, K, S, etc.)
- Example: "actually" = `AE1 K CH UW0 AH0 L IY0`

---

## TROUBLESHOOTING

| Error/Issue | Cause | Solution |
|-------------|-------|----------|
| Silent audio | Bad phoneme notation or missing `alphabet` | Try CMU Arpabet with `alphabet: "cmu-arpabet"`, or use `alias` |
| Wrong SFX variant plays | Stale cache or incorrect `pick` index | Verify `pick` value (0-indexed). Clear `.babulus/out/<video>/cache/` if stale. |
| First word clipped | Audio decode startup delay | Add `lead_in_seconds: 0.25` |
| Unnatural pauses | Fixed `pause_between_items_sec` | Use `pause_between_items_gaussian` for natural variance |
| Pronunciation ignored | Dictionary not attached | Check `.babulus/out/<video>/manifest.json` for dictionary ID |
| Music doesn't extend | Default behavior is scene-duration | Add `play_through: true` |
| Volume too loud/quiet | Format mismatch | Use consistent format: `0.8`, `80`, or `"80%"` |
| SFX not generated | Missing `kind`, `prompt`, or `duration_seconds` | Ensure all required fields present |
| Variants not cached | `source_id` conflict | Use unique `id` per clip or set `source_id` for shared caching |

---

## ELEVENLABS BEST PRACTICES SUMMARY

Babulus exposes ElevenLabs features via YAML. For API-level details, see [ElevenLabs official docs](https://elevenlabs.io/docs).

### Text Normalization
**ElevenLabs:** Preprocess phone numbers, currency, dates, abbreviations.
**Babulus:** Handle in `voice` segments before synthesis.

**Example:**
```yaml
voice: "Call five five five, one two three four."  # Not "555-1234"
```

### Pause Control
**ElevenLabs:** `<break time="x.xs" />` tags (v2/Turbo models).
**Babulus:** Use `pause_seconds` in segments.

**Example:**
```yaml
segments:
  - voice: "First part."
  - pause_seconds: 1.5  # Equivalent to <break time="1.5s" />
  - voice: "Second part."
```

### Pronunciation
**ElevenLabs:** CMU Arpabet (recommended) or IPA phonemes via pronunciation dictionaries.
**Babulus:** Auto-managed dictionaries with three methods:
1. `alias` - Simple phonetic guide
2. `phoneme` with `alphabet: "cmu-arpabet"` - **RECOMMENDED** for precision
3. `phoneme` with `alphabet: "ipa"` - Alternative

**Example (CMU Arpabet - RECOMMENDED):**
```yaml
pronunciations:
  - lexeme:
      grapheme: "Tactus"
      phoneme: "T AE1 K T AH0 S"
      alphabet: "cmu-arpabet"  # Most reliable with AI models
```

### Emotion Control (v3 Audio Tags)
**ElevenLabs:** `[whispers]`, `[excited]`, `[sarcastic]`, etc.
**Babulus:** Not directly exposed. Rely on text phrasing and context.

### Pacing
**ElevenLabs:** Speed parameter (0.7-1.2x).
**Babulus:** Not directly exposed. Use model/voice selection.

### Stability Settings (v3)
**ElevenLabs:** Creative / Natural / Robust modes.
**Babulus:** Configured via `voice_settings` in global config (advanced).

---

## SUMMARY: AI AGENT CHECKLIST

When generating `.babulus.yml` with ElevenLabs features:

1. **Set provider** in `voiceover` section: `provider: elevenlabs`
2. **Add pronunciation dictionary** if custom terms exist
3. **Use CMU Arpabet** with `alphabet: "cmu-arpabet"` for pronunciation (most reliable)
4. **Always specify `alphabet`** when using `phoneme` field
5. **Add `lead_in_seconds: 0.25`** to prevent first-word clipping
6. **Use `pause_between_items_gaussian`** for natural-sounding narration
7. **Generate SFX variants** with `variants: 8` and audition with `pick`
8. **Use `fade_to` / `fade_out`** for professional music bed mixing
9. **Add `play_through: true`** for continuous background music
10. **Use volume format consistently**: `0.8`, `80`, or `"80%"`
11. **Reference audio library** for reusable clips with `use: <id>`

---

**End of Guide**
Token count: ~1,050 lines (~31,500 tokens)
Last updated: 2026-01-15
