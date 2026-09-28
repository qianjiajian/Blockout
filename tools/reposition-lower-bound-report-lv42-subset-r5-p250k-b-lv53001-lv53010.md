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
| Lv53001 | 9 | floor_disproven_counterexample | — | 50,509 | bounded_dfs_counterexample | — | compatible | no |
| Lv53002 | 9 | floor_disproven_counterexample | — | 97,364 | bounded_dfs_counterexample | — | compatible | no |
| Lv53003 | 9 | floor_disproven_counterexample | — | 65,171 | bounded_dfs_counterexample | — | compatible | no |
| Lv53004 | 9 | floor_disproven_counterexample | — | 62,955 | bounded_dfs_counterexample | — | compatible | no |
| Lv53005 | 9 | floor_disproven_counterexample | — | 71,815 | bounded_dfs_counterexample | — | compatible | no |
| Lv53006 | 9 | floor_disproven_counterexample | — | 104,960 | bounded_dfs_counterexample | — | compatible | no |
| Lv53007 | 9 | floor_disproven_counterexample | — | 126,751 | bounded_dfs_counterexample | — | compatible | no |
| Lv53008 | 9 | floor_disproven_counterexample | — | 113,880 | bounded_dfs_counterexample | — | compatible | no |
| Lv53009 | 9 | floor_disproven_counterexample | — | 64,872 | bounded_dfs_counterexample | — | compatible | no |
| Lv53010 | 9 | floor_disproven_counterexample | — | 67,966 | bounded_dfs_counterexample | — | compatible | no |

## Interpretation

A replayed high-overhead route is only an upper bound. The target is guaranteed only when the 0-1 search exhausts every state below that target and an independently replayed completion route proves the level is playable. `inconclusive_state_cap` means exactly that: increase the cap or redesign the candidate; it is never evidence that the floor passed.

- Input SHA-256: `745AA2250B8A4A122913143D77B4DBD48F173A4A9B8C74E92265AA7A58EFAB61`
- levelSolver.ts SHA-256: `5014CD308E500EF9CAECEA5024135E7919E8CF5AAB307222611600FCFEF96A13`
