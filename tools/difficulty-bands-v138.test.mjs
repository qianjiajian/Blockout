import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DIFFICULTY_RULE_VERSION, DIFFICULTY_BANDS, difficultyBand} from './difficulty-bands-v138.mjs';

const expected = {easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30]};

test('v1.38 authoring targets match all four inclusive user ranges', () => {
  assert.equal(DIFFICULTY_RULE_VERSION, '1.38.0');
  assert.deepEqual(Object.keys(DIFFICULTY_BANDS), Object.keys(expected));
  for (const [key, [min, max]] of Object.entries(expected)) {
    assert.deepEqual(difficultyBand(key), {min, max});
  }
});

test('integers 5 through 30 each belong to one band; 0–4 and 31 do not', () => {
  for (let n = 0; n <= 31; n++) {
    const matches = Object.values(DIFFICULTY_BANDS).filter(({min, max}) => n >= min && n <= max);
    assert.equal(matches.length, n >= 5 && n <= 30 ? 1 : 0, `count ${n}`);
  }
});

test('unknown difficulty never silently defaults', () => {
  for (const key of ['superHard', 'medium', '__proto__', 'constructor', '', null, undefined, 3, {}]) {
    assert.throws(() => difficultyBand(key), RangeError);
  }
});

test('target lookup and each range are immutable', () => {
  assert(Object.isFrozen(DIFFICULTY_BANDS));
  for (const band of Object.values(DIFFICULTY_BANDS)) {
    assert(Object.isFrozen(band));
    assert.throws(() => {band.min = 0;}, TypeError);
  }
  assert.throws(() => {DIFFICULTY_BANDS.easy = {min: 0, max: 99};}, TypeError);
});

test('targets match the new frozen table, not the inherited old ranges', () => {
  const current = fs.readFileSync('docs/mechanism-rules-v1.38.0.md', 'utf8').split('## 承继v1.37：')[0];
  const labels = {easy: '简单', normal: '普通', hard: '困难', super: '超难'};
  for (const [key, [min, max]] of Object.entries(expected)) {
    assert(current.includes(`| ${labels[key]} | ${min}–${max}次 | ${min} | ${max} |`));
  }
});
