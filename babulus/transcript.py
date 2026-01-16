from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .errors import CompileError
from .util import normalize_word


@dataclass(frozen=True)
class TranscriptWord:
    word: str
    start: float
    end: float

    @property
    def norm(self) -> str:
        return normalize_word(self.word)


def _parse_word(obj: Any) -> TranscriptWord:
    if not isinstance(obj, dict):
        raise CompileError("Transcript word must be an object")
    try:
        word = obj["word"]
        start = obj["start"]
        end = obj["end"]
    except KeyError as e:
        raise CompileError(f"Transcript word missing field: {e}") from e
    if not isinstance(word, str):
        raise CompileError("Transcript.word must be a string")
    if not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
        raise CompileError("Transcript.start/end must be numbers (seconds)")
    return TranscriptWord(word=word, start=float(start), end=float(end))


def load_transcript_words(path: str | Path) -> list[TranscriptWord]:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "words" in raw:
        raw_words = raw["words"]
    else:
        raw_words = raw
    if not isinstance(raw_words, list):
        raise CompileError("Transcript JSON must be a list of words or {\"words\": [...]}")
    return [_parse_word(w) for w in raw_words]


def find_subsequence(
    haystack: Iterable[str], needle: list[str], start_index: int
) -> tuple[int, int] | None:
    if not needle:
        return None
    hs = list(haystack)
    n = len(needle)
    for i in range(start_index, len(hs) - n + 1):
        if hs[i : i + n] == needle:
            return i, i + n - 1
    return None

