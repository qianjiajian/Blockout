# Necessary reposition lower-bound proof

> Prototype evidence only. No production level, test, tool, or freeze source is modified.

- Proof algorithm: bounded-dfs
- Proof cap: 1,000,000 states per level
- RSS guard: 900 MB
- Official cross-check: disabled
- Continue after reaching target: no
- Symmetry reduction: enabled
- Relaxed parking bound: disabled

| Level | Target OH | 0-1 result | Exact min OH | States | Replayed witness | Official min OH | Cross-check | Publishable floor |
|---:|---:|---|---:|---:|---|---:|---|---|
| Lv021 | — | inconclusive_memory_cap | — | 1,136 | authored_validation_route | — | compatible | n/a |

## Interpretation

A replayed high-overhead route is only an upper bound. The target is guaranteed only when the 0-1 search exhausts every state below that target and an independently replayed completion route proves the level is playable. `inconclusive_state_cap` means exactly that: increase the cap or redesign the candidate; it is never evidence that the floor passed.

- Input SHA-256: `946D6A59EF904CDABDD43FCE62DF867A42AE1249C1F497F1CDD090DA76AF2B7F`
- levelSolver.ts SHA-256: `5014CD308E500EF9CAECEA5024135E7919E8CF5AAB307222611600FCFEF96A13`
