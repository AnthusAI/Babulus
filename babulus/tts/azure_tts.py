from __future__ import annotations

import wave
from dataclasses import dataclass
from pathlib import Path

import requests

from ..errors import CompileError
from .providers import TTSSegment, TTSProvider, TTSRequest


def _wav_duration_sec(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def _azure_output_format(sample_rate_hz: int) -> str:
    # Azure supports a lot of formats; we stick to mono PCM in WAV container.
    if sample_rate_hz == 44100:
        return "riff-44100hz-16bit-mono-pcm"
    if sample_rate_hz == 24000:
        return "riff-24khz-16bit-mono-pcm"
    if sample_rate_hz == 16000:
        return "riff-16khz-16bit-mono-pcm"
    if sample_rate_hz == 8000:
        return "riff-8khz-16bit-mono-pcm"
    raise CompileError(
        "Azure TTS sample_rate_hz must be one of 8000, 16000, 24000, 44100 for WAV output"
    )


@dataclass(frozen=True)
class AzureSpeechTTSProvider(TTSProvider):
    name: str = "azure-speech"
    api_key: str = ""
    region: str = ""
    voice_name: str = "en-US-JennyNeural"

    def synthesize(self, req: TTSRequest, out_path: str | Path) -> TTSSegment:
        if not self.api_key or not self.region:
            raise CompileError("Azure TTS requires providers.azure_speech.api_key and providers.azure_speech.region")
        voice = req.voice or self.voice_name
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        url = f"https://{self.region}.tts.speech.microsoft.com/cognitiveservices/v1"
        output_format = _azure_output_format(req.sample_rate_hz)
        ssml = (
            "<speak version='1.0' xml:lang='en-US'>\n"
            f"  <voice name='{voice}'>\n"
            f"    {req.text}\n"
            "  </voice>\n"
            "</speak>"
        )
        r = requests.post(
            url,
            headers={
                "Ocp-Apim-Subscription-Key": self.api_key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": output_format,
                "User-Agent": "babulus",
            },
            data=ssml.encode("utf-8"),
            timeout=120,
        )
        if r.status_code >= 400:
            raise CompileError(f"Azure TTS failed ({r.status_code}): {r.text[:400]}")
        out.write_bytes(r.content)
        return TTSSegment(path=str(out), durationSec=_wav_duration_sec(out))
