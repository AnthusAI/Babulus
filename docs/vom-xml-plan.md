# Babulus VOM XML Plan (Draft)

## Purpose
Define a declarative XML-based Video Object Model (VOM) that becomes the canonical authoring document for Babulus. The VOM is parsed into an in-memory DOM-like tree, evaluated deterministically with a `frame` parameter, and can be patched during playback using a safety-margin model. This plan documents the XML spec, timing grammar, coercion rules, adapter logic, and patch protocol, plus a phased migration from the current TypeScript DSL.

**Status:** The **V3 Architecture Reset** section below is canonical. Earlier sections (V0–V2) are retained for historical context and may conflict with V3. New work must follow V3.

## Goals
- XML is the source of truth (`.babulus.xml`).
- VOM is an in-memory parse tree (DOM-like), not JSON.
- Rendering stays deterministic and frame-driven.
- Custom components remain supported via React registry.
- Streaming updates are possible via DOM patches with safety margins.

## Non-Goals (Initial Phase)
- Replace the renderer or audio pipeline.
- Full browser-native DOM rendering without an adapter.
- Real-time patch arbitration between AI models (policy only, not implementation).

---

# V0 XML Spec

## File
- Extension: `.babulus.xml`
- Root tag: `<video>`

## Tag Conventions
- Built-in tags are lowercase: `video`, `scene`, `cue`, `layer`, `pause`, `voice`, `bullet`.
- Custom components are kebab-case tags: `hero-card`, `lower-third`, `text-effects`.

## `<video>` (CompositionSpec)
**Attributes**
- `id` (required)
- `title` (optional)
- `fps` (optional, default 30)
- `width` (optional, default 1280)
- `height` (optional, default 720)
- `duration` (optional, time expression)
- `poster` (optional, time expression)

**Children**
- One or more `<scene>`
- Optional tags: `<voiceover>` (voice config), future `<audio>`, `<music>`, `<sfx>`

**Mapping**
- `id` -> `CompositionSpec.id`
- `title` -> `CompositionSpec.title`
- `fps/width/height/duration` -> `CompositionSpec.meta`
- `poster` -> `CompositionSpec.posterTime`

## `<scene>` (SceneSpec)
**Attributes**
- `id` (required)
- `title` (optional; default = id)
- `start`, `duration`, `end` (optional time expressions)
- `styles` (optional JSON string)
- `markup` (optional JSON string)

**Children**
- `<cue>` and `<pause>` in document order
- `<layer>` (optional)
- Component tags (optional, direct children)

**Mapping**
- `SceneSpec.id = id`
- `SceneSpec.title = title ?? id`
- `SceneSpec.time.start/end` set when provided
- `SceneSpec.styles/markup` from `styles`/`markup` JSON
- `SceneSpec.items` from `<cue>` and `<pause>` in order
- `SceneSpec.layers` from `<layer>`
- `SceneSpec.components` from direct component tags

**Rules**
- Legacy: Each scene must contain at least one `<cue>` (deprecated in V3; cues are optional).

## `<cue>` (CueSpec)
**Attributes**
- `id` (required; unique across entire file)
- `label` (optional; default = id)
- `provider` (optional voice provider override)
- `start`, `duration`, `end` (optional time expressions for explicit cue timing)

**Children**
- `<voice>` segments (text)
- `<pause>` segments (inside cue)
- `<bullet>` segments

**Mapping**
- `CueSpec.segments` from `<voice>` and `<pause>`
- `CueSpec.bullets` from `<bullet>`
- `CueSpec.label` from `label`
- `CueSpec.provider` from `provider`
- `CueSpec.time` from `start/duration/end` when supplied

## `<voice>` (VoiceSegmentSpec: text)
**Attributes**
- `trim-end` (optional time expression)

**Content**
- Text node -> `{ kind: "text", text }`

## `<pause>` (PauseSpec)
**Context-sensitive meaning**
- Inside `<cue>`: voice segment pause
- Direct child of `<scene>`: inter-item pause

**Attributes**
- Fixed: `seconds`
- Gaussian: `mean`, `std` (optional `min`, `max`)

**Mapping**
- Fixed: `{ kind: "pause", mode: "fixed", seconds }`
- Gaussian: `{ kind: "pause", mode: "gaussian", mean, std, min, max }`

## `<bullet>`
**Content**
- Text node -> bullet string in `CueSpec.bullets`

