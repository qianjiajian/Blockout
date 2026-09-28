import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DIFFICULTY_RULE_VERSION, DIFFICULTY_BANDS, difficultyBand} from './difficulty-bands-v132.mjs';

const expected = {easy: [3, 5], normal: [6, 10], hard: [11, 15], super: [16, 25]};

test('v1.32 authoring targets match all four inclusive user ranges', () => {
  assert.equal(DIFFICULTY_RULE_VERSION, '1.32.0');
  assert.deepEqual(Object.keys(DIFFICULTY_BANDS), Object.keys(expected));
  for (const [name, [min, max]] of Object.entries(expected)) {
    assert.deepEqual(difficultyBand(name), {min, max});
  }
});

test('all integers 3 through 25 belong to exactly one target band; 0–2 and 26 do not', () => {
  for (let count = 0; count <= 26; count++) {
    const matches = Object.values(DIFFICULTY_BANDS).filter(({min, max}) => count >= min && count <= max);
    assert.equal(matches.length, count >= 3 && count <= 25 ? 1 : 0, `count ${count}`);
  }
});

test('unknown names cannot silently become normal or easy', () => {
  for (const value of ['superHard', 'medium', '__proto__', 'constructor', '', null, undefined, 3, {}]) {
    assert.throws(() => difficultyBand(value), RangeError);
  }
});

test('ranges and their lookup table are immutable', () => {
  assert(Object.isFrozen(DIFFICULTY_BANDS));
  for (const band of Object.values(DIFFICULTY_BANDS)) {
    assert(Object.isFrozen(band));
    assert.throws(() => {band.min = 0;}, TypeError);
  }
  assert.throws(() => {DIFFICULTY_BANDS.easy = {min: 0, max: 99};}, TypeError);
});

test('numeric authoring targets match the frozen v1.32 table, not inherited old ranges', () => {
  const document = fs.readFileSync('docs/mechanism-rules-v1.32.0.md', 'utf8');
  const current = document.split('## 承继v1.31：')[0];
  const labels = {easy: '简单', normal: '普通', hard: '困难', super: '超难'};
  for (const [name, [min, max]] of Object.entries(expected)) {
    assert(current.includes(`| ${labels[name]} | ${min}–${max}次 | ${min} | ${max} |`));
  }
});
