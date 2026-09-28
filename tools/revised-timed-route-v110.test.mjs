import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPreviewCore, digest} from './revised-preview-validation-v160.mjs';
import {replayTimedRoute, timedRouteInputHashes, TIMED_ROUTE_CLOCK_ORIGIN, TIMED_ROUTE_POINTER_POLICY} from './revised-timed-route-v110.mjs';

const {api} = await loadPreviewCore();
const block = (id, x, y, color = 'red', extra = {}) => ({id, x, y, color, shape: [[0, 0]], ...extra});
const gate = (id, side, offset, color) => ({id, side, offset, size: 1, color});
const base = overrides => ({id: 90133, name: 'Timed verifier fixture only', difficulty: 'normal',
  width: 5, height: 5, timeSeconds: 60, reward: 0, mechanismRules: 'revised-2026-09-21-v1.2',
  blocks: [], gates: [], ...overrides});
const simple = (seconds = 3) => base({blocks: [block('bomb', 1, 1, 'red', {timedBombSeconds: seconds})],
  gates: [gate('red', 'left', 1, 'red')]});
const route = (level, entries) => {
  let atSeconds = 0;
  const events = entries.map(([type, dtSeconds, data = {}]) => ({type, dtSeconds, atSeconds: atSeconds += dtSeconds, ...data}));
  return {schemaVersion: 1, levelSha256: digest(level), clockOrigin: TIMED_ROUTE_CLOCK_ORIGIN,
    pointerPolicy: TIMED_ROUTE_POINTER_POLICY, durationSeconds: atSeconds, events};
};
const down = (id, dt = .1) => ['down', dt, {blockId: id}];
const move = (x, y, dt = .1) => ['move', dt, {anchor: [x, y]}];
const up = (dt = .1) => ['up', dt];
const wait = dt => ['wait', dt];
const simpleEntries = () => [down('bomb'), move(0, 1), up()];
const expectPass = (level, entries, options) => {
  const timed = route(level, entries), input = structuredClone({level, timed});
  const actual = replayTimedRoute(level, timed, api, options);
  assert(actual.valid && actual.complete && actual.modelTimeValidated, actual.error);
  assert.deepEqual({level, timed}, input, 'Verifier must not mutate inputs');
  assert.equal(actual.pointerReplayValidated, false);
  assert.equal(actual.timeValidated, false);
  assert.equal(actual.formalTimeValidated, false);
  assert.equal(actual.lowerBoundCertified, false);
  assert.equal(actual.timeAndStarsCalibrated, false);
  assert.equal(actual.releaseApproved, false);
  return actual;
};
const expectFail = (level, timed, pattern) => {
  const actual = replayTimedRoute(level, timed, api);
  assert.equal(actual.valid, false);
  assert.equal(actual.complete, false);
  assert.equal(actual.modelTimeValidated, false);
  assert.match(actual.error, pattern);
  return actual;
};
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('complete fresh timed replay binds inputs, canonical drags and positive active time', () => {
  const level = simple();
  const expectedDrags = [{blockId: 'bomb', path: [[0, 1]], exitSide: 'left'}];
  const r = expectPass(level, simpleEntries(), {expectedDrags});
  assert.deepEqual(r.drags, expectedDrags);
  assert.equal(r.effectiveDrags, 1); assert.equal(r.clearEvents, 1);
  near(r.activeElapsedSeconds, .2); near(r.postCompleteElapsedSeconds, .1);
  near(r.bombLifecycle[0].remainingAtDisarm, 2.8);
  assert.equal(r.bombLifecycle[0].firstActiveAtSeconds, 0);
  assert.equal(r.bombLifecycle[0].disarmKind, 'removed');
  assert.equal(r.finalSnapshot.blocks.length, 0);
  assert.deepEqual(timedRouteInputHashes(level, route(level, simpleEntries())), {levelSha256: r.levelSha256, timedRouteSha256: r.timedRouteSha256});
});

