from __future__ import annotations

import re


_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = _slug_re.sub("-", text).strip("-")
    return text or "untitled"


def normalize_word(word: str) -> str:
    word = word.lower()
    word = re.sub(r"[^\w']+", "", word)
    return word


def split_words(text: str) -> list[str]:
    return [w for w in (normalize_word(w) for w in re.split(r"\s+", text.strip())) if w]

