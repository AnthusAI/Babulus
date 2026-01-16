from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from .errors import CompileError


def probe_duration_sec(path: str | Path) -> float:
    p = str(path)
    try:
        res = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                p,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        data = json.loads(res.stdout)
        dur = float(data["format"]["duration"])
        return max(0.0, dur)
    except FileNotFoundError as e:
        raise CompileError("ffprobe is required to probe audio duration") from e
    except Exception as e:  # noqa: BLE001
        raise CompileError(f"Could not probe duration for: {p}") from e


def probe_volume_db(path: str | Path, *, seconds: float = 3.0) -> dict[str, float | None]:
    """
    Return {"mean_volume_db": float|None, "max_volume_db": float|None} using ffmpeg volumedetect.
    """
    p = str(path)
    try:
        res = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-v",
                "info",
                "-t",
                str(seconds),
                "-i",
                p,
                "-af",
                "volumedetect",
                "-f",
                "null",
                "-",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        stderr = res.stderr or ""
        mean: float | None = None
        mx: float | None = None
        for line in stderr.splitlines():
            line = line.strip()
            if "mean_volume:" in line:
                try:
                    mean = float(line.split("mean_volume:", 1)[1].split(" dB", 1)[0].strip())
                except Exception:  # noqa: BLE001
                    pass
            if "max_volume:" in line:
                try:
                    mx = float(line.split("max_volume:", 1)[1].split(" dB", 1)[0].strip())
                except Exception:  # noqa: BLE001
                    pass
        return {"mean_volume_db": mean, "max_volume_db": mx}
    except FileNotFoundError as e:
        raise CompileError("ffmpeg is required to probe audio volume") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or "")[:800]
        raise CompileError(f"ffmpeg volumedetect failed: {stderr}") from e


def is_audio_all_silence(
    path: str | Path,
    *,
    seconds: float = 3.0,
    sample_rate_hz: int = 44100,
) -> bool:
    """
    Decode up to `seconds` of audio and check if all PCM samples are 0.

    This is a cheap, objective test that catches "valid container, silent payload"
    failures from upstream providers.
    """
    p = str(path)
    try:
        # Decode to raw signed 16-bit mono PCM.
        res = subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-t",
                str(seconds),
                "-i",
                p,
                "-ac",
                "1",
                "-ar",
                str(int(sample_rate_hz)),
                "-f",
                "s16le",
                "pipe:1",
            ],
            check=True,
            capture_output=True,
        )
        data = res.stdout or b""
        if len(data) == 0:
            return True
        # For s16le, silence is all-zero bytes.
        return all(b == 0 for b in data)
    except FileNotFoundError as e:
        raise CompileError("ffmpeg is required to decode audio") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[:800].decode("utf-8", errors="replace")
        raise CompileError(f"ffmpeg decode failed: {stderr}") from e


def audio_activity_ratio(
    path: str | Path,
    *,
    seconds: float = 3.0,
    sample_rate_hz: int = 44100,
    amplitude_threshold: int = 200,
) -> float:
    """
    Decode up to `seconds` of audio and compute the fraction of samples whose absolute
    amplitude exceeds `amplitude_threshold`.
    """
    p = str(path)
    try:
        res = subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-t",
                str(seconds),
                "-i",
                p,
                "-ac",
                "1",
                "-ar",
                str(int(sample_rate_hz)),
                "-f",
                "s16le",
                "pipe:1",
            ],
            check=True,
            capture_output=True,
        )
        data = res.stdout or b""
        if len(data) < 2:
            return 0.0
        # Interpret as signed 16-bit little-endian samples without allocating a giant list.
        total = len(data) // 2
        active = 0
        thr = int(amplitude_threshold)
        for i in range(0, total * 2, 2):
            sample = int.from_bytes(data[i : i + 2], byteorder="little", signed=True)
            if sample >= thr or sample <= -thr:
                active += 1
        return active / float(total) if total else 0.0
    except FileNotFoundError as e:
        raise CompileError("ffmpeg is required to decode audio") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[:800].decode("utf-8", errors="replace")
        raise CompileError(f"ffmpeg decode failed: {stderr}") from e


