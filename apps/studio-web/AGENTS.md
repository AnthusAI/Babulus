# Babulus Studio Web (apps/studio-web)

This app is a Next.js 14 UI for previewing and managing VideoML/VML projects.

## VideoML vs Babulus Responsibilities (Read First)

The VideoML (VML) ecosystem is being split into separate public projects. This repo still contains
Babulus-specific pieces (backend, product UI, and some rendering/generation plumbing), but core VideoML
functionality may live outside this repo.

### VideoML projects (source of truth)

These are typically checked out next to Babulus at `~/Projects/VideoML/*`:
- `~/Projects/VideoML/player` - `@videoml/player` (XML parsing + DOM runtime/web player)
- `~/Projects/VideoML/stdlib` - `@videoml/stdlib` (standard library: tokens + DOM components)
- `~/Projects/VideoML/toolchain` - `@videoml/toolchain` (core compilation/generation/render primitives)
- `~/Projects/VideoML/cli` - `@videoml/cli` (`vml` CLI wrapper)

If you need to change the player, standard library components/tokens, or VML parsing, look there first.

### How this app consumes VideoML (local dev)

This app currently uses local checkouts (not npm) for faster iteration:
- `apps/studio-web/package.json` uses `file:../../../VideoML/player` and `file:../../../VideoML/stdlib`
- `apps/studio-web/next.config.mjs` aliases `@videoml/*` to `../../../VideoML/*`
- `apps/studio-web/tsconfig.json` and `apps/studio-web/jest.config.js` map `@videoml/*` to `~/Projects/VideoML/*/src`

If those folders don't exist locally, installs/builds will fail until we switch to npm versions.

## Previewing Stack (Common Debugging)

- `@videoml/player` runs the DOM runtime that makes VML "play" in a browser.
- `@videoml/stdlib/dom` provides the default DOM custom elements used by the player runtime.
- Babulus also has its own renderer (`packages/renderer`) used for Remotion-ish rendering flows.

Symptom -> likely project:
- "VML doesn't animate / doesn't play": `~/Projects/VideoML/player`
- "A component tag renders as a placeholder / looks wrong": `~/Projects/VideoML/stdlib`
- "Generation/audio/cache issues": Babulus core (`src/generate.ts`, `src/providers/*`, cache dirs)

