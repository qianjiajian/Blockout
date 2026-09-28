import test from 'node:test';
import assert from 'node:assert/strict';
import {packLayoutJson, unpackLayoutJson} from './revised-layout-packing.mjs';

test('preserves optional fields, array order, Unicode, negatives, and all false/zero values', () => {
  const data = {1: {gates: [], blocks: Array.from({length: 12}, (_, i) => ({id: `块-${i}`,
    x: -1, y: 0, enabled: false, shape: [[0, 0], [1, 0]], layers: ['red', 'blue']}))}};
  const packed = packLayoutJson(data);
  assert.deepEqual(unpackLayoutJson(packed.text, packed.dictionary), data);
  assert(packed.packedBytes < packed.originalBytes);
});

test('markers do not confuse dictionary indices 1 and 10', () => {
  const dictionary = Array.from({length: 40}, (_, i) => JSON.stringify(`value-${i}`));
  assert.deepEqual(unpackLayoutJson('[~1;,~10;,~z;]', dictionary), ['value-1', 'value-36', 'value-35']);
});

test('reserves marker input rather than silently altering authored text', () => {
  assert.throws(() => packLayoutJson({id: 'bad~id'}), /Reserved/);
});

test('empty and nonrepeating JSON remains valid without a dictionary', () => {
  for (const input of [{}, [], null, {x: 1}]) {
    const packed = packLayoutJson(input);
    assert.deepEqual(unpackLayoutJson(packed.text, packed.dictionary), input);
  }
});
