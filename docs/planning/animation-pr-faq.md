# PR-FAQ - Frame-Driven Animation Architecture

## Press Release

**Babulus Introduces Frame-Driven Animation Architecture**

Today we're launching a unified animation system for Babulus where **every visual element is a pure function of frame**. Instead of juggling time-based animation loops, components render deterministically from a single `frame` parameter--making previews, rendering, and multi-engine synchronization consistent and reliable.

This architecture brings multiple animation paradigms into one frame-synchronized universe:

- **Framer Motion** for layout, orchestration, and motion graphics
- **D3** for data visualization
- **Processing / p5.js** for generative art and special effects
- **Three.js** for 3D scenes and spatial storytelling
- **Lottie (After Effects)** for reusable motion graphic assets
- **Anime.js** for deterministic, frame-driven DOM animation via `seek()`
- **Text Effects** (named effects) built on Anime.js SplitText

All engines render in the same timeline. You can mix and match components from different systems in the same scene, and they stay perfectly synchronized--no hidden clocks, no drift, no surprises.

**Why it matters:**
- **Deterministic previews** you can scrub frame-by-frame
- **Portable rendering** across local, container, and cloud
- **Composable scenes** with multiple animation systems together
- **Cleaner cognitive model**: `render(frame) -> image`

This is the foundation for cinematic, data-rich, and brand-consistent video storytelling--without the complexity of traditional timeline editors.

---

## FAQ

### What does "frame-driven" mean?
Every component renders from a single input: the frame number. There is no global time or independent animation loop. This makes the entire system deterministic and perfectly synchronized.

### Why does determinism matter?
It guarantees that previews are accurate and renders are reproducible. What you review is exactly what gets rendered.

### How do different animation engines coexist?
Each engine is wrapped by a Babulus base class that accepts `frame` and renders the correct state for that frame. This makes all engines share the same timeline.

### What's included in this release?
- Frame-driven base classes for **Canvas**, **p5**, **Three.js**, **D3**, and **Lottie**
- A frame-driven **Anime.js** harness (seek-only, no RAF autoplay)
- High-level **Text Effects** with curated effect names (chars/words/lines), cue-aware start defaults
- Frame-based helpers for Framer Motion-style orchestration
- Demo components for each engine
- An **Animation** docs page with interactive preview demos

### What's explicitly deferred?
- Real-time physics or simulation engines
- Timeline editing UI
- MP4 render outputs in this docs wave

### How do I use these in Babulus?
Use the standard library base classes in custom components, or use the built-in demo components in DSL scenes. Everything is frame-driven by default.

---

## Success Metrics

- Animation docs page is live in `/docs/animation`
- Demo reel preview renders and labels each system
- Each engine demo renders in its own preview mount
- Mix-and-match demo scene works without sync drift
- No CSS animations are used in engine demos

---

## Non-Goals

- No physics engine integration
- No new timeline editor UI
- No MP4 rendering outputs in this wave
- No real-time runtime (all animation is frame-scrubbed)
