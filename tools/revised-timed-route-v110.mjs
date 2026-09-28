import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';

export const TIMED_ROUTE_SCHEMA_VERSION = 1;
export const TIMED_ROUTE_POINTER_POLICY = 'first-shape-cell-center-and-unit-steps';
export const TIMED_ROUTE_CLOCK_ORIGIN = 'first-playable-stable-state';
const PROFILE = 'revised-2026-09-21-v1.2';
const EPSILON = 1e-9;
const keys = (value, allowed, label) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).filter(k => !allowed.includes(k)), [], `Unknown ${label} fields`);
};
const close = (a, b) => Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));

/** Pure identity data; callers must additionally pin this tool and core inputs. */
export function timedRouteInputHashes(level, timedRoute) {
  return {levelSha256: digest(level), timedRouteSha256: digest(timedRoute)};
}

function validateRoute(level, route) {
  assert.equal(level.mechanismRules, PROFILE, 'Explicit current runtime profile required');
  keys(route, ['schemaVersion', 'levelSha256', 'clockOrigin', 'pointerPolicy', 'durationSeconds', 'events'], 'timed route');
  assert.equal(route.schemaVersion, TIMED_ROUTE_SCHEMA_VERSION, 'Timed route schema');
  assert.equal(route.clockOrigin, TIMED_ROUTE_CLOCK_ORIGIN, 'Stable playable clock origin required');
  assert.equal(route.pointerPolicy, TIMED_ROUTE_POINTER_POLICY, 'Canonical pointer policy required');
  assert.equal(route.levelSha256, digest(level), 'Timed route level SHA mismatch');
  assert(Array.isArray(route.events) && route.events.length > 0, 'Nonempty timed events required');
  let previous = 0;
  for (const [i, event] of route.events.entries()) {
    const fields = {down: ['blockId'], move: ['anchor'], up: [], wait: [], pause: [], resume: []}[event?.type];
    assert(fields, `Unsupported event type at ${i}`);
    keys(event, ['type', 'atSeconds', 'dtSeconds', ...fields], `event ${i}`);
    assert(Number.isFinite(event.dtSeconds) && event.dtSeconds > 0, `Positive finite dtSeconds required at ${i}`);
    assert(Number.isFinite(event.atSeconds) && event.atSeconds > previous, `Strictly increasing finite atSeconds required at ${i}`);
    assert(close(event.atSeconds - previous, event.dtSeconds), `Unaccounted time interval at ${i}`);
    if (event.type === 'down') assert(typeof event.blockId === 'string' && event.blockId.length > 0, `Block identity required at ${i}`);
    if (event.type === 'move') assert(Array.isArray(event.anchor) && event.anchor.length === 2 && event.anchor.every(Number.isSafeInteger), `Integer anchor required at ${i}`);
    previous = event.atSeconds;
  }
  assert(Number.isFinite(route.durationSeconds) && route.durationSeconds > 0 && close(route.durationSeconds, previous), 'Duration must account for the entire event sequence');
  assert(!(level.generators ?? []).some(g => g.trigger === 'time'), 'Legacy timed generators unsupported');
  assert(!level.elevators?.length && !level.conveyors?.length, 'Legacy autonomous moving geometry unsupported');
  assert(!(level.shutters ?? []).some(s => ['staging', 'staged-frame', 'generator'].includes(s.skin)), 'Legacy nonspatial staging unsupported');
  assert(!level.blocks.some(b => b.rotationBadge), 'Legacy rotation metadata unsupported');
}

/** Same first-contact portal policy as the existing spatial witness verifier. */
function automaticExitSide(model, blockId, api, previous) {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return undefined;
  const sides = model.possibleExitSides(block);
  if (!sides.length) return undefined;
  const snapshot = model.snapshot();
  const portals = api.matchingContinuousExitPortals(snapshot, block, sides);
  const [grabX, grabY] = block.shape[0];
  const inferred = previous ? block.x < previous[0] ? 'left' : block.x > previous[0] ? 'right'
    : block.y < previous[1] ? 'top' : block.y > previous[1] ? 'bottom' : undefined : undefined;
  return api.choosePortalReleaseCandidate(portals,
    {x: block.x + grabX + .5, y: block.y + grabY + .5},
    {innerX: 0, innerY: 0, innerWidth: snapshot.width, innerHeight: snapshot.height, cell: 1},
    inferred)?.portal.side;
}

