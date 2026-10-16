import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalLevelHash,
  evidenceCheck,
  mechanismCheck,
  normalizedPuzzleKey,
  rawJsonHash,
} from './round3-contract.mjs';

const baseLevel = () => ({
  id: 1,
  mechanismRules: 'revised-2026-09-27-v1.5', width: 4, height: 2,
  playable: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]], blocked: [], seams: [],
  gates: [{ id: 'gate-a', side: 'right', offset: 0, size: 1, color: 'red' }],
  blocks: [
    { id: 'key-a', x: 0, y: 0, shape: [[0, 0]], color: 'blue', keyId: 'group-a' },
    { id: 'locked-a', x: 1, y: 0, shape: [[0, 0]], color: 'green', lockedBy: 'group-a' },
    { id: 'special-a', x: 2, y: 0, shape: [[0, 0]], color: 'yellow' },
    { id: 'plain-a', x: 3, y: 0, shape: [[0, 0]], color: 'purple' },
  ], shutters: [], generators: [], elevators: [], conveyors: [], coloredGrids: [],
});

test('normalizedPuzzleKey ignores ids, names and a global palette permutation', () => {
  const left = { ...baseLevel(), id: 100, name: 'left' };
  const right = structuredClone(left);
  right.id = 900003; right.name = 'right';
  const idMap = new Map([['gate-a', 'g-right'], ['key-a', 'k-right'], ['locked-a', 'l-right'], ['special-a', 's-right'], ['plain-a', 'p-right']]);
  const colors = new Map([['red', 'cyan'], ['blue', 'orange'], ['green', 'pink'], ['yellow', 'purple'], ['purple', 'green']]);
  right.gates[0].id = idMap.get(right.gates[0].id); right.gates[0].color = colors.get(right.gates[0].color);
  for (const block of right.blocks) {
    block.id = idMap.get(block.id); block.color = colors.get(block.color);
    if (block.keyId) block.keyId = 'renamed-group';
    if (block.lockedBy) block.lockedBy = 'renamed-group';
  }
  assert.equal(normalizedPuzzleKey(left), normalizedPuzzleKey(right));
  const relationBroken = structuredClone(right);
  relationBroken.blocks.find(block => block.lockedBy).lockedBy = 'different-group';
  assert.notEqual(normalizedPuzzleKey(left), normalizedPuzzleKey(relationBroken));
});

test('mechanismCheck applies the early unlock contract', () => {
  const level = baseLevel();
  level.gates[0].frozen = 2;
  level.blocks[0].layers = ['blue', 'green'];
  level.blocks[1].lockedBy = 'group-a';
  assert.deepEqual(mechanismCheck(level, 3).beforeUnlock.sort(), ['iceGate', 'lock', 'shell']);
  assert.equal(mechanismCheck(baseLevel(), 60).status, 'PASS');
});

test('evidenceCheck binds raw route, canonical lower proof and rejects direct score exits', async () => {
  const level = baseLevel();
  const drags = [
    { blockId: 'key-a', path: [], exitSide: 'right' },
    { blockId: 'special-a', path: [[3, 0]] },
    { blockId: 'locked-a', path: [], exitSide: 'right' },
    { blockId: 'plain-a', path: [], exitSide: 'right' },
    { blockId: 'special-a', path: [], exitSide: 'right' },
  ];
  const row = {
    index: 60,
    difficulty: 'hard',
    target: { lower: 16, upper: 20 },
    accepted: {
      level, levelSha256: rawJsonHash(level), drags, routeSha256: rawJsonHash(drags),
      lowerBound: { thresholdProven: true, floor: 16, sourceLevelSha256: canonicalLevelHash(level) },
      replay: { valid: true, complete: true, nonClearingDrags: 17 },
      scoreBlocks: { status: 'PASS', selected: [{ blockId: 'special-a', points: 10 }] },
    },
  };
  const pass = await evidenceCheck(row, { validateLevel: () => {} });
  assert.equal(pass.status, 'PASS');
  assert.equal(pass.hashes.lowerBound.matchMode, 'canonical-json');
  assert.equal(pass.score.directOpenSpecials.length, 0);
  const direct = structuredClone(row);
  direct.accepted.level.blocks.find(block => block.id === 'special-a').x = 3;
  direct.accepted.level.blocks.find(block => block.id === 'plain-a').x = 2;
  direct.accepted.level.gates[0].color = 'yellow';
  direct.accepted.levelSha256 = rawJsonHash(direct.accepted.level);
  direct.accepted.lowerBound.sourceLevelSha256 = canonicalLevelHash(direct.accepted.level);
  direct.accepted.drags[1] = { blockId: 'special-a', path: [], exitSide: 'right' };
  direct.accepted.routeSha256 = rawJsonHash(direct.accepted.drags);
  const failed = await evidenceCheck(direct, { validateLevel: () => {} });
  assert.equal(failed.status, 'BLOCKED');
  assert.ok(failed.errors.includes('special-open-direct-exit:special-a'));
});

test('evidenceCheck fails closed when lower proof is not bound to the candidate', async () => {
  const level = baseLevel();
  const row = { index: 1, accepted: { level, levelSha256: rawJsonHash(level), lowerBound: { thresholdProven: true }, replay: { valid: true, complete: true, nonClearingDrags: 16 }, drags: [], routeSha256: rawJsonHash([]), scoreBlocks: { selected: [] } } };
  const result = await evidenceCheck(row, { validateLevel: () => {} });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.errors.includes('lower-bound-source-level-sha-missing'));
});
