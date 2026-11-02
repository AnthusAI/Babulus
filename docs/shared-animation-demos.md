# Shared animation demo aliases

The established component names AnimeHarnessDemo, ThreeOrbit, LottieBadge, D3BarChart, P5Particles, TextEffects, and MixAndMatchDemo are compatibility aliases to the shared `@videoml/stdlib/demos` implementations for one minor release. The mixed demo also uses the shared FramerMotionDemo component. The neutral Lottie badge replaces an animation asset with unverified rights; callers may supply their own local, licensed animation data.

This migration requires packed package and browser conformance review before it is considered complete.

During development, Babulus consumes the same immutable `vendor/videoml/videoml-stdlib-0.0.0.tgz` in the renderer, Studio Web, and the legacy player package. The archive is produced from the VideoML stdlib source; its accompanying manifest records the source revision and SHA-256, and its package retains applicable notices. Refresh the archive and manifest together before regenerating the lockfile. Publishing a versioned stdlib release is separate work.

The existing published `@videoml/player@1.0.0` dependency separately installs its own nested `@videoml/stdlib@0.0.0-semantic-release`. The migrated Babulus demo aliases resolve the vendored archive; the player's transitive dependency is unchanged and requires a separate player migration before there can be one stdlib package instance across the entire application.