/**
 * Independent fresh-model time witness, not a browser/animation certificate.
 *
 * Route schema: {schemaVersion:1, levelSha256, clockOrigin, pointerPolicy,
 *   durationSeconds, events:[{type, atSeconds, dtSeconds, blockId? / anchor?}]}.
 * Every external sample has positive elapsed time from its predecessor, with
 * t=0 at the first stable playable state. down / move may auto-exit immediately;
 * tryExit and commit in that one input event consume no invented extra time.
 * up is still required after auto-exit. pause/resume occur only between drags;
 * paused intervals consume wall time, with all gameplay input prohibited.
 * No cancel, undo, boosters, clocks writes, arbitrary exits or action injection.
 *
 * All animation / human delays belong in wait events. This tool cannot certify
 * that a proposed schedule includes real browser delays; natural Pointer replay
 * must independently establish that fact. Existing spatial replay stays closed
 * to bombs. This function never removes a bomb to make an input acceptable.
 */
export function replayTimedRoute(level, timedRoute, api, {expectedDrags} = {}) {
  const result = {
    valid: false, complete: false, modelTimeValidated: false,
    evidence: 'timed-model-witness-only', pointerReplayValidated: false,
    timeValidated: false, formalTimeValidated: false, timeAndStarsCalibrated: false,
    lowerBoundCertified: false, releaseApproved: false,
    effectiveDrags: 0, nonClearingDrags: 0, clearEvents: 0,
    elapsedWallSeconds: 0, activeElapsedSeconds: 0, pausedElapsedSeconds: 0, postCompleteElapsedSeconds: 0,
    drags: [], trace: [], bombLifecycle: [],
  };
  let model, eventIndex = -1;
  try {
    validateRoute(level, timedRoute);
    Object.assign(result, timedRouteInputHashes(level, timedRoute));
    model = new api.PuzzleModel(structuredClone(level));
    model.startCountdown();
    assert(!model.snapshot().failed && !model.snapshot().complete, 'Nonterminal stable opening required');
    const bombRows = new Map(level.blocks.filter(b => b.timedBombSeconds !== undefined).map(b => [b.id, {
      blockId: b.id, initialSeconds: b.timedBombSeconds, firstActiveAtSeconds: null,
      disarmedAtSeconds: null, disarmKind: null, remainingAtDisarm: null,
      minimumActiveRemainingSeconds: null, activeChargedSeconds: 0,
    }]));
    const observeBombs = atSeconds => {
      const snapshot = model.snapshot();
      return [...bombRows.values()].map(row => {
        const block = model.getBlock(row.blockId);
        const queued = snapshot.queuedBlocks.find(b => b.id === row.blockId);
        const carrier = block ?? queued;
        const remaining = carrier?.timedBombSeconds;
        const active = remaining !== undefined && Boolean(block && model.isBlockActive(block));
        if (active) {
          if (row.firstActiveAtSeconds === null) row.firstActiveAtSeconds = atSeconds;
          row.minimumActiveRemainingSeconds = row.minimumActiveRemainingSeconds === null ? remaining : Math.min(row.minimumActiveRemainingSeconds, remaining);
        }
        if (remaining !== undefined) row.lastRemainingSeconds = remaining;
        else if (row.disarmedAtSeconds === null) {
          row.disarmedAtSeconds = atSeconds;
          row.disarmKind = block ? 'shell-peel' : 'removed';
          row.remainingAtDisarm = row.lastRemainingSeconds;
        }
        return {blockId: row.blockId, active, queued: Boolean(queued), remainingSeconds: remaining ?? null};
      });
    };
    observeBombs(0);
    result.bombLifecycle = [...bombRows.values()];
    let paused = false, pointerDown = false, held;
    const commit = exitSide => {
      const before = held.before;
      if (exitSide) assert(model.tryExit(held.drag.blockId, exitSide).ok, 'Canonical automatic exit rejected');
      assert(model.commitAction(), 'Pointer drag has no effective mutation');
      const after = model.snapshot();
      assert(!after.failed && after.moves === before.moves + 1, 'Invalid committed action');
      if (exitSide) held.drag.exitSide = exitSide;
      result.drags.push(held.drag);
      result.effectiveDrags++;
      const clears = after.cleared - before.cleared;
      assert(clears === 0 || clears === 1, 'One canonical drag may clear at most one layer');
      result.clearEvents += clears;
      if (!clears) result.nonClearingDrags++;
      held = undefined;
    };
    for (const [i, event] of timedRoute.events.entries()) {
      eventIndex = i;
      const before = model.snapshot(), pausedBefore = paused;
      assert(!before.failed, 'Failed model cannot receive input');
      // Only release of the already auto-cleared final gesture is allowed after
      // completion. Time then belongs to the completed UI, not active play.
      if (before.complete) assert(pointerDown && !held && event.type === 'up', 'Events after completion are not gameplay');
      if (paused) assert(['wait', 'resume'].includes(event.type), 'Gameplay input or duplicate pause while paused');
      const bombsBefore = observeBombs(result.elapsedWallSeconds);
      const chargedSeconds = !paused && !before.complete ? event.dtSeconds : 0;
      if (chargedSeconds > 0) {
        for (const bomb of bombsBefore) if (bomb.active) bombRows.get(bomb.blockId).activeChargedSeconds += chargedSeconds;
        model.tick(chargedSeconds);
        result.activeElapsedSeconds += chargedSeconds;
      } else if (paused) result.pausedElapsedSeconds += event.dtSeconds;
      else result.postCompleteElapsedSeconds += event.dtSeconds;
      result.elapsedWallSeconds = event.atSeconds;
      observeBombs(event.atSeconds);
      assert(!model.snapshot().failed, 'Time expired before input mutation; exit or peel cannot rescue it');
      switch (event.type) {
        case 'down': {
          assert(!pointerDown, 'Duplicate pointer down');
          const block = model.getBlock(event.blockId);
          assert(block && model.isBlockActive(block), 'Pointer down requires a visible, unfrozen, unlocked block');
          pointerDown = true;
          held = {drag: {blockId: event.blockId, path: []}, before: model.snapshot()};
          model.beginAction();
          const side = automaticExitSide(model, event.blockId, api);
          if (side) commit(side);
          break;
        }
        case 'move': {
          assert(pointerDown && held, 'Movement after automatic first-contact exit or without held block');
          const block = model.getBlock(held.drag.blockId), previous = [block.x, block.y];
          assert(model.moveBlockStep(block.id, ...event.anchor), 'Rejected move: requires one legal adjacent cell');
          held.drag.path.push([...event.anchor]);
          const side = automaticExitSide(model, block.id, api, previous);
          if (side) commit(side);
          break;
        }
        case 'up':
          assert(pointerDown, 'Pointer up without preceding down');
          if (held) commit();
          pointerDown = false;
          break;
        case 'wait':
          break;
        case 'pause':
          assert(!pointerDown && !paused, 'Pause is allowed only between gestures');
          paused = true;
          break;
        case 'resume':
          assert(paused, 'Resume requires an actual pause');
          paused = false;
          break;
      }
      const bombsAfter = observeBombs(event.atSeconds), after = model.snapshot();
      result.trace.push({eventIndex: i, type: event.type, atSeconds: event.atSeconds, chargedSeconds, pausedBefore,
        activeBombsBefore: bombsBefore.filter(b => b.active).map(b => b.blockId), bombsAfter,
        remainingSeconds: after.remainingSeconds, moves: after.moves, cleared: after.cleared,
        complete: after.complete, failed: after.failed, stateSha256: digest(after)});
    }
    assert(!pointerDown && !held, 'Route ends with an unreleased pointer');
    assert(!paused, 'Route must finish resumed');
    const final = model.snapshot();
    assert(final.complete && !final.failed, 'Full level completion required, not a valid prefix');
    assert(result.activeElapsedSeconds > 0 && result.effectiveDrags > 0, 'Positive playable time and real actions required');
    assert([...bombRows.values()].every(b => b.disarmedAtSeconds !== null), 'Every authored bomb must be resolved');
    if (expectedDrags !== undefined) assert.deepEqual(result.drags, expectedDrags, 'Timed inputs differ from bound canonical drags');
    result.valid = true;
    result.complete = true;
    result.modelTimeValidated = true;
    result.dragsSha256 = digest(result.drags);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.errorEventIndex = eventIndex;
  }
  if (model) {
    result.finalSnapshot = model.snapshot();
    const {moves, ...state} = result.finalSnapshot;
    result.finalStateKey = JSON.stringify(state);
  }
  return result;
}

export const replayRevisedTimedRoute = replayTimedRoute;
