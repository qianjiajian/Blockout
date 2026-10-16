import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {decodeLayoutBytes, encodeLayoutBytes, layoutChecksum} from '../tools/wechat-layout-codec.mjs';

const UNDEFINED = '\u0000blockout-undefined';
const hash = text => createHash('sha256').update(text).digest('hex');
const FORMAL_REGISTRIES = ['FORMAL_201_210_LEVELS', 'FORMAL_211_220_LEVELS', 'FORMAL_221_230_LEVELS'];

// Do not serialize bundled functions with toString(): esbuild can rename their
// closed-over LEVELS binding (for example LEVELS2). Keep this small runtime
// adapter explicit and compare its return values and errors with the authored
// exports below before accepting any generated module.
const LOOKUPS = `
export const getLevelStrict = (id) => {
  const normalized = Number(id);
  if (!Number.isInteger(normalized)) throw new RangeError(\`Unknown level id \${id}; expected an integer from 1-\${LEVELS.length}\`);
  const level = LEVELS.find((candidate) => candidate.id === normalized);
  if (!level) throw new RangeError(\`Unknown level id \${id}; expected 1-\${LEVELS.length}\`);
  return level;
};
export const getLevel = (id) => getLevelStrict(
  Math.max(1, Math.min(LEVELS.length, Math.floor(Number(id)) || 1)),
);
`;

function lookupResult(lookup, value) {
  try { return {level: lookup(value)}; }
  catch (error) { return {error: error.constructor.name, message: error.message}; }
}

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
 * ship the final campaign plus the three accepted temporary-test registries.
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
  const registries = Object.fromEntries(['LEVELS', ...FORMAL_REGISTRIES].map(name => [name, original[name]]));
  const json = JSON.stringify(toJson(registries));
  const packed = encodeLayoutBytes(json);
  const restored = restoreLevelJson(JSON.parse(decodeLayoutBytes(packed.base64, packed.outputLength, packed.checksum)));
  assert.deepEqual(restored, registries, 'Build-time level materialization changed gameplay');
  assert.equal(restored.LEVELS.length, 200);
  assert.deepEqual(restored.LEVELS.map(level => level.id), Array.from({length: 200}, (_, i) => i + 1));
  for (const [index, name] of FORMAL_REGISTRIES.entries()) {
    assert.deepEqual(restored[name].map(level => level.id), Array.from({length: 10}, (_, i) => 201 + index * 10 + i));
  }
  const source = `${layoutChecksum.toString()}\n${decodeLayoutBytes.toString()}\n${restoreLevelJson.toString()}\n` +
    `const registries=restoreLevelJson(JSON.parse(decodeLayoutBytes(${JSON.stringify(packed.base64)},${packed.outputLength},${packed.checksum})));\n` +
    Object.keys(registries).map(name => `export const ${name}=${Object.isFrozen(original[name]) ? 'Object.freeze(' : ''}registries.${name}${Object.isFrozen(original[name]) ? ')' : ''};\n`).join('') +
    LOOKUPS;
  // Test the exact generated module, not only the encoder's intermediate data.
  const compiled = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  for (const name of Object.keys(registries)) {
    assert.deepEqual(compiled[name], original[name]);
    assert.equal(Object.isFrozen(compiled[name]), Object.isFrozen(original[name]));
  }
  for (const level of original.LEVELS) {
    assert.equal(compiled.getLevelStrict(level.id), compiled.LEVELS[level.id - 1]);
    assert.deepEqual(compiled.getLevel(level.id), level);
  }
  const lookupInputs = [
    ...Array.from({length: 234}, (_, i) => i - 2),
    ...Array.from({length: 230}, (_, i) => String(i + 1)),
    -Infinity, Infinity, NaN, -0, -1.5, 1.5, 199.9, 200.9, 201.5,
    undefined, null, '', ' ', 'bad', true, false, [], [2], {}, Symbol('id'), 201n,
  ];
  for (const name of ['getLevel', 'getLevelStrict']) for (const value of lookupInputs) {
    assert.deepEqual(lookupResult(compiled[name], value), lookupResult(original[name], value), `${name} semantics changed`);
  }
  const sourceInputs = [...Object.keys(result.metafile.inputs).map(path => resolve(root, path)), ...helperPaths];
  const inputHashes = await Promise.all(sourceInputs.map(async path => ({path, before: inputSnapshot.get(path), after: hash(await readFile(path))})));
  assert(inputHashes.every(input => input.before && input.before === input.after), 'Campaign source changed during WeChat level materialization');
  return {source, original, compiled, report: {levelCount: restored.LEVELS.length, exactDataEqual: true,
    formalRegistries: FORMAL_REGISTRIES.map(name => ({name, count: compiled[name].length,
      ids: compiled[name].map(level => level.id), sha256: hash(JSON.stringify(compiled[name]))})),
    temporaryTestLevelCount: Object.values(registries).reduce((sum, levels) => sum + levels.length, 0),
    lookupSemanticsEqual: true,
    levelJsonSha256: hash(JSON.stringify(original.LEVELS)), generatedModuleSha256: hash(source),
    jsonBytes: Buffer.byteLength(json), packedBytes: packed.encodedBytes,
    codec: 'ascii-lz77-base64-adler32-v1', asciiBytes: packed.outputLength,
    compressedBytes: packed.bytes, adler32: packed.checksum,
    sourceInputsStable: true, sourceInputsSha256: hash(JSON.stringify(inputHashes.map(({path, after}) => [path, after]))),
    inputCount: Object.keys(result.metafile.inputs).length,
    referenceAliasesPreserved: false,
    note: 'Exact plain data and lookup behavior; historical shared shape-array identities are not serialized. PuzzleModel clones shapes.'}};
}
