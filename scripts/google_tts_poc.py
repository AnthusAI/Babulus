#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
from typing import Any

import requests


def _get(d: dict[str, Any], path: str) -> Any:
    cur: Any = d
    for part in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def main() -> None:
    ap = argparse.ArgumentParser(description="Minimal Google Cloud Text-to-Speech PoC (API key via Babulus config).")
    ap.add_argument("--text", required=True, help="Text to speak")
    ap.add_argument("--out", required=True, help="Output audio file (.mp3 recommended)")
    ap.add_argument("--language-code", default="en-US")
    ap.add_argument("--voice-name", default="", help='Optional: e.g. "en-US-Neural2-J"')
    ap.add_argument("--speaking-rate", type=float, default=1.0)
    ap.add_argument("--pitch", type=float, default=0.0)
    ap.add_argument("--audio-encoding", default="MP3", choices=["MP3", "LINEAR16", "OGG_OPUS"])
    args = ap.parse_args()

    def find_config_path() -> Path | None:
        override = os.getenv("BABULUS_PATH")
        if override:
            p = Path(override).expanduser()
            if p.is_dir():
                p = p / "config.yml"
            return p if p.exists() else None

        local = Path.cwd() / ".babulus" / "config.yml"
        if local.exists():
            return local
        home = Path.home() / ".babulus" / "config.yml"
        if home.exists():
            return home
        return None

    def load_config() -> dict[str, Any]:
        path = find_config_path()
        if path is None:
            return {}
        try:
            from dotyaml import ConfigLoader  # type: ignore

            loader = ConfigLoader(prefix="BABULUS")
            obj = loader.load_from_yaml(str(path))
        except Exception:  # noqa: BLE001
            try:
                import yaml  # type: ignore

                obj = yaml.safe_load(path.read_text(encoding="utf-8"))
            except Exception as e2:  # noqa: BLE001
                raise SystemExit(f"Invalid config: {path}") from e2
        if obj is None:
            return {}
        if not isinstance(obj, dict):
            raise SystemExit(f"Config must be a mapping: {path}")
        return obj

    cfg = load_config()
    api_key = _get(cfg, "providers.google.api_key") or ""
    if not isinstance(api_key, str) or not api_key.strip():
        raise SystemExit(
            "Missing Google API key.\n\n"
            "Put it in either:\n"
            "- ./.babulus/config.yml  (project-local)\n"
            "- ~/.babulus/config.yml  (global)\n\n"
            "Example:\n"
            "  providers:\n"
            "    google:\n"
            "      api_key: \"...\"\n"
        )

    payload: dict[str, Any] = {
        "input": {"text": args.text},
        "voice": {"languageCode": args.language_code},
        "audioConfig": {
            "audioEncoding": args.audio_encoding,
            "speakingRate": args.speaking_rate,
            "pitch": args.pitch,
        },
    }
    if args.voice_name:
        payload["voice"]["name"] = args.voice_name

    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
    r = requests.post(url, headers={"Content-Type": "application/json"}, data=json.dumps(payload), timeout=120)
    if r.status_code != 200:
        raise SystemExit(f"Google TTS failed ({r.status_code}): {r.text[:2000]}")

    data = r.json()
    audio_b64 = data.get("audioContent")
    if not isinstance(audio_b64, str) or not audio_b64:
        raise SystemExit(f"Google TTS response missing audioContent: {str(data)[:1000]}")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(base64.b64decode(audio_b64))
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
