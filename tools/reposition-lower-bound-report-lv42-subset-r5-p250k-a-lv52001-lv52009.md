# Necessary reposition lower-bound proof

> Prototype evidence only. No production level, test, tool, or freeze source is modified.

- Proof algorithm: bounded-dfs
- Proof cap: 250,000 states per level
- RSS guard: 900 MB
- Official cross-check: disabled
- Continue after reaching target: no
- Symmetry reduction: enabled
- Relaxed parking bound: disabled

| Level | Target OH | 0-1 result | Exact min OH | States | Replayed witness | Official min OH | Cross-check | Publishable floor |
|---:|---:|---|---:|---:|---|---:|---|---|
| Lv52001 | 9 | floor_disproven_counterexample | — | 100,432 | bounded_dfs_counterexample | — | compatible | no |
| Lv52002 | 9 | floor_disproven_counterexample | — | 54,031 | bounded_dfs_counterexample | — | compatible | no |
| Lv52003 | 9 | floor_disproven_counterexample | — | 54,642 | bounded_dfs_counterexample | — | compatible | no |
| Lv52004 | 9 | floor_disproven_counterexample | — | 51,662 | bounded_dfs_counterexample | — | compatible | no |
| Lv52005 | 9 | floor_disproven_counterexample | — | 54,118 | bounded_dfs_counterexample | — | compatible | no |
| Lv52006 | 9 | floor_disproven_counterexample | — | 62,770 | bounded_dfs_counterexample | — | compatible | no |
| Lv52007 | 9 | floor_disproven_counterexample | — | 53,633 | bounded_dfs_counterexample | — | compatible | no |
| Lv52008 | 9 | floor_disproven_counterexample | — | 68,898 | bounded_dfs_counterexample | — | compatible | no |
| Lv52009 | 9 | floor_disproven_counterexample | — | 78,962 | bounded_dfs_counterexample | — | compatible | no |

## Interpretation

A replayed high-overhead route is only an upper bound. The target is guaranteed only when the 0-1 search exhausts every state below that target and an independently replayed completion route proves the level is playable. `inconclusive_state_cap` means exactly that: increase the cap or redesign the candidate; it is never evidence that the floor passed.

- Input SHA-256: `34B745B9A8AA946F626FA427470F59B310B32A53A7212E19485C05EFB227FC6A`
- levelSolver.ts SHA-256: `5014CD308E500EF9CAECEA5024135E7919E8CF5AAB307222611600FCFEF96A13`
