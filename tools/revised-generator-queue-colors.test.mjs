import assert from 'node:assert/strict';
import test from 'node:test';
import { auditGeneratorQueueColors } from './revised-generator-queue-colors.mjs';

const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];

// These are author specs, not live model snapshots. Geometry is deliberately
// minimal: passing this subcheck must never claim complete level validation.
function fixture(queues) {
  const blocks = [];
  const generators = queues.map((queue, machine) => ({
    id: `g${machine}`,
    side: 'left',
    offset: machine,
    queueBlockIds: queue.map((entry, index) => {
      const block = {
        id: `g${machine}-q${index}`,
        x: 0,
        y: 0,
        cells: [[0, 0], [1, 0]],
        ...(typeof entry === 'string' ? { color: entry } : entry),
      };
      blocks.push(block);
      return block.id;
    }),
  }));
  return { id: 35, width: 7, height: 6, blocks, generators };
}

function audit(level) {
  const report = auditGeneratorQueueColors(level);
  assert.equal(report.ruleVersion, '1.29.0');
  assert.equal(report.levelId, level?.id);
  assert.equal(report.mapsModified, false);
  assert.equal(report.solvabilityValidated, false);
  assert.equal(report.passed, report.issues.length === 0);
  for (const issue of report.issues) assert.ok(typeof issue.code === 'string' && issue.code.length);
  return report;
}

