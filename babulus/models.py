from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass(frozen=True)
class Bullet:
    id: str
    text: str


@dataclass(frozen=True)
class CuePoint:
    id: str
    label: str
    startSec: float
    endSec: float
    text: str
    bullets: list[Bullet] = field(default_factory=list)


@dataclass(frozen=True)
class Scene:
    id: str
    title: str
    startSec: float
    endSec: float
    cues: list[CuePoint] = field(default_factory=list)


@dataclass(frozen=True)
class Script:
    scenes: list[Scene]

    def to_jsonable(self) -> dict[str, Any]:
        return {
            "scenes": [
                {
                    "id": scene.id,
                    "title": scene.title,
                    "startSec": scene.startSec,
                    "endSec": scene.endSec,
                    "cues": [
                        {
                            "id": cue.id,
                            "label": cue.label,
                            "startSec": cue.startSec,
                            "endSec": cue.endSec,
                            "text": cue.text,
                            "bullets": [{"id": b.id, "text": b.text} for b in cue.bullets],
                        }
                        for cue in scene.cues
                    ],
                }
                for scene in self.scenes
            ]
        }