## `<layer>` (LayerSpec)
**Attributes**
- `id` (required)
- `visible` (optional boolean)
- `z` (optional; maps to `zIndex`)
- `start`, `end` (optional time expressions)
- `styles` (optional JSON string)
- `markup` (optional JSON string)

**Children**
- Component tags

**Mapping**
- `LayerSpec.id = id`
- `LayerSpec.visible/zIndex/timing/styles/markup`
- `LayerSpec.components` from child component tags

## `<voiceover>` (Composition voice config)
**Attributes**
- `provider` (optional)
- `voice` (optional)
- `model` (optional)
- `format` (optional)
- `sampleRateHz` (optional)
- `seed` (optional)
- `leadInSeconds` (optional time expression)
- `trimEndSeconds` (optional time expression)

**Mapping**
- `CompositionSpec.voiceover` fields

## Component Tags (ComponentSpec)
**Identification**
- Any tag not in built-ins is treated as a component.
- Kebab-case tag names map to PascalCase component types (e.g., `title-slide` -> `TitleSlide`).

**Attributes**
- All non-reserved attributes become `props`.
- Reserved: `id`, `visible`, `z`, `start`, `end`, `duration`, `styles`, `markup`.

**Mapping**
- `ComponentSpec.type = tagName`
- `ComponentSpec.props = parsed attributes (non-reserved)`
- `ComponentSpec.timing = { startSec, endSec }` from timing attrs
- `ComponentSpec.styles/markup` if provided

---

# V1 Timing Grammar

## Units
- `f` (frames)
- `s` (seconds)
- `ms` (milliseconds)

## References
- `scene(id).start`, `scene(id).end`
- `cue(id)` -> cue start
- `prev.start`, `prev.end`, `next.start`
- `timeline.start` (alias for 0f)

## Math
- `+ - * /`
- Parentheses supported

## Helpers
- `min(a,b)`
- `max(a,b)`
- `clamp(x, min, max)`
- `snap(x, grid)`

## Examples
- `start="scene(intro).end + 12f"`
- `duration="2s"`
- `start="cue(beat1) + 8f"`
- `start="max(prev.end - 10f, 0f)"`
- `start="snap(scene(logo).start + 7f, 5f)"`

## Resolution Rules
1. Parse expression into AST.
2. Convert unit values to seconds (or frames) using `fps`.
3. Build dependency graph for `scene`/`cue` refs.
4. Topologically resolve; error on cycles or missing IDs.

---

# V2 Live Mode (Always-Playing VOM Preview)

**Legacy note:** This section describes the initial live mode prototype (queueing with safety margins). It is **superseded** by V3’s unbounded live clock and finalize-on-interaction model.

## Purpose
Provide a live, always-playing preview page that demonstrates realtime VOM updates using the XML DSL. This is a separate "live" mode that does **not** depend on audio generation. Scene durations are declared in XML. The page allows users to append scenes into the near future while playback is ongoing.

This is the public demo for the "Video Object Model" concept and replaces the current `/translations` public page content.

## Non-Goals (Live Mode, Initial Pass)
- Audio generation (TTS/SFX/music) in live mode.
- Just-in-time audio scheduling or buffering.
- Patch logs as the primary recording format (XML is the recording).
- Complex arbitration between multiple AI agents.

## Key Decisions
- Public route: replace `/translations` with the Live page (no redirects).
- Always-playing player with **no transport controls**.
- Scene durations are defined by XML attributes, not audio artifacts.
- VOM recording is persisted as XML (append-only scene XML).
- Live updates are **patch-based** and only target future content.

## Live Page Requirements
Location: `apps/studio-web/app/(public)/translations/page.tsx`

UI:
- Full-width live player.
- No play/pause/scrub UI.
- A row of **four** buttons to append scenes:
  1. Title
  2. Bullets
  3. Two Column
  4. Chapter Heading
- Optional: "Copy XML" action for exporting the recording.

Behavior:
- Player starts automatically and continues indefinitely.
- Each button appends a **new `<scene>`** to the XML recording.
- Multiple clicks queue scenes in order.
- The XML recording remains in memory for the session.
- The page uses the same VOM -> Preview pipeline as other demos.

## Scheduling Rules (Queueing)
**Deprecated in V3:** replaced by finalize-on-interaction with unbounded clock.
Definitions:
- `now` = current playback time (seconds)
- `safetyMargin` = fixed buffer (default 2.0s to 5.0s; start with 3.0s)
- `lastEnd` = end time of the last scene in the current VOM

When a scene is appended:
```
start = max(lastEnd, now + safetyMargin)
duration = scene duration declared in XML
end = start + duration
```