function rejected(level, code) {
  const report = audit(level);
  assert.equal(report.passed, false);
  if (code) assert.ok(report.issues.some(issue => issue.code === code), JSON.stringify(report.issues));
  return report;
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

test('red then red fails and identifies the second entry with one-based positions', () => {
  const report = rejected(fixture([['red', 'red']]), 'consecutive-generator-color');
  const pair = { queueIndex: 2, previousBlockId: 'g0-q0', blockId: 'g0-q1', color: 'red' };
  assert.deepEqual(report.generators[0].sameColorPairs, [pair]);
  const issue = report.issues.find(item => item.code === 'consecutive-generator-color');
  for (const [key, value] of Object.entries({ generatorId: 'g0', ...pair })) assert.equal(issue[key], value);
  assert.deepEqual(report.stats, { generators: 1, queuedBlocks: 2, adjacentPairs: 1, consecutiveSameColorPairs: 1 });
});

test('red blue red is valid: non-adjacent color reuse is allowed', () => {
  const report = audit(fixture([['red', 'blue', 'red']]));
  assert.equal(report.passed, true);
  assert.deepEqual(report.generators[0].queue, [
    { index: 1, blockId: 'g0-q0', color: 'red' },
    { index: 2, blockId: 'g0-q1', color: 'blue' },
    { index: 3, blockId: 'g0-q2', color: 'red' },
  ]);
  assert.equal(report.generators[0].pairsChecked, 2);
  assert.equal(report.stats.consecutiveSameColorPairs, 0);
});

test('three consecutive reds report both overlapping violating pairs', () => {
  const report = rejected(fixture([['red', 'red', 'red']]));
  assert.equal(report.stats.adjacentPairs, 2);
  assert.equal(report.stats.consecutiveSameColorPairs, 2);
  assert.deepEqual(report.generators[0].sameColorPairs.map(pair => pair.queueIndex), [2, 3]);
});

test('different machines are independent and no cross-machine boundary is compared', () => {
  const report = audit(fixture([['red'], ['red', 'blue'], ['blue', 'red']]));
  assert.equal(report.passed, true);
  assert.deepEqual(report.stats, { generators: 3, queuedBlocks: 5, adjacentPairs: 2, consecutiveSameColorPairs: 0 });
  const mixed = rejected(fixture([['red', 'red'], ['red', 'blue']]));
  assert.equal(mixed.generators[1].sameColorPairs.length, 0);
  assert.equal(mixed.stats.consecutiveSameColorPairs, 1);
});

test('zero generators, empty queues and single cargo impose no extra color restrictions', () => {
  for (const level of [fixture([]), fixture([[]]), fixture([['red']]), { id: 1, blocks: [] }]) {
    const report = audit(level);
    assert.equal(report.passed, true);
    assert.equal(report.stats.adjacentPairs, 0);
    assert.equal(report.stats.consecutiveSameColorPairs, 0);
  }
});

test('all eight existing colors are accepted', () => {
  const report = audit(fixture([PALETTE]));
  assert.equal(report.passed, true);
  assert.equal(report.stats.adjacentPairs, 7);
});

test('same initial shell outer color fails even when both inner and fallback colors differ', () => {
  const report = rejected(fixture([[
    { color: 'blue', layers: ['red', 'blue'] },
    { color: 'green', layers: ['red', 'green'] },
  ]]));
  assert.deepEqual(report.generators[0].queue.map(entry => entry.color), ['red', 'red']);
  assert.equal(report.stats.consecutiveSameColorPairs, 1);
});

test('different shell outer colors pass despite identical fallback color fields', () => {
  const report = audit(fixture([[
    { color: 'red', layers: ['blue', 'red'] },
    { color: 'red', layers: ['green', 'red'] },
    { color: 'red' },
  ]]));
  assert.equal(report.passed, true);
  assert.deepEqual(report.generators[0].queue.map(entry => entry.color), ['blue', 'green', 'red']);
});

test('one initial layer also takes precedence over the fallback color', () => {
  const report = rejected(fixture([[
    { color: 'blue', layers: ['red'] },
    'red',
  ]]));
  assert.equal(report.generators[0].sameColorPairs[0].color, 'red');
});

test('plain blocks compare color and do not inspect shape, axis or stock to exempt same color', () => {
  const level = fixture([[
    { color: 'red', cells: [[0, 0]], axis: 'horizontal' },
    { color: 'red', cells: [[0, 0], [0, 1], [0, 2]], axis: 'vertical' },
  ]]);
  level.generators[0].remaining = 999;
  assert.equal(rejected(level).stats.consecutiveSameColorPairs, 1);
});

test('full authored queue is checked regardless of head, remaining or nextBlockId state', () => {
  for (const colors of [['red', 'red', 'blue'], ['red', 'blue', 'blue']]) {
    const level = fixture([colors]);
    Object.assign(level.generators[0], { head: 2, remaining: 0, nextBlockId: 'g0-q2', active: false });
    const report = rejected(level);
    assert.equal(report.generators[0].queue.length, 3);
    assert.equal(report.stats.adjacentPairs, 2);
    assert.equal(report.stats.consecutiveSameColorPairs, 1);
  }
});

test('opening neighbor and last cleared block colors do not constrain first cargo', () => {
  const level = fixture([['red', 'blue']]);
  level.blocks.push({ id: 'opening-red', color: 'red', x: 0, y: 0, cells: [[0, 0]] });
  Object.assign(level.generators[0], { previousColor: 'red', lastClearedColor: 'red' });
  assert.equal(audit(level).passed, true);
});

test('invalid or unknown fallback color cannot pass, even when a shell outer color is known', () => {
  for (const color of [undefined, null, '', 'white', 'RED', 1, {}, ['red']]) {
    rejected(fixture([[{ color }]]), 'invalid-block-color');
    rejected(fixture([[{ color, layers: ['red', 'blue'] }]]), 'invalid-block-color');
  }
});

test('malformed or unknown layer colors cannot be skipped into a passing result', () => {
  for (const layers of [null, 'red', [], ['white', 'blue'], ['red', 'white'], [undefined, 'red'], ['red', undefined], ['red', 'blue', 'green']]) {
    rejected(fixture([[{ color: 'red', layers }]]), 'invalid-block-layers');
  }
});

test('sparse shell layer arrays cannot hide an unknown inner layer', () => {
  const layers = ['red'];
  layers.length = 2;
  rejected(fixture([[{ color: 'red', layers }]]), 'invalid-block-layers');
});

test('unknown queue references fail and do not bridge a missing middle item', () => {
  const level = fixture([['red', 'blue', 'red']]);
  level.blocks.splice(1, 1);
  const report = rejected(level, 'missing-queue-block');
  assert.equal(report.generators[0].queue.length, 3);
  assert.equal(report.generators[0].queue[1].color, null);
  assert.equal(report.stats.adjacentPairs, 0);
  assert.equal(report.stats.consecutiveSameColorPairs, 0);
});

test('duplicate authored block IDs are ambiguous even when records happen to agree', () => {
  const level = fixture([['red', 'blue']]);
  level.blocks.push(structuredClone(level.blocks[0]));
  const report = rejected(level, 'duplicate-block-id');
  assert.ok(report.issues.some(issue => issue.code === 'ambiguous-queue-block'));
});

test('duplicate generator IDs cannot pass even with disjoint otherwise valid queues', () => {
  const level = fixture([['red'], ['blue']]);
  level.generators[1].id = level.generators[0].id;
  rejected(level, 'duplicate-generator-id');
});

test('a block cannot be used twice in one queue even at non-adjacent positions', () => {
  const level = fixture([['red', 'blue']]);
  level.generators[0].queueBlockIds.push('g0-q0');
  const report = rejected(level, 'duplicate-queue-block');
  assert.equal(report.stats.consecutiveSameColorPairs, 0);
});

test('a block cannot be shared by two machines despite each local color order being valid', () => {
  const level = fixture([['red'], ['blue']]);
  level.generators[1].queueBlockIds.push('g0-q0');
  const report = rejected(level, 'shared-queue-block');
  assert.equal(report.stats.consecutiveSameColorPairs, 0);
});

test('invalid IDs and malformed queues fail closed rather than passing or throwing', () => {
  for (const id of ['', ' ', null, 1, {}]) {
    const level = fixture([['red']]);
    level.generators[0].id = id;
    rejected(level, 'invalid-generator-id');
    const badReference = fixture([['red']]);
    badReference.generators[0].queueBlockIds = [id];
    rejected(badReference, 'invalid-queue-block-id');
  }
  for (const queue of [undefined, null, 'g0-q0', {}]) {
    const level = fixture([['red']]);
    level.generators[0].queueBlockIds = queue;
    rejected(level, 'invalid-generator-queue');
  }
});

test('malformed top-level collections produce diagnostic failures', () => {
  for (const level of [null, undefined, [], 'level']) rejected(level, 'invalid-level');
  rejected({ id: 35, generators: {} }, 'invalid-generators');
  rejected({ id: 35, generators: [{ id: 'g', queueBlockIds: [] }] }, 'invalid-blocks');
  rejected({ id: 35, blocks: [], generators: [null] }, 'invalid-generator');
});

test('auditing deeply frozen specs never mutates the input, including failed specs', () => {
  for (const level of [fixture([['red', 'blue']]), fixture([['red', 'red']])]) {
    const original = structuredClone(level);
    deepFreeze(level);
    audit(level);
    assert.deepEqual(level, original);
  }
});

test('report arrays and records do not share references with input or another report', () => {
  const level = fixture([['red', 'red']]);
  const original = structuredClone(level);
  const first = audit(level);
  const second = audit(level);
  first.generators[0].queue[0].color = 'blue';
  first.generators[0].queue.push({ index: 3, blockId: 'extra', color: 'blue' });
  first.generators[0].sameColorPairs[0].color = 'purple';
  first.issues[0].color = 'green';
  first.stats.queuedBlocks = 99;
  assert.deepEqual(level, original);
  assert.deepEqual(second, audit(original));
  const secondBefore = structuredClone(second);
  level.blocks[0].color = 'yellow';
  level.generators[0].queueBlockIds.reverse();
  assert.deepEqual(second, secondBefore);
});

test('500 deterministic randomized authored queues agree with an independent pair oracle', () => {
  let seed = 0x1292026;
  const random = limit => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) % limit;
  };
  for (let sample = 0; sample < 500; sample++) {
    const outerQueues = Array.from({ length: random(7) }, () =>
      Array.from({ length: random(31) }, () => PALETTE[random(PALETTE.length)]));
    const authorQueues = outerQueues.map(queue => queue.map(outer => {
      if (random(2) === 0) return outer;
      const index = PALETTE.indexOf(outer);
      const inner = PALETTE[(index + 1 + random(7)) % 8];
      return { color: inner, layers: [outer, inner] };
    }));
    const expected = outerQueues.map((queue, machine) => ({
      generatorId: `g${machine}`,
      queue: queue.map((color, index) => ({ index: index + 1, blockId: `g${machine}-q${index}`, color })),
      pairsChecked: Math.max(0, queue.length - 1),
      sameColorPairs: queue.flatMap((color, index) => index > 0 && color === queue[index - 1]
        ? [{ queueIndex: index + 1, previousBlockId: `g${machine}-q${index - 1}`, blockId: `g${machine}-q${index}`, color }]
        : []),
    }));
    const report = audit(fixture(authorQueues));
    assert.deepEqual(report.generators, expected, `sample ${sample}`);
    const violations = expected.reduce((sum, generator) => sum + generator.sameColorPairs.length, 0);
    assert.deepEqual(report.stats, {
      generators: expected.length,
      queuedBlocks: outerQueues.reduce((sum, queue) => sum + queue.length, 0),
      adjacentPairs: expected.reduce((sum, generator) => sum + generator.pairsChecked, 0),
      consecutiveSameColorPairs: violations,
    }, `sample ${sample}`);
    assert.equal(report.passed, violations === 0, `sample ${sample}`);
    assert.equal(report.issues.length, violations, `sample ${sample}`);
  }
});
