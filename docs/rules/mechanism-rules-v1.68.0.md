# Block Out! mechanism rules v1.68.0

- Rule ID: `blockout-rules-v1.68.0`
- Runtime profile: `revised-2026-09-23-v1.4`
- Frozen on: 2026-09-26
- Inherits every rule in `mechanism-rules-v1.67.0.md`; this document records the user-authorized frozen-exit rendering change.

## User-authorized scope

The user requested that frozen exits no longer use a translucent ice overlay. Keep all level data, exit colors and matching rules, frozen counters, numeric ice blocks, collision behavior, animation timing, saves and other UI unchanged.

## Frozen-exit rendering

For a static frozen exit (`frozen > 0`), render the formal ice face with `overlayAlpha: 1` instead of the previous `0.54`. Keep the colored gate frame at its existing dimmed `baseAlpha: 0.38` so the gate outline and star frame remain present, while the ice face does not show the underlying gate color through its opaque center. Preserve the native transparent edge pixels of the supplied ice assets.

This is a visual-only change. The eight gate colors, frozen counter semantics, matching behavior and numeric ice-block treatment are not changed. Ice-fracture fade during the unlock animation remains an intentional transition effect.

## Evidence boundary

The static visual change is covered by `tests/availabilityVisuals.test.ts`, the frozen-counter regression, TypeScript compilation, and a Level 77 browser screenshot showing adjacent frozen counters 8 and 15 with the same opaque ice treatment. This does not certify a mobile WeChat build or upload.

## Release boundary

The change is integrated into the TypeScript renderer only. It does not rebuild, upload or publish the WeChat package unless the user separately requests that operation.