Notes:
- This guarantees that rapid clicks queue sequentially.
- Scenes already in the past are never modified.
- If the live VOM is empty, start at `now + safetyMargin` or `0s` (consistent choice, document in code).

## Recording Model (XML)
Recording is the **full `.babulus.xml` document** in memory:
- New scenes are appended to the `<video>` root.
- XML serves as the canonical recording.
- For the demo, the XML string can be copied as a complete "recording."

Future optimization (not required in initial pass):
- Move past scenes into a separate "recording store" (append-only XML).
- Drop past scenes from the live VOM to avoid long-running memory growth.
- Rebuild full recording by concatenating stored XML + current future buffer.

## Player Changes Required
The existing PreviewPlayer should be extended for live mode:
- `loop` should be optional (default stays true; live mode sets false).
- Preserve current time when script changes (do **not** reset time to 0).
- Provide a time callback for scheduling:
  - `onTimeUpdate(currentTimeSec, durationSec)` or similar.

These changes should be backwards-compatible for existing demos.

## Data Flow (Live)
1. User clicks a layout button.
2. Live controller:
   - Builds a new `<scene>` XML snippet (with declared duration).
   - Appends to the XML recording.
   - Re-evaluates the VOM and updates the preview.
3. Preview:
   - Uses current playback time from player.
   - Scene appears when `frame` reaches its scheduled `start`.

## XML Templates (Initial Buttons)
Templates should be minimal and reuse existing component tags.
Each template must include:
- `scene` with unique `id`
- At least one `cue` (required by current parser)
- A component tag that matches existing components

Example pattern:
```
<scene id="scene-001" start="..." duration="5s">
  <cue id="cue-001">
    <voice>Short narration or placeholder</voice>
  </cue>
  <title-slide title="..." subtitle="..." />
</scene>
```

## Acceptance Criteria
- `/translations` shows the Live page (no old translation content).
- The player runs continuously without user controls.
- Clicking buttons appends scenes that play in order.
- Multiple rapid clicks queue scenes correctly.
- XML recording can be copied as a full `.babulus.xml`.
- Existing non-live demos remain unaffected.

## Implementation Checklist (Contractor)
1. Update `docs/vom-xml-plan.md` with this Live Mode section (this doc).
2. Modify `PreviewPlayer` to support:
   - `loop={false}`
   - preserve time on script changes
   - `onTimeUpdate` callback
3. Update `VOMPreviewPlayer` to pass through the new props.
4. Replace `/translations` page with the Live page UI and logic.
5. Create 4 XML scene templates and append logic.
6. Ensure XML recording can be copied (optional but recommended).
5. Store resolved values into `SceneSpec.time`, `LayerSpec.timing`, `ComponentSpec.timing`.

---

# Attribute Coercion Rules

1. `props`, `styles`, `markup` are parsed as JSON strings.
2. Boolean literals: `true`, `false`.
3. Number literals: integer or float.
4. Timing attributes: always parse as timing expressions.
   - `start`, `end`, `duration`, `poster`, `trim-end`
   - pause attrs: `seconds`, `mean`, `std`, `min`, `max`
5. Fallback: keep as string.

Reserved attributes for components: `id`, `start`, `end`, `duration`, `visible`, `z`, `styles`, `markup`.

---

# XML -> CompositionSpec Adapter (Logic)

## Inputs
- XML string
- DOM parser output

## Steps
1. Parse `<video>` attributes -> `CompositionSpec` meta.
2. Parse each `<scene>` -> `SceneSpec`.
3. Parse `<cue>` children -> `CueSpec` with segments and bullets.
4. Parse `<layer>` children -> `LayerSpec` with components.
5. Parse unknown tags -> `ComponentSpec`.
6. Resolve timing expressions and fill timing fields.
7. Validate required IDs and uniqueness.

## Validation Rules
- `video.id` required.
- `scene.id` required.
- `cue.id` required and unique across file.
- At least one `<cue>` per `<scene>`.

---

# Patch Protocol (Streaming VOM Updates)

## Patch Operations
- `appendNode(parentId, nodeXml, index?)`
- `removeNode(nodeId)`
- `setAttr(nodeId, name, value)`
- `setText(nodeId, textContent)`
- `replaceSubtree(nodeId, nodeXml)`
- `sealScene(sceneId)`

## Sealing Convention
- `sealScene(sceneId)` sets `sealed="true"` on the `<scene>` element.
- Patches targeting nodes inside a sealed scene must be rejected.

