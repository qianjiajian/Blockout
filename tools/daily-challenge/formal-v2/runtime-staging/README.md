# Schema2 runtime staging

These files are prepared for the complete 450-slot `emit-catalog.mjs` output.
They have not replaced `src/core/dailyChallenge.ts` or the production catalogue.
The two minimal start/restart preflight branches in `ColorEscapeGame.ts` are
already applied; their missing-clone tests pass in the current application.

Deployment mapping after the full catalogue is emitted and its objects are
finalized:

| Staged file | Target |
|---|---|
| dailyChallenge.ts | src/core/dailyChallenge.ts |
| dailyChallenge.test.ts | tests/dailyChallenge.test.ts |
| dailyChallengeRegistryFailures.test.ts | tests/dailyChallengeRegistryFailures.test.ts |
| dailyChallengeBlockArt.test.ts | tests/dailyChallengeBlockArt.test.ts |

The runtime uses the generated schema2 candidate and deep-clone getters. It
compares formal ID, source ID, full level SHA and catalogue revision, checks
same-object proof metadata and the applicable L/U band, enforces stable slot
order and the stage's actual unlocked mechanisms, and returns empty production
pools on a missing or invalid bucket. The emitter remains the full 450-slot,
current-toolchain and global-partition admission gate; runtime never falls
back from that registry to campaign candidates.

The emitted module is recursively frozen. Its getter's clone is returned
unchanged: no derive, reward/par/target rewrite, or source substitution occurs.
The final all-450 test recomputes recursive canonical full-object SHA with Node
crypto; runtime lookup compares against the trusted frozen build metadata and
does not add a separate browser SHA implementation.

Catalogue revision is a content correction separate from daily selection.
Reconciliation migrates old version2/no-revision pools to the corrected current
catalogue while preserving locked stage, selected stable slot indices, player
seed, day/rollback keys, attempts, last-attempt time, completed and rewarded.
Repeat reconciliation is idempotent; the historical version1 quota conversion
still happens only once. Custom `levels` arrays remain explicit pending test
fixtures with minimumRepositionMoves=0 and cannot pass any difficulty band from
source labels or scoring targets.

Validation already run:

- Current application TypeScript check passed.
- `tests/dailyChallengeStartValidation.test.ts`: 2/2 passed using actual methods
  and an undefined clone, with no host/storage access; consume/save/load are
  never called and current save/journal remain unchanged.
- `node tools/daily-challenge/formal-v2/runtime-staging/typecheck-staged.mjs`
  passed for the prospective schema2 runtime and future tests using an in-memory
  typed empty catalogue placeholder. This is type checking, not formal
  catalogue execution or evidence that a partial catalogue is playable.

After all files are adopted, run TypeScript and the daily core, start validation,
registry failure and block-art tests. Rebind/fresh-verify all 450 objects against
the final tool SHA, then perform the planned formal Pointer/natural-clock gates.
The former production tests' derive/seam expectations are replaced; their
explicit historical adapter unit fixtures remain labelled historical.

`ColorEscapeGame.ts` SHA after the minimal preflight patch:
`0eb3c5ff8daee63e1ee9f38ffc8a6da0f8307dbdef2f83dfbfd0a4cfb0797e60`.
It is bound by the proof toolchain, so older tool digests need final requalification.
