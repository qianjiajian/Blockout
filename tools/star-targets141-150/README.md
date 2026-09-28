# 141–150 scoring-only formal Pointer verification

This tool is bound to reviewed v1.78 and the two independently pinned before archives. It never changes a level, gameplay runtime, candidate, proof, player save, or clock. It does not run difficulty search.

From the repository root:

```powershell
$env:REMAKE_VIEWPORT_WIDTH='496'
$env:REMAKE_VIEWPORT_HEIGHT='1078'
node tools/star-targets141-150/playtest.mjs deliverables/star-targets141-150-20260927/before-write.json cf88fae881e5c79e138c655c49ace299d654f9adfb9bdf5c4a95077588c9440b deliverables/star-targets141-150-20260927/agent-c/concurrent-before-pointer.json a706664c646604198bbc8737a8b28dfc9568660f75afcec0dc64da555c3a9320
```

Repeat with viewport `360` × `780` in a separate process. Only these two viewport pairs are accepted. Set `STAR_TARGETS_PREFLIGHT_ONLY=1` for the short static and full-route preflight; remove that environment setting for real Pointer verification. Preflight is explicitly not a Pointer or natural-clock PASS.

Each fresh MemoryHost starts with empty bestStars/bestMoves and no native Storage or IndexedDB access. Every route is performed using the real canvas pointer and normal animation waits. The result must display the exact new total-drag target and retained time target, render three active stars, report three earned stars, and store bestStars=3 and bestMoves=the current full route length.

The current model independently replays every observed input, natural tick, and deferred exit-animation callback, including exact bomb values and flip-door changes. Spatial prefixes contain real bomb-bearing inventory; only their changing bomb deadline values are normalized for the spatial comparison. Neither clock nor delayed callbacks are skipped in the separate whole-model replay.

Before input, all 200 objects and the whole fixture are compared with the immediate before-write archive: exactly nine preservedMoveTarget changes and no additional change to142. The archive's predecessor chain separately preserves the already reviewed concurrent139 adoption. The optional supplement above accepts only the exact concurrent9 module and wiring already reviewed under v1.77, verifies the old wiring hash after removing precisely that addition, and verifies836 unchanged existing runtime/art files. It never accepts other unrelated changes by ID alone. Source/proof references and art/runtime bytes are pinned. During input, only strictly parsed disjoint JSON modules and exact appended disjoint data wiring can be accepted; any runtime/art/rule/tool drift fails. Any new active rule requires a separate concrete review.

Reports, screenshots, timing logs, and a byte-pinned input snapshot are written beneath `deliverables/star-targets141-150-20260927/agent-c/pointer-*`. Run `node tools/star-targets141-150/selfcheck.mjs` to exercise scoring boundaries and rejection cases without a browser.
