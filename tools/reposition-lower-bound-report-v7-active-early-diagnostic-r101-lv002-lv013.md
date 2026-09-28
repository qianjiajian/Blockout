# Necessary reposition lower-bound proof

> Prototype evidence only. No production level, test, tool, or freeze source is modified.

- Proof algorithm: bounded-dfs
- Proof cap: 500,000 states per level
- RSS guard: 900 MB
- Official cross-check: disabled
- Continue after reaching target: no
- Symmetry reduction: enabled
- Relaxed parking bound: disabled

| Level | Target OH | 0-1 result | Exact min OH | States | Replayed witness | Official min OH | Cross-check | Publishable floor |
|---:|---:|---|---:|---:|---|---:|---|---|
| Lv002 | 2 | floor_lower_bound_proven_minimum_inconclusive | — | 8 | solveLevelForValidation | — | compatible | yes |
| Lv003 | 1 | floor_lower_bound_proven_minimum_inconclusive | — | 2 | solveLevelForValidation | — | compatible | yes |
| Lv004 | 5 | floor_lower_bound_proven_minimum_inconclusive | — | 7 | solveLevelForValidation | — | compatible | yes |
| Lv005 | 5 | floor_lower_bound_proven_minimum_inconclusive | — | 64 | solveLevelForValidation | — | compatible | yes |
| Lv006 | 5 | floor_lower_bound_proven_minimum_inconclusive | — | 299 | solveLevelForValidation | — | compatible | yes |
| Lv007 | 6 | floor_lower_bound_proven_minimum_inconclusive | — | 5,989 | solveLevelForValidation | — | compatible | yes |
| Lv008 | 7 | floor_lower_bound_proven_minimum_inconclusive | — | 94,915 | solveLevelForValidation | — | compatible | yes |
| Lv009 | 8 | floor_lower_bound_proven_minimum_inconclusive | — | 647 | solveLevelForValidation | — | compatible | yes |
| Lv010 | 10 | floor_lower_bound_proven_minimum_inconclusive | — | 1,424 | solveLevelForValidation | — | compatible | yes |
| Lv011 | 6 | floor_lower_bound_proven_minimum_inconclusive | — | 532 | solveLevelForValidation | — | compatible | yes |
| Lv012 | 7 | floor_lower_bound_proven_minimum_inconclusive | — | 2,177 | solveLevelForValidation | — | compatible | yes |
| Lv013 | 8 | floor_lower_bound_proven_minimum_inconclusive | — | 6,372 | solveLevelForValidation | — | compatible | yes |

## Interpretation

A replayed high-overhead route is only an upper bound. The target is guaranteed only when the 0-1 search exhausts every state below that target and an independently replayed completion route proves the level is playable. `inconclusive_state_cap` means exactly that: increase the cap or redesign the candidate; it is never evidence that the floor passed.

- Input SHA-256: `74F1201772E540928EBE7C2731DDDD24312FA47BE6BBFA80862A5F80344E38E6`
- levelSolver.ts SHA-256: `5014CD308E500EF9CAECEA5024135E7919E8CF5AAB307222611600FCFEF96A13`
