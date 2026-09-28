# 81–90 scoring verification

Task-local runner for only the reviewed scoring changes. Historical fixture,
candidate maps and lower-bound evidence are not edited or recertified.

`prepare.mjs` derives the real Pointer/natural-time loop from the reviewed
51–60 runner. `verification.mjs` pins the pre-change 200-level baseline and
requires only the approved move targets to differ. The reviewed total-drag
targets are 81:38, 83:56, 85:33, 87:50 and 88:54; time targets are unchanged.

The browser loads the actual final LEVELS object, uses an isolated volatile
MemoryHost, bans persistent save APIs, and records all natural model ticks and
deferred exit callbacks. A second current PuzzleModel replays every observed
event. Each changed level requires the exact rendered target text, three active
star sprites, stored bestStars=3, exact bestMoves, native unrotated sprites,
complete play without boosters and no snapshot/source drift.

Run `selfcheck.mjs` after the final witness is recorded, then call
`playtest.mjs BEFORE BEFORE_SHA RULE_VERSION RULE_SHA WITNESSES WITNESS_SHA`
with `REMAKE_VIEWPORT_WIDTH/HEIGHT` 320/568 and 496/1078. Preflight uses
`STAR_TARGETS_PREFLIGHT_ONLY=1` and does not claim Pointer or time validation.