## Safety Margin Rules
- Past: immutable.
- Present window (e.g., next 2-5s): sealed.
- Future buffer: editable.

Edits are rejected if they target sealed scenes or replace subtrees inside the safety margin.

## Stable IDs
- Nodes that can be patched must have stable `id` values.
- Slot-based updates should be `setAttr` on existing nodes, not subtree replacement.

## Evaluation
- Patches mutate the DOM tree (VOM).
- Adapter re-derives `CompositionSpec` or `ScriptData` after patch.
- Renderer stays deterministic because `frame` is the only time input.

---

# Migration Plan (Incremental)

## Phase 1: XML Authoring + Adapter
- Add `.babulus.xml` loader in `src/dsl/load.ts`.
- Parse XML -> `CompositionSpec`.
- Update browser preview path to parse XML (DOMParser).
- No renderer changes.

## Phase 2: Timing Grammar
- Implement expression parser + resolver.
- Populate timing fields (`SceneSpec.time`, `LayerSpec.timing`, `ComponentSpec.timing`).

## Phase 3: DOM-as-VOM + Patching
- Treat parsed DOM as canonical VOM.
- Implement patch protocol and safety-margin rules.
- Apply patches during playback by updating DOM, then re-deriving render data.

## Phase 4 (Optional): Direct DOM Rendering
- Render directly from DOM nodes to React.
- Bypass `CompositionSpec` adapter if desired.

---

# Open Questions
- Should timing resolve internally to frames or seconds (both are possible; choose one for consistency)?
- How strict should validation be for missing refs (error vs placeholder)?
- Whether to allow custom component tags inside `<cue>` or `<voice>`.
- Whether to support multiple `<video>` compositions per XML file.

---

# V3 Architecture Reset (Breaking, Single-Path)

This section **supersedes** V0/V1/V2 wherever there is a conflict.
The legacy timing model is removed. There is one model: **time is a layout axis**.

## Purpose (Reset)
Make the system behave like a browser DOM with a time axis:
- Temporal layout is computed by reflow from children.
- Live mode is an unbounded clock (it never stops).
- Edits to visible nodes update immediately (DOM mental model).
- Events are named actions, not inline JS.

## Glossary (Read First)
- **VOM**: DOM-like tree with time as a layout axis.
- **Temporal Layout Pass**: resolves start/end/duration from children (like CSS reflow).
- **Open-ended**: no end/duration; only legal in **Live Mode**.
- **Live Mode**: unbounded clock; playback never stops.
- **Recording**: XML with explicit durations finalized from a live session.

## Invariants (Must Not Break)
1. If `duration/end` is missing, compute from children.
2. `sequence` = sum of child durations.
3. `stack` = max of child durations.
4. Open-ended durations allowed **only** in live mode.
5. Renderer output is a pure function of `(VOM, frame)`.
6. Cues are **audio markers**, not visual layout primitives.

## Temporal Layout Engine (Core)
The engine runs a temporal layout pass that resolves timing for each node.

### Conceptual Node Shape
```
TemporalNode {
  id: string
  start?: number
  end?: number
  duration?: number
  flow?: "sequence" | "stack"
  children?: TemporalNode[]
  intrinsicDuration?: number | null
}
```

### Resolution Rules
- If `duration/end` is explicit -> respect it.
- Else if children exist -> compute from children.
- Else if intrinsic duration exists -> use it.
- Else -> duration = 0 (unless open-ended is declared for live mode).

### Container Rules
- `<sequence>`: children laid out back-to-back.
  - duration = sum of children.
  - child start = previous child end.
- `<stack>`: children parallel.
  - duration = max of children.
  - child start = container start (unless overridden).

### Visual vs Audio Tracks
Scene duration is computed as:
```
scene.duration = max(visualTrack.duration, audioTrack.duration)
```
Visual track comes from temporal layout of layers/components.
Audio track comes from cues + audio clips (existing pipeline).

## Open-Ended Durations
Open-ended means `end` and `duration` are absent.
Allowed **only** in live mode.
Export must error if any open-ended durations remain.

## Live Mode (Unbounded Clock)
Live mode is the default mental model:
- Clock never stops (no clamping to duration).
- If the active scene is open-ended, it stays visible indefinitely.
- User actions finalize the current scene and queue the next.

### Finalize on Interaction
When a user adds a new scene at time `now`:
```
current.end = now + buffer
new.start = current.end
```
Default buffer: `0.35s`.