test('unselected opening bomb ticks immediately and cannot be rescued at exactly zero', () => {
  const level = simple(1);
  const r = expectFail(level, route(level, [wait(1), ...simpleEntries()]), /Time expired before input/);
  assert.equal(r.errorEventIndex, 0); assert.equal(r.finalSnapshot.failed, true);
  assert.equal(r.finalSnapshot.blocks[0].timedBombSeconds, 0);
});

test('time is charged inside a held drag before movement and exit', () => {
  const level = simple(.25);
  const r = expectFail(level, route(level, [down('bomb'), move(0, 1, .2), up()]), /Time expired before input/);
  assert.equal(r.errorEventIndex, 1);
  assert.equal(r.finalSnapshot.blocks[0].x, 1);
  assert.equal(r.clearEvents, 0);
});

test('ordinary total level deadline remains enforced independently of a long bomb deadline', () => {
  const level = simple(20); level.timeSeconds = .15;
  expectFail(level, route(level, simpleEntries()), /Time expired before input/);
});

test('an unlock sample charges existing active bombs, but not the bomb it is about to enable', () => {
  const level = base({blocks: [block('key', 0, 0, 'red', {keyId: 'k'}),
    block('live', 4, 1, 'blue', {timedBombSeconds: 20}),
    block('new', 0, 2, 'green', {lockedBy: 'k', timedBombSeconds: 5})],
    gates: [gate('red', 'left', 0, 'red'), gate('blue', 'right', 1, 'blue'), gate('green', 'left', 2, 'green')]});
  const r = expectPass(level, [down('key', 10), up(.25), down('new', .25), up(.25), down('live', .25), up()]);
  const justUnlocked = r.trace[0].bombsAfter;
  assert.equal(justUnlocked.find(b => b.blockId === 'live').remainingSeconds, 10);
  assert.equal(justUnlocked.find(b => b.blockId === 'new').remainingSeconds, 5);
  near(r.bombLifecycle.find(b => b.blockId === 'new').remainingAtDisarm, 4.5);
  near(r.bombLifecycle.find(b => b.blockId === 'live').remainingAtDisarm, 9);
});

test('hidden, frozen and locked bombs do not tick before simultaneous activation', () => {
  const level = base({blocks: [block('key', 0, 0, 'red', {keyId: 'k'}),
    block('ice', 4, 1, 'blue', {frozen: 1, timedBombSeconds: 5}),
    block('lock', 0, 2, 'green', {lockedBy: 'k', timedBombSeconds: 5}),
    block('hidden', 4, 3, 'yellow', {shutterId: 'cover', timedBombSeconds: 5})],
    gates: [gate('red', 'left', 0, 'red'), gate('blue', 'right', 1, 'blue'), gate('green', 'left', 2, 'green'), gate('yellow', 'right', 3, 'yellow')],
    shutters: [{id: 'cover', x: 4, y: 3, width: 1, height: 1, count: 1}]});
  const r = expectPass(level, [wait(10), down('key', .25), up(.25), down('ice', .25), up(.25), down('lock', .25), up(.25), down('hidden', .25), up(.25)]);
  for (const b of r.trace[0].bombsAfter) { assert.equal(b.active, false); assert.equal(b.remainingSeconds, 5); }
  for (const b of r.trace[1].bombsAfter) { assert.equal(b.active, true); assert.equal(b.remainingSeconds, 5); }
  for (const b of r.bombLifecycle) assert.equal(b.firstActiveAtSeconds, 10.25);
  near(r.bombLifecycle.find(b => b.blockId === 'ice').remainingAtDisarm, 4.5);
  near(r.bombLifecycle.find(b => b.blockId === 'lock').remainingAtDisarm, 4);
  near(r.bombLifecycle.find(b => b.blockId === 'hidden').remainingAtDisarm, 3.5);
});

