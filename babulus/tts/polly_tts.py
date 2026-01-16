from __future__ import annotations

import wave
from dataclasses import dataclass
from pathlib import Path

import boto3

from ..errors import CompileError
from .providers import TTSSegment, TTSProvider, TTSRequest


def _pcm_to_wav(pcm: bytes, *, sample_rate_hz: int, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if len(pcm) % 2 != 0:
        pcm = pcm[:-1]
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate_hz)
        wf.writeframes(pcm)


def _wav_duration_sec(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


@dataclass(frozen=True)
class PollyTTSProvider(TTSProvider):
    name: str = "aws-polly"
    region: str = "us-east-1"
    voice_id: str = "Joanna"
    engine: str = "standard"  # standard | neural
    language_code: str | None = None

    def synthesize(self, req: TTSRequest, out_path: str | Path) -> TTSSegment:
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        voice_id = req.voice or self.voice_id
        allowed = {8000, 16000}
        if req.sample_rate_hz not in allowed:
            raise CompileError(
                f"AWS Polly PCM only supports sample_rate_hz {sorted(allowed)} (got {req.sample_rate_hz}). "
                "Set voiceover.sample_rate_hz accordingly."
            )
        sample_rate = str(int(req.sample_rate_hz))
        polly = boto3.client("polly", region_name=self.region)

        kwargs = {
            "Text": req.text,
            "OutputFormat": "pcm",
            "VoiceId": voice_id,
            "SampleRate": sample_rate,
            "Engine": self.engine,
        }
        if self.language_code:
            kwargs["LanguageCode"] = self.language_code

        resp = polly.synthesize_speech(**kwargs)
        stream = resp.get("AudioStream")
        if stream is None:
            raise CompileError("AWS Polly response missing AudioStream")
        pcm = stream.read()
        _pcm_to_wav(pcm, sample_rate_hz=req.sample_rate_hz, out_path=out)
        return TTSSegment(path=str(out), durationSec=_wav_duration_sec(out))
