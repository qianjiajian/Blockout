import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {decodeLayoutBytes, encodeLayoutBytes, layoutChecksum} from '../tools/wechat-layout-codec.mjs';

const UNDEFINED = '\u0000blockout-undefined';
const hash = text => createHash('sha256').update(text).digest('hex');

function toJson(value) {
  if (value === undefined) return UNDEFINED;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    assert(Number.isFinite(value) && !Object.is(value, -0), 'Unsupported numeric level value');
    return value;
  }
  if (typeof value === 'string') { assert(value !== UNDEFINED); return value; }
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'Symbol level fields unsupported');
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (Array.isArray(value) && key === 'length') continue;
    assert(descriptor.enumerable && !descriptor.get && !descriptor.set, 'Hidden/accessor level fields unsupported');
  }
  if (Array.isArray(value)) {
    assert.equal(Object.keys(value).length, value.length, 'Sparse/augmented level arrays unsupported');
    return value.map(toJson);
  }
  assert(value && Object.getPrototypeOf(value) === Object.prototype, 'Only plain level records may be baked');
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJson(item)]));
}

export function restoreLevelJson(value) {
  if (value === '\u0000blockout-undefined') return undefined;
  if (Array.isArray(value)) return value.map(restoreLevelJson);
  if (value && typeof value === 'object') for (const key of Object.keys(value)) value[key] = restoreLevelJson(value[key]);
  return value;
}

async function snapshotSources(directory, records = new Map()) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await snapshotSources(path, records);
    else records.set(path, hash(await readFile(path)));
  }
  return records;
}

/** Evaluate authored overlays at build time. No authored data is replaced;
 * production code imports only the final campaign and the same two lookups.
 * Every property, explicit undefined, array order, and level metadata is checked.
 */
export async function createWechatLevelModule(root = process.cwd()) {
  // Snapshot before esbuild reads its graph. Only graph inputs are compared at
  // the end, so unrelated UI work does not invalidate this isolated data test.
  const inputSnapshot = await snapshotSources(resolve(root, 'src'));
  const helperPaths = ['scripts/wechat-level-data.mjs', 'tools/wechat-layout-codec.mjs'].map(path => resolve(root, path));
  for (const path of helperPaths) inputSnapshot.set(path, hash(await readFile(path)));
  const result = await build({entryPoints: [resolve(root, 'src/core/levels.ts')],
    bundle: true, write: false, format: 'esm', platform: 'node', metafile: true});
  const original = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  const json = JSON.stringify(toJson(original.LEVELS));
  const packed = encodeLayoutBytes(json);
  const restored = restoreLevelJson(JSON.parse(decodeLayoutBytes(packed.base64, packed.outputLength, packed.checksum)));
  assert.deepEqual(restored, original.LEVELS, 'Build-time campaign materialization changed gameplay');
  assert.equal(restored.length, 200);
  assert.deepEqual(restored.map(level => level.id), Array.from({length: 200}, (_, i) => i + 1));
  const source = `${layoutChecksum.toString()}\n${decodeLayoutBytes.toString()}\n${restoreLevelJson.toString()}\n` +
    `export const LEVELS=restoreLevelJson(JSON.parse(decodeLayoutBytes(${JSON.stringify(packed.base64)},${packed.outputLength},${packed.checksum})));\n` +
    `export const getLevelStrict=${original.getLevelStrict.toString()};\nexport const getLevel=${original.getLevel.toString()};\n`;
  // Test the exact generated module, not only the encoder's intermediate data.
  const compiled = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.deepEqual(compiled.LEVELS, original.LEVELS);
  for (const level of original.LEVELS) {
    assert.equal(compiled.getLevelStrict(level.id), compiled.LEVELS[level.id - 1]);
    assert.deepEqual(compiled.getLevel(level.id), level);
  }
  const sourceInputs = [...Object.keys(result.metafile.inputs).map(path => resolve(root, path)), ...helperPaths];
  const inputHashes = await Promise.all(sourceInputs.map(async path => ({path, before: inputSnapshot.get(path), after: hash(await readFile(path))})));
  assert(inputHashes.every(input => input.before && input.before === input.after), 'Campaign source changed during WeChat level materialization');
  return {source, original, compiled, report: {levelCount: restored.length, exactDataEqual: true,
    levelJsonSha256: hash(JSON.stringify(original.LEVELS)), generatedModuleSha256: hash(source),
    jsonBytes: Buffer.byteLength(json), packedBytes: packed.encodedBytes,
    codec: 'ascii-lz77-base64-adler32-v1', asciiBytes: packed.outputLength,
    compressedBytes: packed.bytes, adler32: packed.checksum,
    sourceInputsStable: true, sourceInputsSha256: hash(JSON.stringify(inputHashes.map(({path, after}) => [path, after]))),
    inputCount: Object.keys(result.metafile.inputs).length,
    referenceAliasesPreserved: false,
    note: 'Exact plain data and lookup behavior; historical shared shape-array identities are not serialized. PuzzleModel clones shapes.'}};
}
