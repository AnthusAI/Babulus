# VideoML DOM Runtime Plan (Canonical)

## Purpose
Define a DOM-first, browser-native VideoML runtime where the XML document is the canonical source of truth and the in-memory VOM is the actual browser DOM. Time is a layout axis, and live playback behaves like a web page with a timeline. Inline JavaScript is allowed. Determinism is not enforced.

**Status:** Canonical. This document supersedes all previous VOM/V3 notes.

---

## Goals
- VideoML is the canonical authoring format (`.babulus.xml`).
- The VOM is the browser DOM (not JSON, not a detached AST).
- Time is a layout axis; containers expand in time like divs expand in space.
- Live timeline never stops; open-ended scenes stay active until cut.
- DOM edits to visible nodes update immediately.
- Inline JS is allowed (thin layer over the browser).
- Recording is state/effects, not event triggers.

## Non-Goals
- Determinism enforcement.
- Sandboxed runtime by default.
- React in the VideoML playback path.
- Backward compatibility for `<video>` root.

---

## Glossary
- **VideoML**: XML-based video markup language.
- **VOM**: Video Object Model; the DOM subtree for a VideoML document.
- **Temporal layout**: Resolving time dimensions from children (like CSS reflow).
- **Live mode**: Unbounded clock; playback never stops.
- **Recording**: Serialized XML state with explicit durations.

---

## Canonical Root
- Canonical root tag: `<videoml>`
- The browser DOM uses `<videoml>` as the root element.
- `<video>` is not supported.

---

## Runtime Model (DOM-First)
- The XML document is parsed into a DOM and inserted into the page.
- The DOM subtree is the VOM.
- The player updates the timeline, dispatches lifecycle events, and applies visibility rules.
- MutationObserver records state changes for recording.

---

## Timeline API (Global + Per-Player)
- `window.timeline.frame`
- `window.timeline.time`
- `window.timeline.fps`
- `window.timelines` (map of active timelines)
- Each player exposes `element.timeline`.
- Optional shared timeline via `syncGroup`.

### CSS Variables
Set on the root element each tick:
- `--video-frame`
- `--video-time`
- `--video-fps`

---

## Events (DOM CustomEvents)
Dispatched on the root and bubbled to `window`:
- `timeline:tick` `{ frame, time, fps }`
- `scene:start` `{ sceneId, time, frame }`
- `scene:end` `{ sceneId, time, frame }`
- `cue:start` `{ cueId, time, frame }`
- `cue:end` `{ cueId, time, frame }`

---

## Inline JavaScript
- `<script>` blocks inside `<videoml>` are executed when inserted.
- `on:*` attributes are compiled to event listeners.
- Handler scope includes `event`, `target`, `timeline`, `root`.

---

## Temporal Layout (Time as Layout)

### Container Rules
- `<sequence>`: children laid out back-to-back.
- `<stack>`: children parallel (duration = max).
- Explicit `duration`/`end` wins over derived.

### Scene Duration
- Scene duration = max(visualTrack, audioTrack) when audio is present.
- If no explicit duration or child timing, duration defaults to 0 unless open-ended (live mode).

---

## Open-Ended Durations
- Allowed only in live mode.
- When a new scene is appended, the current scene is finalized at `now + buffer`.
- Export/recording must error if any open-ended scenes remain.

---

## Recording Model
Recording is **state-only XML**:
- The XML document after edits is the recording.
- Event history can be stored as optional metadata:

```
<events>
  <event time="12.3s" type="click" target="node-id" detail='{"x":10,"y":20}' />
</events>
```

Playback ignores `<events>`; it uses the recorded DOM state.

---

## Component Model (Web Components Only)
- Custom component tags must be hyphenated.
- Components are native Web Components (no React).
- Components receive time via CSS variables and timeline events.
- All interactivity is DOM-native.

---

## Implementation Map
- `src/dsl/xml.ts`: parse `<videoml>` root.
- `apps/studio-web/lib/dsl-executor.ts`: parse `<videoml>` root for preview.
- `apps/studio-web/components/vom-preview-player.tsx`: use DOM runtime.
- `apps/studio-web/components/live-vom-page.tsx`: emit `<videoml>`.
- `apps/studio-web/components/docs/live-demos.tsx`: update examples to `<videoml>`.

---

## Demo/Test Page (Developer Docs)
The `/docs/live-vom` page is both documentation and a test bed:

1. Temporal reflow (auto duration)
2. Sequence vs stack
3. Live open-ended scene + cut
4. Live DOM edits
5. Inline JS + events
6. Multi-screen sync

Only the first demo auto-plays.

---

## Failure Mode Checklist
- Clock stops at end (should never stop in live mode)
- Open-ended durations leak into export
- DOM edits do not update visible nodes
- Custom elements fail due to non-hyphenated names
- Timeline not shared when `syncGroup` is set
- MutationObserver causes infinite loops

---

## Build Order
1. Update canonical plan (this doc).
2. Switch parser roots to `<videoml>`.
3. Implement DOM runtime + timeline core.
4. Implement first-wave Web Components.
5. Update docs demos and live page.