### Finalize on Recording Export
When "Copy XML" is triggered:
- Finalize the current open-ended scene at `now + buffer`.
- XML becomes deterministic and replayable.

## Containers and Tag Semantics (Breaking)
New temporal containers:
- `<sequence>`: sequential time flow.
- `<stack>`: parallel time flow.

Allowed placement:
- Inside `<scene>` and `<layer>`.

Scene rules:
- `<scene>` is a temporal container (not special-cased).
- **Cues are optional** in scenes.
- Scenes do not require at least one cue.

## Events (No Inline JS)
Events use named actions:
- XML emits `action:<name>` events.
- Components register handlers by name.
- Events can be **targeted** (`targetId`) or **broadcast** (active scene).

## Cascading Styles and Markup
Cascade extends to temporal containers:
```
scene -> layer -> sequence/stack -> component
```
Same merge rules as styles/markup today.

## Time Tokens (CSS-style)
Time values can reference variables:
```
<video vars='{"--beat":"0.5s","--bar":"2s"}'>
  <sequence duration="var(--bar)" />
</video>
```
Time tokens live in styles vars and are resolved during temporal layout.

## Live DOM Edits
- Patches to visible nodes update immediately.
- Patches to future nodes do not render until time reaches them.
- Past nodes are immutable unless explicitly overridden.

## Renderer Contract
Renderer remains stateless:
```
render(frame, VOM) -> visual output
```
No hidden timers. No internal time state.

---

# Developer Docs: Live VOM & Temporal Layout (Test Bed)

Create a new Developer Reference doc page:
- Title: "Live VOM & Temporal Layout"
- Slug: `/docs/live-vom`
- Category: "Developer Reference"

This page is both documentation and a verification test bed.

## Demo Policy
- Only the **first** demo auto-plays.
- All others are user-initiated.

## Demos (Full Set)
1. **Temporal Reflow (Auto Duration)** - sequence of timed blocks with no scene duration.
2. **Sequence vs Stack** - serial vs parallel time flow.
3. **Live Open-Ended Scene** - clock never stops; cut on button press.
4. **Live DOM Edits** - change visible text and see instant updates.
5. **Named Events** - broadcast/targeted action triggers component behavior.
6. **Multi-Screen Sync** - shared clock across multiple players.

## Multi-Screen Sync Use Cases
- Multi-zone dashboards with synchronized playback.
- Multi-screen installations and remote signage.
- Collaborative demos where separate players share a timeline.

---

# Implementation Surface Map (Where to Touch)
- `apps/studio-web/lib/dsl-executor.ts` (XML parsing)
- `src/dsl/xml.ts` (server XML parsing)
- `packages/shared/src/dsl-to-script.ts` (placeholder timing -> must respect temporal layout)
- `packages/shared/src/video.ts` (active scene handling with open-ended end)
- `apps/studio-web/components/preview-player.tsx` (unbounded clock)

---

# Definition of Done (DoD)
1. Live clock never stops (no duration clamp).
2. Open-ended scenes remain visible until finalized.
3. Export errors if any open-ended durations remain.
4. Sequence/stack demos show correct auto sizing.
5. Named events fire deterministically.
6. Console remains clean.

---

# Failure Mode Checklist (Review Gate)

| Failure | Symptom | Root Cause | Fix |
|---|---|---|---|
| Temporal reflow lies | Scene duration wrong | Child timing ignored | Fix layout pass |
| Open-ended leaks to export | Render hangs or clamps | No validation | Add export checks |
| Clock stops | Time freezes at end | Duration clamp | Unbounded clock |
| Circular timing | Infinite update loop | Parent/child dependency | Detect cycles |
| Patch order drift | Visual jumps | Update ordering | Serialize patches |
| Live edits not immediate | Update delayed | Active scene not updated | Apply immediately |
| Fake sync | Multi-player drift | Separate clocks | Shared clock source |
| Perf collapse | Docs page slow | Too many autoplay/loops | Autoplay only first |
| Event nondeterminism | Replay differs | Hidden local state | Use action bus only |
| Conflicting semantics | Confusion | Multiple models | Single-path only |

---

# Build Order (For Junior Agent)
1. Temporal layout engine (core).
2. XML parser support for sequence/stack.
3. Renderer open-ended handling.
4. Live clock + finalize logic.
5. Developer docs demos + verification.

---

# Non-Goals (Explicit)
- No inline JS in XML.
- No JIT audio generation in live mode.
- No dual legacy timing modes.