def trim_audio_to_duration(
    in_path: str | Path,
    *,
    out_path: str | Path,
    duration_sec: float,
    sample_rate_hz: int = 44100,
) -> None:
    """
    Create a trimmed copy (0..duration_sec). Re-encodes for reliability.
    """
    inp = str(in_path)
    outp = Path(out_path)
    outp.parent.mkdir(parents=True, exist_ok=True)
    dur = max(0.0, float(duration_sec))
    # Keep a real audio extension so ffmpeg can infer muxer (avoid ".mp3.tmp").
    tmp = outp.with_name(outp.stem + ".tmp" + outp.suffix)
    codec_args: list[str]
    if outp.suffix.lower() == ".wav":
        codec_args = ["-ac", "1", "-ar", str(int(sample_rate_hz)), "-c:a", "pcm_s16le"]
    elif outp.suffix.lower() == ".mp3":
        codec_args = ["-ac", "1", "-ar", str(int(sample_rate_hz)), "-c:a", "libmp3lame", "-b:a", "128k"]
    else:
        codec_args = ["-ac", "1", "-ar", str(int(sample_rate_hz))]
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                inp,
                "-t",
                str(dur),
                *codec_args,
                str(tmp),
            ],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError as e:
        raise CompileError("ffmpeg is required to trim audio") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[:800].decode("utf-8", errors="replace")
        raise CompileError(f"ffmpeg trim failed: {stderr}") from e
    tmp.replace(outp)


def estimate_trailing_silence_sec(
    path: str | Path,
    *,
    sample_rate_hz: int = 44100,
    amplitude_threshold: int = 200,
    max_analyze_sec: float = 6.0,
) -> float:
    """
    Estimate trailing silence/breath tail by decoding up to the last `max_analyze_sec` seconds
    and scanning backwards for samples above `amplitude_threshold`.

    Returns a conservative silence duration in seconds.
    """
    p = str(path)
    dur = probe_duration_sec(p)
    if dur <= 0:
        return 0.0
    analyze = min(float(max_analyze_sec), dur)
    # Decode only the tail window for efficiency.
    start = max(0.0, dur - analyze)
    try:
        res = subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-ss",
                str(start),
                "-i",
                p,
                "-t",
                str(analyze),
                "-ac",
                "1",
                "-ar",
                str(int(sample_rate_hz)),
                "-f",
                "s16le",
                "pipe:1",
            ],
            check=True,
            capture_output=True,
        )
        data = res.stdout or b""
        if len(data) < 2:
            return 0.0
        total = len(data) // 2
        thr = int(amplitude_threshold)
        # Scan backwards for the last "active" sample.
        last_active = -1
        for i in range(total - 1, -1, -1):
            off = i * 2
            sample = int.from_bytes(data[off : off + 2], byteorder="little", signed=True)
            if sample >= thr or sample <= -thr:
                last_active = i
                break
        if last_active < 0:
            return float(analyze)
        trailing_samples = (total - 1) - last_active
        trailing_sec = trailing_samples / float(sample_rate_hz)
        return max(0.0, float(trailing_sec))
    except FileNotFoundError as e:
        raise CompileError("ffmpeg is required to decode audio") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[:800].decode("utf-8", errors="replace")
        raise CompileError(f"ffmpeg decode failed: {stderr}") from e


def concat_audio_files(out_path: str | Path, segment_paths: list[str | Path]) -> None:
    """
    Concatenate audio files using ffmpeg concat demuxer.

    This works for mp3, wav, etc. but requires ffmpeg.
    """
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    if not segment_paths:
        raise CompileError("No audio segments to concatenate")

    list_file = out.parent / f".concat-{out.stem}.txt"
    list_file.write_text(
        "".join([f"file '{Path(p).resolve()}'\n" for p in segment_paths]),
        encoding="utf-8",
    )
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                str(out),
            ],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError as e:
        raise CompileError("ffmpeg is required to concatenate audio files") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[:800].decode("utf-8", errors="replace")
        raise CompileError(f"ffmpeg concat failed: {stderr}") from e
    finally:
        try:
            list_file.unlink(missing_ok=True)  # py>=3.8
        except Exception:  # noqa: BLE001
            pass