test('combined hidden+ice+lock waits for last restriction; reveal does not retroactively melt hidden ice', () => {
  const level = base({blocks: [block('key', 0, 0, 'red', {keyId: 'k'}), block('clear', 0, 2, 'green'),
    block('bomb', 4, 3, 'yellow', {shutterId: 'cover', frozen: 1, lockedBy: 'k', timedBombSeconds: 2})],
    gates: [gate('red', 'left', 0, 'red'), gate('green', 'left', 2, 'green'), gate('yellow', 'right', 3, 'yellow')],
    shutters: [{id: 'cover', x: 4, y: 3, width: 1, height: 1, count: 1}]});
  const r = expectPass(level, [wait(5), down('key'), up(), wait(5), down('clear'), up(), down('bomb'), up()]);
  assert.equal(r.trace[1].bombsAfter[0].active, false);
  assert.equal(r.trace[3].bombsAfter[0].remainingSeconds, 2);
  near(r.bombLifecycle[0].firstActiveAtSeconds, 10.3);
  near(r.bombLifecycle[0].remainingAtDisarm, 1.8);
  expectFail(level, route(level, [down('bomb')]), /visible, unfrozen, unlocked/);
});

test('peeling removes bomb field permanently, so the surviving core outlives the original deadline', () => {
  const level = base({blocks: [block('shell', 0, 0, 'red', {layers: ['red', 'blue'], timedBombSeconds: .5})],
    gates: [gate('red', 'left', 0, 'red'), gate('blue', 'left', 1, 'blue')]});
  const r = expectPass(level, [down('shell'), up(), wait(10), down('shell'), move(0, 1), up()]);
  assert.equal(r.clearEvents, 2); assert.equal(r.effectiveDrags, 2);
  assert.equal(r.bombLifecycle[0].disarmKind, 'shell-peel');
  near(r.bombLifecycle[0].disarmedAtSeconds, .1);
  near(r.bombLifecycle[0].remainingAtDisarm, .4);
  assert.equal(r.trace[2].bombsAfter[0].remainingSeconds, null);
  expectFail(level, route(level, [down('shell', .5), up()]), /Time expired before input/);
});

test('queued bomb stays unchanged until free-footprint spawn, including activation in mid-drag', () => {
  const level = base({generators: [{id: 'machine', side: 'top', offset: 1, spawn: [1, 0], queueBlockIds: ['cargo']}],
    blocks: [block('blocker', 1, 0, 'red'), block('cargo', 1, 0, 'blue', {timedBombSeconds: 5})],
    gates: [gate('red', 'left', 1, 'red'), gate('blue', 'right', 0, 'blue')]});
  const r = expectPass(level, [wait(8), down('blocker'), move(1, 1), move(0, 1), up(),
    down('cargo'), move(2, 0), move(3, 0), move(4, 0), up()]);
  assert.equal(r.trace[0].bombsAfter[0].queued, true);
  assert.equal(r.trace[0].bombsAfter[0].remainingSeconds, 5);
  near(r.bombLifecycle[0].firstActiveAtSeconds, 8.2);
  assert.equal(r.trace[2].bombsAfter[0].remainingSeconds, 5);
  assert.equal(r.finalSnapshot.queuedBlocks.length, 0);
});

test('pause time is not bomb time, but paused gameplay and mid-drag pauses are rejected', () => {
  const level = simple(1);
  const r = expectPass(level, [['pause', .1], wait(100), ['resume', .1], ...simpleEntries()]);
  near(r.pausedElapsedSeconds, 100.1); near(r.activeElapsedSeconds, .3);
  near(r.bombLifecycle[0].remainingAtDisarm, .7);
  expectFail(level, route(level, [['pause', .1], down('bomb'), up()]), /while paused/);
  expectFail(level, route(level, [down('bomb'), ['pause', .1]]), /between gestures/);
  expectFail(level, route(level, [['resume', .1]]), /actual pause/);
  expectFail(level, route(level, [['pause', .1], ['pause', .1]]), /while paused/);
});

test('wait while holding remains active gameplay time, never a free pause', () => {
  const level = simple(.3);
  expectFail(level, route(level, [down('bomb'), wait(.3), move(0, 1), up()]), /Time expired before input/);
});

