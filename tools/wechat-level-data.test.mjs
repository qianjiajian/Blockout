import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
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

test('materialized registries power the real temporary selector without extending the production campaign', async () => {
  const {original, source, report} = await createWechatLevelModule();
  const names = ['LEVELS', 'FORMAL_201_210_LEVELS', 'FORMAL_211_220_LEVELS', 'FORMAL_221_230_LEVELS'];
  const result = await build({
    stdin: {
      contents: `export {${names.join(',')},getLevel,getLevelStrict} from './src/core/levels.ts';
        export * from './src/game/temporaryTestLevelCatalog.ts';`,
      resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: 'esm', platform: 'browser',
    plugins: [{name: 'actual-wechat-materialized-levels', setup(bundler) {
      bundler.onLoad({filter: /[\\/]src[\\/]core[\\/]levels\.ts$/}, ({path}) => {
        assert.equal(path, resolve('src/core/levels.ts'));
        return {contents: source, loader: 'js'};
      });
    }}],
  });
  const compiled = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  assert.equal(report.temporaryTestLevelCount, 230);
  assert.equal(report.lookupSemanticsEqual, true);
  assert.equal(report.formalRegistries.length, 3);
  assert.equal(compiled.TEMPORARY_TEST_LEVEL_COUNT, 230);
  assert.deepEqual(compiled.TEMPORARY_TEST_LEVEL_IDS, Array.from({length: 230}, (_, i) => i + 1));
  for (const name of names) {
    assert.deepEqual(compiled[name], original[name]);
    assert.equal(Object.isFrozen(compiled[name]), Object.isFrozen(original[name]));
    for (const level of compiled[name]) {
      assert.equal(compiled.getTemporaryTestLevelStrict(level.id), level, `${name}/${level.id} must retain registry identity`);
      if (level.id <= 200) assert.equal(compiled.getLevelStrict(level.id), level);
      else assert.throws(() => compiled.getLevelStrict(level.id), RangeError);
    }
  }
  assert.equal(compiled.getLevel(230), compiled.LEVELS[199]);
  assert.equal(compiled.getAdjacentTemporaryTestLevelId(200, 1), 201);
  assert.equal(compiled.getAdjacentTemporaryTestLevelId(210, 1), 211);
  assert.equal(compiled.getAdjacentTemporaryTestLevelId(220, 1), 221);
  assert.equal(compiled.getAdjacentTemporaryTestLevelId(230, 1), 230);
  for (const value of [0, 231, 201.5, '201', undefined, NaN]) {
    assert.throws(() => compiled.getTemporaryTestLevelStrict(value), RangeError);
  }
});

test('explicit undefined own properties survive (JSON.parse revivers would incorrectly delete them)', () => {
  const value = restoreLevelJson({x: '\u0000blockout-undefined', queue: ['\u0000blockout-undefined']});
  assert(Object.hasOwn(value, 'x'));
  assert.equal(value.x, undefined);
  assert.deepEqual(value.queue, [undefined]);
  assert(Object.hasOwn(value.queue, 0));
});
