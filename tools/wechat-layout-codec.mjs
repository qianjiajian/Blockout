import assert from 'node:assert/strict';

/** Adler-32 over the ASCII-escaped JSON, not the original UTF-8 source.
 * Detects accidental corruption only; the build manifest supplies SHA-256.
 * This helper and the decoder are emitted verbatim into the mini-game bundle.
 */
export function layoutChecksum(text) {
  let a = 1, b = 0;
  for (let start = 0; start < text.length; start += 5552) {
    const end = Math.min(start + 5552, text.length);
    for (let i = start; i < end; i++) { a += text.charCodeAt(i); b += a; }
    a %= 65521; b %= 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** Pure ECMAScript decoder: no Buffer, atob, TextDecoder, native compression,
 * filesystem, or platform APIs. Wire format is canonical unpadded base64 of
 * literal runs (1..128 bytes) / overlapping LZ matches (3..130, distance<=65535).
 * The explicit 16MiB limit rejects hostile allocation headers before allocating;
 * the encoder applies the same bound. The current campaign is under 1MiB.
 */
export function decodeLayoutBytes(base64, outputLength, expectedChecksum) {
  if (typeof base64 !== 'string' || base64.length % 4 === 1 ||
      !Number.isInteger(outputLength) || outputLength < 0 || outputLength > 16777216 ||
      !Number.isInteger(expectedChecksum) || expectedChecksum < 0 || expectedChecksum > 4294967295) {
    throw Error('Invalid packed layout header');
  }
  const byteCount = Math.floor(base64.length * 3 / 4);
  // Every legal token consumes no more than two bytes per output byte.
  if (byteCount > outputLength * 2) throw Error('Invalid packed layout length');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const binary = new Uint8Array(byteCount), out = new Uint8Array(outputLength);
  let count = 0, bits = 0, acc = 0;
  for (let i = 0; i < base64.length; i++) {
    const value = alphabet.indexOf(base64[i]);
    if (value < 0) throw Error('Invalid packed layout base64');
    acc = (acc << 6) | value; bits += 6;
    if (bits >= 8) { bits -= 8; binary[count++] = (acc >> bits) & 255; }
  }
  if (bits && (acc & ((1 << bits) - 1))) throw Error('Noncanonical packed layout base64');
  let source = 0, target = 0;
  while (source < count) {
    const flag = binary[source++];
    if (flag < 128) {
      const length = flag + 1;
      if (source + length > count || target + length > outputLength) throw Error('Packed literal overflow');
      for (let i = 0; i < length; i++) out[target++] = binary[source++];
    } else {
      if (source + 2 > count) throw Error('Packed match truncated');
      const length = (flag & 127) + 3, distance = binary[source++] | (binary[source++] << 8);
      if (!distance || distance > target || target + length > outputLength) throw Error('Packed match overflow');
      for (let i = 0; i < length; i++) { out[target] = out[target - distance]; target++; }
    }
  }
  if (target !== outputLength) throw Error('Packed layout length');
  let text = '';
  for (let i = 0; i < out.length; i += 8192) text += String.fromCharCode(...out.subarray(i, i + 8192));
  if (layoutChecksum(text) !== expectedChecksum) throw Error('Packed layout checksum');
  return text;
}

/** Node build-time encoder only. Unicode is escaped per UTF-16 code unit so
 * emoji, lone surrogates, and already escaped JSON survive without TextDecoder.
 * Input must be valid JSON text; explicit undefined is handled by the caller's
 * pre-existing sentinel serializer, not silently dropped here.
 */
export function encodeLayoutBytes(json) {
  assert.equal(typeof json, 'string');
  const original = JSON.parse(json);
  const ascii = json.replace(/[\u007f-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
  assert(ascii.length <= 16777216, 'Packed layout exceeds 16MiB codec limit');
  const input = Buffer.from(ascii, 'ascii');
  const head = new Int32Array(65536).fill(-1), prev = new Int32Array(input.length).fill(-1), output = [];
  const key = p => ((input[p] * 251 + input[p + 1]) * 251 + input[p + 2]) & 65535;
  const insert = p => { if (p + 2 < input.length) { const k = key(p); prev[p] = head[k]; head[k] = p; } };
  let p = 0, literals = [];
  const flush = () => { if (literals.length) { output.push(literals.length - 1, ...literals); literals = []; } };
  while (p < input.length) {
    let length = 0, distance = 0, checks = 0;
    if (p + 3 < input.length) {
      for (let q = head[key(p)]; q >= 0 && p - q <= 65535 && checks++ < 128; q = prev[q]) {
        let n = 0;
        while (n < 130 && p + n < input.length && input[q + n] === input[p + n]) n++;
        if (n > length) { length = n; distance = p - q; if (length === 130) break; }
      }
    }
    if (length >= 4) {
      flush(); output.push(128 | (length - 3), distance & 255, distance >> 8);
      for (let n = 0; n < length; n++) insert(p + n);
      p += length;
    } else { literals.push(input[p]); insert(p++); if (literals.length === 128) flush(); }
  }
  flush();
  const base64 = Buffer.from(output).toString('base64').replace(/=+$/, '');
  const checksum = layoutChecksum(ascii);
  assert.equal(decodeLayoutBytes(base64, input.length, checksum), ascii);
  assert.deepEqual(JSON.parse(ascii), original);
  return {base64, outputLength: input.length, checksum, bytes: output.length, encodedBytes: base64.length};
}
