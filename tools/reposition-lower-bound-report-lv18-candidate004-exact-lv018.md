# Necessary reposition lower-bound proof

> Prototype evidence only. No production level, test, tool, or freeze source is modified.

- Proof algorithm: bounded-dfs
- Proof cap: 500,000 states per level
- RSS guard: 1,000 MB
- Official cross-check: disabled
- Continue after reaching target: yes
- Symmetry reduction: enabled
- Relaxed parking bound: disabled

| Level | Target OH | 0-1 result | Exact min OH | States | Replayed witness | Official min OH | Cross-check | Publishable floor |
|---:|---:|---|---:|---:|---|---:|---|---|
| Lv018 | 10 | no_solution_in_complete_levelsolver_graph | — | 8,648 | — | — | compatible | no |

## Interpretation

A replayed high-overhead route is only an upper bound. The target is guaranteed only when the 0-1 search exhausts every state below that target and an independently replayed completion route proves the level is playable. `inconclusive_state_cap` means exactly that: increase the cap or redesign the candidate; it is never evidence that the floor passed.

- Input SHA-256: `4F120AD314C1785F1A9A60BDB88A0BB99DA46EAF064289E11F47F1C478D37EDF`
- levelSolver.ts SHA-256: `5014CD308E500EF9CAECEA5024135E7919E8CF5AAB307222611600FCFEF96A13`
