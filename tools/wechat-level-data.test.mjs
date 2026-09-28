import test from 'node:test';
import assert from 'node:assert/strict';
import {createWechatLevelModule, restoreLevelJson} from '../scripts/wechat-level-data.mjs';

test('materialized WeChat campaign equals all 200 authored final levels and lookup semantics', async () => {
  const {original, compiled, report, source} = await createWechatLevelModule();
  assert.equal(report.levelCount, 200);
  assert.equal(report.exactDataEqual, true);
  assert.deepEqual(compiled.LEVELS, original.LEVELS);
  for (const value of [-4, 0, 1, 2, 5, 20, 21, 200, 201, NaN, Infinity, '22', undefined, null]) {
    assert.deepEqual(compiled.getLevel(value), original.getLevel(value));
  }
  for (const value of [-1, 0, 1.5, 201, NaN, Infinity, undefined]) {
    assert.throws(() => compiled.getLevelStrict(value), RangeError);
    assert.throws(() => original.getLevelStrict(value), RangeError);
  }
  assert(!/node:|require\(|atob\(|Buffer\./.test(source), 'Decoder must work in the actual mini-game JS runtime');
  assert(report.packedBytes < report.jsonBytes * 0.75);
});

test('explicit undefined own properties survive (JSON.parse revivers would incorrectly delete them)', () => {
  const value = restoreLevelJson({x: '\u0000blockout-undefined', queue: ['\u0000blockout-undefined']});
  assert(Object.hasOwn(value, 'x'));
  assert.equal(value.x, undefined);
  assert.deepEqual(value.queue, [undefined]);
  assert(Object.hasOwn(value.queue, 0));
});
