# Babulus Language Design (Draft)

**Status:** Draft (2026-01-22)  
**Goal:** Define a single, elegant, expressive DSL for video creation that is poetic to write, deterministic to run, and safe to execute in a multi-tenant SaaS.

---

## 1) The North Star: Code Poetry + Determinism

Babulus should read like a script you can run:

- **Narration-first**: audio drives timing.
- **Visuals as functions of time**: render is pure and reproducible.
- **One authoring model**: a single `.babulus.ts` module per video.
- **No boilerplate**: the harness injects imports, templates, and runtime glue.
- **Safe execution**: all external access is explicit and metered.
- **Forward-only evolution**: no legacy compatibility; breaking changes are allowed.

---

## 2) Canonical File Shape (One Way Only)

Every Babulus file is a TypeScript module with a single entrypoint:

```ts
export default defineVideo(async (ctx) => {
  return video("intro")
    .composition({ fps: 30, size: "1080p" })
    .scene("title", (s) =>
      s.cue("hook", say("In this video, we’ll build an agent."))
    )
    .publish({ slug: "intro", page: { title: "Intro" } });
});
```

**Why this shape:**

- Gives us imperative power (data fetching, logic) while remaining a single, consistent pattern.
- Forces all external access through `ctx`, which we can meter, audit, and sandbox.
- Always resolves to a **serializable manifest** used by preview/render.

---

## 3) The “Beautiful Core” Primitives

### 3.1 Story primitives (poetic, minimal)

- `video(id)` → creates a new video draft.
- `scene(id, builder)` → a chapter in the story.
- `cue(id, content)` → a moment within a scene.
- `say(text)` → narration line (audio-driven timing).
- `pause(seconds)` → silence or breath.
- `beat(label?)` → a semantic marker for visuals/animations.

**Principle:** the DSL should read like a script and a storyboard at the same time.

### 3.2 Visual binding

- `scene(id).component("TitleScene")` → bridge to the visual template pack.
- `scene(id).props({ ... })` → serializable props only.
- Component IDs are allowlisted and resolved by the harness.

### 3.3 Audio primitives

- `sfx(id).at("+0.2s")`
- `music(prompt).fadeIn("1s").fadeOut("2s")`

Audio remains first-class and drives time.

---

## 4) Imperative Power Without Chaos

### 4.1 Controlled data access

All side effects go through `ctx`:

```ts
const headline = await ctx.sources.httpText({ url, cache: "1h" });
const image = await ctx.media.image.generate({ prompt });
```

This enables:

- Usage/cost telemetry for every call.
- Capability gating by tenant, plan, and environment.
- Snapshotting external inputs for reproducibility.

### 4.2 Determinism boundary

The resolver (this file) runs once and produces a **resolved manifest**:

- Preview + render consume the manifest, not the resolver.
- Approved outputs remain stable even if external data changes.

---

## 5) A Manifest That Stays Simple

The resolved manifest is pure data:

```ts
{
  id,
  template: { id, version },
  composition: { fps, width, height, durationFrames? },
  storyboard: { scenes: [...] },
  audio: { timeline: [...] },
  publish: { ... }
}
```

This keeps rendering predictable and enables caching, diffing, and auditing.

---

## 6) Agent-Friendly Semantics

Agents should treat a video as a structured artifact, not a black box:

- Explicit scene/cue IDs for traceability.
- Semantic labels (`beat`, `goal`, `approval`) for collaboration.
- Clear boundaries between content, visuals, and publishing metadata.

This makes it easy for agents to propose edits and for humans to approve them.

---

## 7) Elegance Through Constraints

We intentionally limit what can happen inside `.babulus.ts`:

- No user imports.
- No direct network/filesystem access.
- No runtime state leaks into render.

These constraints buy:

- Predictable behavior.
- Safer execution in a SaaS.
- Cleaner mental model for authors and agents.

---

## 8) Extensibility Without Chaos

Extensibility comes from **capabilities**, not arbitrary dependencies:

- `ctx.sources.*` (data)
- `ctx.media.*` (image/audio/video generation)
- `ctx.publish.*` (YouTube, X, web)

Each capability is:

- versioned,
- metered,
- documented,
- sandboxed.

---

## 9) The Aesthetic We’re After

**Babulus should feel like:**

- Writing a script.
- Sketching a storyboard.
- Calling a small, elegant standard library.

**Babulus should not feel like:**

- Wiring a build system.
- Hand-editing a timeline.
- Wrestling with SDK imports.

---

## 10) Open Design Questions (Language-Only)

### 10.1 Minimal primitives (80% coverage)

Suggested baseline:

- `video()`, `scene()`, `cue()`, `say()`, `pause()`, `beat()`
- `scene().component(id)` + `scene().props()` for visuals
- `sfx()` and `music()` for audio

Everything else should be composable sugar built on top of these.

### 10.2 Builder API elegance vs framework sprawl

Guidelines:

- Prefer **small, fluent builders** over a sprawling class hierarchy.
- Keep the DSL surface minimal; add “packs” via `ctx` capabilities instead of new syntax.
- Avoid introducing a second language inside the language (no mini-DSLs for timing or animations).

### 10.3 Agent intent without clutter

Add a lightweight **semantic markup** system that can be attached to cues/scenes:

- `cue(...).markup({ goal: "hook", audience: "devs", approval: "required" })`
- Markup is **optional**, serializable, and ignored by rendering.
- Agents use markup for planning, review, and automation.

### 10.4 Semantic markup (explicitly supported)

Yes — include semantic markup as a first-class feature. It’s a low-risk, high-leverage way to:

- guide agents (intent, priorities, approvals),
- improve search/discovery,
- drive publishing automation (CTA, channel, audience).
