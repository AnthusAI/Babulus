# Transitions vNext Plan

## Goal
Introduce first-class timeline transitions for the XML DSL, with GSAP-based easing, audio cues in transitions, and time expressions that accept seconds or frames. This is a breaking-change window; we will redesign the spec for elegance and long-term flexibility.

## Core Design (decisions)
- Timeline is an ordered list of items, not just scenes. Items include scenes, transitions, and marks.
- `<transition>` is a first-class container between scenes. It may include visuals (layers/components) and audio (sfx/music/audio) cues.
- Scene-level `enter` / `exit` transitions are convenience features (fade in/out, etc). Crossfades require an explicit `<transition>` item.
- Transition duration is explicit or derived from content; overflow behavior (visual/audio) is configurable like CSS:
  - `overflow` controls visuals; `overflowAudio` controls audio.
  - Options include `clip` (cut), `extend` (grow transition), and `allow` (play past end).
- Easing uses GSAP ease strings; the engine is GSAP-first but remains a thin layer.
- Time expressions accept `s`, `ms`, `f` and functions `min/max/clamp/snap/scene/cue/mark`, plus `prev.start`, `prev.end`, `next.start`, `timeline.start`.
- Language stays on `<scene>` (no rename to `<screen>`), but wording in docs should say “screen” for clarity in prose.

## Work Plan
1. **Refactor time expression parsing**
   - Extract parser/evaluator into `src/dsl/time-expr.ts`.
   - Add `mark()` support and `getMarkStart` in context.

2. **DSL types: timeline items**
   - Add `TransitionSpec`, `MarkSpec`, `TimelineItemSpec`.
   - Replace `CompositionSpec.scenes` with `CompositionSpec.timeline`.
   - Add per-scene `enter` / `exit` fields and `transitionToNext` convenience.
   - Add audio element specs for `<audio>`, `<sfx>`, `<music>`.

3. **XML parsing (spec + parser)**
   - Parse root children in order: `<scene>`, `<transition>`, `<mark>`, `<voiceover>`.
   - Add `<transition>` container parsing with timing + overflow handling.
   - Add `<mark id at>` parsing.
   - Add `<audio kind=...>` plus `<sfx>`, `<music>` aliases.
   - Parse scene `enter/exit/transition-to-next` attributes.

4. **Compilation / generation**
   - Compile a single timeline with overlaps for transitions.
   - Resolve audio clip start times from cues/scenes/marks.
   - Apply overflow policies to visuals/audio and duration calculation.

5. **Renderer**
   - Support overlap rendering with two scenes and transition container.
   - Add GSAP and ease mapping.

6. **Docs + examples**
   - Update docs to reflect new XML grammar and semantics.
   - Add transition examples and time-expression reference.

## Notes / Constraints
- No commits without explicit approval.
- Use this plan as source-of-truth for the transition redesign.
