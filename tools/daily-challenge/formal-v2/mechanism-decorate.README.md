# Route-aware mechanism decoration

`mechanism-decorate.mjs` exports `decorate(level, drags, stage, options)`.
Its exported `DECORATOR_VERSION` is `daily-route-aware-decoration-v2.6`.
Use the module's actual file SHA in persistent attempted-plan keys so a later
algorithm improvement does not inherit a previous method's failed-attempt key.
It does not mutate the input, write files, certify lower bounds, allocate a
formal slot, or establish partition uniqueness.

```js
import {decorate} from './mechanism-decorate.mjs';
import {loadRuntime, verifyCandidate} from './contract.mjs';
const runtime = await loadRuntime();
const decorated = await decorate(base.level, base.drags, 'layered-lift', {
  runtime, difficulty: 1, sourceLevelId: base.level.id,
  formalId: 'daily-mechanisms-layered-lift-65-d1-01',
  idPrefix: 'lift-d1-01', variant: 0, maxAttempts: 12,
});
if (decorated.ok) {
  const evidence = await verifyCandidate(runtime, decorated, {
    lowerBudget: {maxStates: 150000, maxTransitions: 1000000,
      maxMilliseconds: 15000},
  });
}
```

The stage may be its mechanism name or exact `mechanisms-<name>-<unlock>` key.
The 12 supported decorations are frozen-exit, numeric-ice, axis-block,
key-lock, star, colored-grid, flip-door, bomb, multilayer-shell, shutter,
layered-lift, and generator. `color-exit` passes a plain base through. Irregular
blocks and boards require a genuinely different base; this module does not
invent those geometries.

The finite maximum is 24 plans per call. A compatible route is selected from
actual original moves, clear counts, exit parity, and footprint visits. New
shell layers, lift layers, and both FIFO cargo bodies must be cleared by native
held paths. A generator uses the authoritative center-rail offset and a free
three-rail mouth. The chosen opening body moves away during the middle of the
base route; its first cargo then the differently colored second cargo clear
before the original route resumes. No inventory is silently removed.

`ok` means the returned object passed static audits and a complete native
replay. The output includes actual level/route SHA, trace, spawn/reveal events,
chosen plan, and failed finite attempts. A full `verifyCandidate` call is still
mandatory: shutters can weaken the projected lower bound, every new object
requires fresh lower evidence, and the caller must allocate a globally unique
partition across all 450 slots. A decoration does not make a reused partition
independent. Pointer and natural-clock fields remain false.

Bombs retain their timers and return an explicit controlled schedule with
0.2 seconds per drag, 0.2 per unit step, and 0.4 per completed exit animation.
The contract independently validates this on the unmodified native model with
deferred animation completion. It is simulation evidence, not natural time.

Qualification evidence is in
`deliverables/daily-formal-v2-20261007/mechanism-lab/decorator-certified-v1/`.
The 36 tests use three shared bases only as fixtures: 34 passed fresh static,
complete actual U, and projected lower certification. The D1 fixture supports
10 mechanisms with L16/U19; D2 supports all 12 with L21/U29; D3 supports all 12
with L31/U38. That first run required a newly entered grid cell, which was a
stricter design preference than the user's requirement. The current decorator
also accepts real same-color occupancy followed by a recorded departure;
`decorator-grid-reroute/d1-grid-departure-qualified.json` independently verifies
the D1 grid with L16/U19. The returned `mechanismActivity` lists each colored
cell's initial body, entries, departures, and visited colors without claiming
it adds a particular number of mandatory moves. The D1 fixture's only free
generator rim is behind an H4 body that moves last, so that generator call
still returns failure. A caller should use a new compatible partition rather
than hide this failure or count tail-only cargo as middle-game coordination.

The additional source198 D1 fixture in `generator-large-d1-qualified.json`
passes fresh L16/U17 with a real middle-game generator and both cargo bodies
cleared. Thus all 12 mechanisms now have at least one qualified fixture in
each band; this is not 36 unique formal layouts. Small-cargo plans may use a
native S/H2/V2/SQ2/H3/V3 footprint, detect its first actual middle-game vacancy,
and interleave cargo clears with original base gestures. Both cargo bodies
must clear before the final two base bodies; failures remain explicit.

Shutter plans first prefer original bodies in a native zero-cost clear
closure. If the hidden body was the first clear, another genuinely initially
clearable body must trigger its count-one cover and the whole modified route
must pass. The three `shutter-closure-qualified-v1/supported-0..2.json` fixtures
pass L16/U19, L21/U29, and L31/U38. A base with only one initially clearable body
cannot use that particular count-one construction: hiding the only initial
clear body leaves no real trigger. Other finite plans remain available, but
their projected lower bound is still independently decided by the contract.