for (const bad of [-1, 0, NaN, Infinity, undefined, '0.1']) {
  test(`reject invalid or absent dtSeconds: ${String(bad)}`, () => {
    const level = simple(), timed = route(level, simpleEntries());
    timed.events[0].dtSeconds = bad;
    expectFail(level, timed, /Positive finite dtSeconds/);
  });
}

test('zero-only routes, omitted intervals, missing last time, and inconsistent totals are rejected', () => {
  const level = simple(), timed = route(level, simpleEntries());
  const zero = structuredClone(timed); zero.events.forEach(e => { e.dtSeconds = 0; e.atSeconds = 0; }); zero.durationSeconds = 0;
  expectFail(level, zero, /Positive finite dtSeconds/);
  const gap = structuredClone(timed); gap.events[1].atSeconds += .05;
  expectFail(level, gap, /Unaccounted time interval/);
  const missing = structuredClone(timed); delete missing.events[1].atSeconds;
  expectFail(level, missing, /Strictly increasing finite/);
  const short = structuredClone(timed); short.durationSeconds -= .1;
  expectFail(level, short, /entire event sequence/);
});

test('first contact auto-exits at down, and cannot be postponed until after a move', () => {
  const level = simple(); level.blocks[0].x = 0;
  const r = expectPass(level, [down('bomb'), up()]);
  assert.deepEqual(r.drags, [{blockId: 'bomb', path: [], exitSide: 'left'}]);
  expectFail(level, route(level, [down('bomb'), move(1, 1), up()]), /after completion|first-contact/);
});

test('first contact on a move must end the drag even if a shell core survives', () => {
  const level = simple(); level.blocks[0].layers = ['red', 'blue']; level.gates.push(gate('blue', 'left', 2, 'blue'));
  expectFail(level, route(level, [down('bomb'), move(0, 1), move(0, 2), up()]), /first-contact exit/);
});

test('nonadjacent jumps, direct exits, boosters and unknown clock fields are not input samples', () => {
  const level = simple(); level.blocks[0].x = 2;
  expectFail(level, route(level, [down('bomb'), move(0, 1), up()]), /one legal adjacent cell/);
  for (const type of ['exit', 'tick', 'booster', 'addTime', 'undo', 'cancel'])
    expectFail(level, route(level, [[type, .1]]), /Unsupported event type/);
  const injected = route(level, simpleEntries()); injected.events[0].timedBombSeconds = 1000;
  expectFail(level, injected, /Unknown event/);
});

test('valid parking drag still needs whole completion, release, and exact expected canonical route', () => {
  const level = simple(10);
  expectFail(level, route(level, [down('bomb'), move(2, 1), up()]), /Full level completion/);
  expectFail(level, route(level, [down('bomb'), move(0, 1)]), /unreleased pointer/);
  expectFail(level, route(level, [down('bomb'), up()]), /no effective mutation/);
  const r = expectPass(level, [down('bomb'), move(2, 1), up(), down('bomb'), move(1, 1), move(0, 1), up()]);
  assert.equal(r.nonClearingDrags, 1); assert.equal(r.effectiveDrags, 2);
  const mismatch = replayTimedRoute(level, route(level, simpleEntries()), api, {expectedDrags: []});
  assert.equal(mismatch.valid, false); assert.match(mismatch.error, /bound canonical drags/);
});

test('changed level identity, wrong origin and old runtime profile cannot reuse the witness', () => {
  const level = simple(), timed = route(level, simpleEntries());
  const changed = structuredClone(level); changed.blocks[0].timedBombSeconds = 30;
  expectFail(changed, timed, /level SHA mismatch/);
  const origin = structuredClone(timed); origin.clockOrigin = 'first-drag';
  expectFail(level, origin, /Stable playable clock origin/);
  const historical = structuredClone(level); historical.mechanismRules = 'revised-2026-09-21';
  expectFail(historical, route(historical, simpleEntries()), /Explicit current runtime/);
});
