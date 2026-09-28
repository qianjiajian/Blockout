import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {layoutChecksum, encodeLayoutBytes, decodeLayoutBytes} from './wechat-layout-codec.mjs';
import {createWechatLevelModule, restoreLevelJson} from '../scripts/wechat-level-data.mjs';

const raw = bytes => Buffer.from(bytes).toString('base64').replace(/=+$/, '');
const decode = encoded => decodeLayoutBytes(encoded.base64, encoded.outputLength, encoded.checksum);
function roundtrip(value) {
  const encoded = encodeLayoutBytes(JSON.stringify(value));
  assert.deepEqual(JSON.parse(decode(encoded)), value);
  return encoded;
}
function referenceChecksum(text) {
  let a = 1, b = 0;
  for (let i = 0; i < text.length; i++) { a = (a + text.charCodeAt(i)) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}
function matches(encoded) {
  const bytes = Buffer.from(encoded.base64, 'base64'), result = []; let i = 0;
  while (i < bytes.length) {
    const flag = bytes[i++];
    if (flag < 128) i += flag + 1;
    else { result.push({length: (flag & 127) + 3, distance: bytes[i] | bytes[i + 1] << 8}); i += 2; }
  }
  return result;
}
let seed = 0x75a92bff;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
const alphabet = ['a', 'Z', '0', '\n', '\0', '\\', '"', '中', 'é', '\u007f', '\u0080', '\u2028', '🧩', '\ud800', '\udfff'];
const text = length => Array.from({length}, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
function randomValue(depth = 0) {
  switch (Math.floor(random() * (depth < 4 ? 7 : 5))) {
    case 0: return null; case 1: return random() < 0.5;
    case 2: return Math.floor((random() - 0.5) * 1e12); case 3: return random() * 1e-20;
    case 4: return text(Math.floor(random() * 40));
    case 5: return Array.from({length: Math.floor(random() * 8)}, () => randomValue(depth + 1));
    default: return Object.fromEntries(Array.from({length: Math.floor(random() * 8)}, (_, i) => [i + text(4), randomValue(depth + 1)]));
  }
}

test('empty valid JSON values, primitives, and raw empty byte stream', () => {
  for (const value of [null, true, false, '', [], {}, 0, -12, 1.4, 1e-20]) roundtrip(value);
  assert.equal(decodeLayoutBytes('', 0, 1), '');
  assert.throws(() => encodeLayoutBytes('')); assert.throws(() => encodeLayoutBytes('undefined'));
});
test('all UTF-16 code units, emoji, lone surrogates, escapes and property keys survive', () => {
  const all = Array.from({length: 65536}, (_, i) => String.fromCharCode(i)).join('');
  roundtrip({[all]: all, emoji: '🧩🙂', lone: '\ud800A\udfff', escaped: '\\u4e2d\\"\n\t\0'});
  for (const json of ['"' + '\ud800' + '"', '"' + '\udfff' + '"']) assert.deepEqual(JSON.parse(decode(encodeLayoutBytes(json))), JSON.parse(json));
});
test('500 seeded nested random JSON values', () => { for (let i = 0; i < 500; i++) roundtrip(randomValue()); });
test('literal and decoded text chunk boundaries', () => {
  for (const length of [1, 127, 128, 129, 8191, 8192, 8193, 16384]) roundtrip(text(length));
});
test('multi-megabyte repetition supports overlapping distance-one references', () => {
  const encoded = roundtrip({data: 'a'.repeat(2_000_000), other: Array.from({length: 8000}, () => ({a: 1, b: '中文'}))});
  assert(matches(encoded).some(match => match.distance === 1 && match.length === 130));
  assert(encoded.bytes < encoded.outputLength / 10);
});
test('65535 distance boundary is emitted; 65536 distance does not wrap', () => {
  const prefix = Array.from({length: 300}, () => String.fromCharCode(33 + Math.floor(random() * 88))).join('').replace(/["\\]/g, 'x');
  const exact = roundtrip(prefix + '~'.repeat(65535 - prefix.length) + prefix);
  assert.equal(Math.max(...matches(exact).map(match => match.distance)), 65535);
  const outside = roundtrip(prefix + '~'.repeat(65536 - prefix.length) + prefix);
  assert(matches(outside).every(match => match.distance > 0 && match.distance <= 65535));
});
test('Adler32 vectors and block-size boundary match an independent byte-by-byte implementation', () => {
  assert.equal(layoutChecksum(''), 1); assert.equal(layoutChecksum('Wikipedia'), 0x11e60398);
  for (const length of [1, 5551, 5552, 5553, 11104, 2_000_000]) {
    const value = '~'.repeat(length); assert.equal(layoutChecksum(value), referenceChecksum(value));
  }
  const encoded = encodeLayoutBytes('"中文🧩"');
  assert.equal(encoded.checksum, referenceChecksum('"\\u4e2d\\u6587\\ud83e\\udde9"'));
});
test('checksum is mandatory; legal literal mutation and wrong expected checksum are rejected', () => {
  assert.equal(decodeLayoutBytes('ADA', 1, layoutChecksum('0')), '0');
  assert.throws(() => decodeLayoutBytes('ADE', 1, layoutChecksum('0')), /checksum/);
  assert.throws(() => decodeLayoutBytes('ADA', 1, layoutChecksum('1')), /checksum/);
  assert.throws(() => decodeLayoutBytes('', 0, 0), /checksum/);
  for (const checksum of [undefined, null, -1, 1.2, NaN, Infinity, 4294967296, '1']) assert.throws(() => decodeLayoutBytes('', 0, checksum), /header/);
});
test('canonical unpadded base64: reject length%4=1 and unused low bits in both final-sextet forms', () => {
  assert.throws(() => decodeLayoutBytes('A', 0, 1), /header/);
  assert.throws(() => decodeLayoutBytes('AAAAA', 4, 1), /header/);
  assert.throws(() => decodeLayoutBytes('ADB', 1, layoutChecksum('0')), /Noncanonical/);
  const canonical = raw([2, 97, 98, 99]);
  assert.equal(decodeLayoutBytes(canonical, 3, layoutChecksum('abc')), 'abc');
  assert.equal(canonical, 'AmFiYw');
  assert.throws(() => decodeLayoutBytes('AmFiYx', 3, layoutChecksum('abc')), /Noncanonical/);
});
test('reject invalid alphabet, whitespace and padded base64', () => {
  for (const value of ['!', 'AD A', 'ADA=', 'ADA\n', 'ADé']) assert.throws(() => decodeLayoutBytes(value, 1, layoutChecksum('0')));
});
test('reject malformed LZ tokens, unavailable references and wrong output length', () => {
  for (const [bytes, length] of [[[4, 65], 5], [[1, 65, 66], 1], [[128], 3], [[128, 1], 3], [[128, 0, 0], 3], [[128, 1, 0], 3], [[0, 65, 128, 1, 0], 3], [[0, 65], 2]]) {
    assert.throws(() => decodeLayoutBytes(raw(bytes), length, 1));
  }
});
test('reject invalid types and hostile allocation headers before allocating', () => {
  for (const length of [-1, 0.5, NaN, Infinity, undefined, null, '0', 16777217, Number.MAX_SAFE_INTEGER]) assert.throws(() => decodeLayoutBytes('', length, 1), /header/);
  for (const base64 of [undefined, null, {}, [], 0]) assert.throws(() => decodeLayoutBytes(base64, 0, 1), /header/);
  assert.throws(() => decodeLayoutBytes('AAAA', 0, 1), /length/);
});
test('emitted decoder/checksum run in an isolated runtime without native or Node APIs', () => {
  const decoder = vm.runInNewContext(`(()=>{${layoutChecksum.toString()};return (${decodeLayoutBytes.toString()})})()`, {Buffer: undefined, atob: undefined, TextDecoder: undefined, process: undefined, require: undefined});
  const encoded = encodeLayoutBytes(JSON.stringify({unicode: '中文🧩', long: 'abc'.repeat(20000)}));
  assert.equal(decoder(encoded.base64, encoded.outputLength, encoded.checksum), decode(encoded));
});
test('current build-time sentinel serializer preserves own undefined and array entries through codec', () => {
  const source = readFileSync(new URL('../scripts/wechat-level-data.mjs', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('function toJson('), source.indexOf('\nexport function restoreLevelJson'));
  const toJson = new Function('assert', 'UNDEFINED', `return (${body});`)(assert, '\u0000blockout-undefined');
  const original = {a: undefined, b: [undefined, null, {c: undefined}], tail: false};
  const restored = restoreLevelJson(JSON.parse(decode(encodeLayoutBytes(JSON.stringify(toJson(original))))));
  assert.deepEqual(restored, original); assert(Object.hasOwn(restored, 'a')); assert(Object.hasOwn(restored.b, 0));
  assert.throws(() => toJson({reserved: '\u0000blockout-undefined'}));
});
test('fresh complete 200-level module preserves every authored field and reports stable source inputs', async () => {
  const {original, compiled, source, report} = await createWechatLevelModule();
  assert.equal(report.levelCount, 200); assert.equal(report.sourceInputsStable, true);
  assert.equal(report.codec, 'ascii-lz77-base64-adler32-v1');
  assert.deepEqual(compiled.LEVELS, original.LEVELS);
  assert.equal(report.sourceInputsSha256.length, 64);
  assert(!/node:|require\(|atob\(|Buffer\.|TextDecoder/.test(source));
  assert(report.packedBytes < report.jsonBytes / 4);
  for (const level of original.LEVELS) { assert.equal(compiled.getLevelStrict(level.id), compiled.LEVELS[level.id - 1]); assert.deepEqual(compiled.getLevel(level.id), level); }
});
test('WeChat source fingerprint tracks the exact new codec instead of the historical dictionary helper', () => {
  const source = readFileSync(new URL('../scripts/wechat-build-integrity.mjs', import.meta.url), 'utf8');
  assert(source.includes('"tools/wechat-layout-codec.mjs"'));
  assert(!source.includes('"tools/revised-layout-packing.mjs"'));
});
