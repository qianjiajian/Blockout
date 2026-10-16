import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectFiniteShellPointerDownV198, inspectFiniteShellCoordinatesV198, assertFiniteShellCoordinateDomainV198 } from './finite-shell-coordinate-static-v198-v2.mjs';

const root = 'deliverables/daily-formal-v4-20261008/design/shell-d2-09-source35-new-01';
function saved(path, expected) {
  const bytes = fs.readFileSync(path); assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
  return JSON.parse(bytes);
}
const input = saved(root + '/input.json', '2b53987a7f193165ddfa10179ea628ee8d218c8dfcd16f2b877f15a0d7a95e5e');
const oldTable = saved(root + '/independent-route-static-review.json', '27e9cb1ce01b51c59ff7415240c50193f2035be3ae0f9baa0c7e8404e140e958');
const receipt = saved(root + '-execution-01/candidate.json', '4c9727a0277198ba296ce4e9e28dca5517ce64710dc892311b6f8f95527c9560');
const beforeFourth = oldTable.tables.find(r => r.step === 3).declaredCoordinateTableAfterEvent;
const fourth = input.drags[3];

test('saved canonical failure is caught from the saved pre-fourth table without replaying the route', () => {
  assert.equal(receipt.accepted, false); assert.equal(receipt.route.canonicalReplay.effectiveDrags, 3);
  assert.equal(receipt.route.canonicalReplay.error, 'Pointer-down auto-exit of shell-d209-s35-n01-b9 must precede movement.');
  const check = inspectFiniteShellPointerDownV198(input.level, beforeFourth, fourth);
  assert.equal(check.errors[0].kind, 'pointer-down-auto-exit-must-end-drag');
  assert.deepEqual(check.anchor, [3, 5]); assert.deepEqual(check.availableGateIds, ['v3-g-purple']);
});

test('an explicit empty-path exit satisfies the same saved start condition', () => {
  const check = inspectFiniteShellPointerDownV198(input.level, beforeFourth, { blockId: fourth.blockId, path: [], exitSide: 'bottom' });
  assert.deepEqual(check.errors, []); assert.equal(check.contacts[0].available, true);
});

for (const exitSide of [undefined, 'left']) test('missing or wrong side cannot bypass the saved start auto-exit: ' + exitSide, () => {
  assert.equal(inspectFiniteShellPointerDownV198(input.level, beforeFourth, { blockId: fourth.blockId, path: [], exitSide }).errors.length, 1);
});

test('full passing width is required, not a single touching cell', () => {
  const blocks = structuredClone(beforeFourth); blocks.find(b => b.id === fourth.blockId).shape = [[0, 0], [1, 0]];
  const check = inspectFiniteShellPointerDownV198(input.level, blocks, fourth);
  assert.deepEqual(check.availableGateIds, []); assert.deepEqual(check.errors, []);
});

test('active inner colour from the saved table determines the start gate', () => {
  const blocks = structuredClone(beforeFourth); blocks.find(b => b.id === fourth.blockId).layers = ['blue'];
  assert.deepEqual(inspectFiniteShellPointerDownV198(input.level, blocks, fourth).availableGateIds, []);
});

test('a matching irregular-shape contact with a blocked outward sweep is not automatic', () => {
  const level = { width: 2, height: 2, playable: [[0,0],[1,0],[0,1],[1,1]], gates: [{id:'r',color:'red',side:'right',offset:0,size:2}], blocks: [
    {id:'L',color:'red',x:0,y:0,shape:[[0,0],[0,1],[1,1]]}, {id:'other',color:'blue',x:1,y:0,shape:[[0,0]]}] };
  const check = inspectFiniteShellPointerDownV198(level, level.blocks, {blockId:'L',path:[[0,1]]});
  assert.equal(check.contacts.length, 1); assert.equal(check.contacts[0].available, false);
  assert.deepEqual(check.contacts[0].blockers, [{cell:[1,0],blockId:'other'}]); assert.deepEqual(check.errors, []);
});

const tiny = { width: 1, height: 2, playable: [[0,0],[0,1]], gates: [
  {id:'g',color:'green',side:'top',offset:0,size:1}, {id:'r',color:'red',side:'left',offset:0,size:1}, {id:'b',color:'blue',side:'bottom',offset:0,size:1}], blocks: [
  {id:'shell',color:'green',layers:['green','red'],x:0,y:0,shape:[[0,0]]}, {id:'blue',color:'blue',x:0,y:1,shape:[[0,0]]}] };

test('the start is checked again on the next drag after a shell peel', () => {
  const check = inspectFiniteShellCoordinatesV198(tiny, [{blockId:'shell',path:[],exitSide:'top'}, {blockId:'shell',path:[[0,1]]}]);
  assert.equal(check.startChecks.length, 2); assert.equal(check.rows.length, 1);
  assert.equal(check.errors[0].kind, 'pointer-down-auto-exit-must-end-drag'); assert.equal(check.errors[0].step, 2);
  assert.deepEqual(check.errors[0].availableSides, ['left']); assert.equal(check.checks.intermediateAnchorsInspected, 0);
});

test('explicit initial and post-peel empty exits are permitted and do not mutate the supplied data', () => {
  const before = JSON.stringify(tiny), check = inspectFiniteShellCoordinatesV198(tiny, [
    {blockId:'shell',path:[],exitSide:'top'}, {blockId:'shell',path:[],exitSide:'left'}, {blockId:'blue',path:[],exitSide:'bottom'}]);
  assert.deepEqual(check.errors, []); assert.equal(check.checks.pointerDownStartsInspected, 3);
  assert.equal(check.checks.declaredShellPeelsInspected, 1); assert.equal(JSON.stringify(tiny), before);
});

test('unsupported timed or frozen mechanics are rejected instead of silently approximated', () => {
  const bomb = structuredClone(tiny); bomb.blocks[0].timedBombSeconds = 20;
  assert.throws(() => assertFiniteShellCoordinateDomainV198(bomb), /Only ordinary/);
  const ice = structuredClone(tiny); ice.gates[0].frozen = 1;
  assert.throws(() => assertFiniteShellCoordinateDomainV198(ice));
});
