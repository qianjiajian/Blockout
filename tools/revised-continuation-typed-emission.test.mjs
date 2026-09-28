import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {bytesSha256, DATA_PATH, parsePreparedPatch, transformPreparedSource, diagnoseTypedSource,
  prepareTypedContinuationEmission, verifyTypedContinuationEmission} from './revised-continuation-typed-emission.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const digest = value => bytesSha256(JSON.stringify(canonical(value)));
const sha = p => bytesSha256(fs.readFileSync(p));
const HEADER = "// Generated from independently reviewed v1.10 continuation batches; routes remain in evidence.\n" +
  "import type { RevisedLevelLayout } from './revisedReviewedLayouts.generated';\n" +
  'export const REVISED_CONTINUATION_LAYOUTS: Record<number, RevisedLevelLayout> = {\n';
const originalDataHash = sha(DATA_PATH);
function fixture(change = () => {}) {
  const layouts = {138: {mechanismRules: 'revised-2026-09-21-v1.2', width: 3, height: 3,
    gates: [{id: 'green', color: 'green', side: 'left', offset: 0, size: 3}],
    blocks: [0, 1].map(i => ({id: `r138-q${i}`, x: 1, y: 0, shape: [[0, 0]], color: 'green', generatorId: 'r138-machine'})),
    generators: [{id: 'r138-machine', side: 'top', offset: 1, spawn: [1, 0], queueBlockIds: ['r138-q0', 'r138-q1']}]},
    140: {width: 3, height: 3, gates: [], blocks: [{id: 'other', x: 0, y: 0, shape: [[0, 0]], color: 'red'}]}};
  change(layouts);
  const source = HEADER + Object.entries(layouts).map(([id, layout]) => `  ${id}: ${JSON.stringify(layout)},`).join('\n') + '\n};\n';
  const before = fs.readFileSync(DATA_PATH, 'utf8');
  const archive = {ruleVersion: '1.10.0', testFixtureOnly: true, before: [{levelId: 1, sha256: 'unchanged'}],
    previousArchive: {path: 'historical-parent-must-not-change', sha256: 'a'.repeat(64)},
    rows: Object.entries(layouts).map(([levelId, layout]) => ({levelId: Number(levelId), layoutSha256: digest(layout), drags: []})),
    expectedContinuationIds: Object.keys(layouts).map(Number), oldDataSha256: bytesSha256(before),
    expectedDataSha256: bytesSha256(source), untouched: {sentinel: true}};
  const patch = ['*** Begin Patch', `*** Update File: ${DATA_PATH}`, '@@',
    ...before.trimEnd().split(/\r?\n/).map(line => '-' + line),
    ...source.trimEnd().split('\n').map(line => '+' + line), '*** End Patch', ''].join('\n');
  return {source, archive, patch, layouts};
}
function writeFixture(value) {
  const dir = fs.mkdtempSync(path.resolve('.codex-temp', 'typed-emission-tests-'));
  const archivePath = path.join(dir, 'adoption.json'), patchPath = path.join(dir, 'data.patch');
  fs.writeFileSync(archivePath, JSON.stringify(value.archive) + '\n', {flag: 'wx'});
  fs.writeFileSync(patchPath, value.patch, {flag: 'wx'});
  return {archivePath, archiveSha256: sha(archivePath), patchPath, patchSha256: sha(patchPath), outputDirectory: dir};
}

test('exact full replacement parser rejects wrong targets, context hunks and malformed trailers', () => {
  const f = fixture(), parsed = parsePreparedPatch(f.patch);
  assert.equal(parsed.source, f.source);
  assert.throws(() => parsePreparedPatch(f.patch.replace(DATA_PATH, 'src/core/types.ts')), /header/);
  assert.throws(() => parsePreparedPatch(f.patch.replace('@@\n', '@@\n context\n')), /replacement/);
  assert.throws(() => parsePreparedPatch(f.patch + 'trailing'), /trailer/);
  assert.throws(() => parsePreparedPatch(f.patch.replaceAll('\n', '\r\n')), /LF/);
});

test('only two local constants are emitted; all other table bytes and all fields are preserved', () => {
  const f = fixture(), before = structuredClone(f.archive), result = transformPreparedSource(f.source, f.archive);
  assert.deepEqual(f.archive, before);
  assert.deepEqual(result.layouts, f.layouts);
  assert.deepEqual(result.metadata.map(m => m.blockId), ['r138-q0', 'r138-q1']);
  assert(result.source.includes('satisfies BlockSpec & { generatorId: "r138-machine" }'));
  assert(!result.source.includes(' as BlockSpec'));
  assert(!result.source.includes(' as any'));
  const originalOther = f.source.split('\n').find(line => line.startsWith('  140:'));
  assert.equal(result.source.split('\n').find(line => line.startsWith('  140:')), originalOther);
  let restored = result.source.replace("import type { BlockSpec } from './types';\n", '')
    .replace(/^const REVISED_LV138_QUEUE_[01] = .*;\n/gm, '');
  for (let i = 0; i < 2; i++) restored = restored.replace(`REVISED_LV138_QUEUE_${i}`, JSON.stringify(f.layouts[138].blocks[i]));
  assert.equal(restored, f.source, 'Exact inverse must reproduce every original byte');
});

test('metadata must occur on exactly the two reviewed IDs with exactly one matching queue owner', () => {
  const cases = [
    [l => l[138].blocks[0].generatorId = 'wrong', /authored generator ID/],
    [l => l[138].blocks[0].generatorId = 7, /string/],
    [l => l[138].blocks[0].id = 'another-block', /Unexpected metadata block/],
    [l => delete l[138].blocks[0].generatorId, /exactly the two/],
    [l => l[138].generators[0].queueBlockIds = ['r138-q1'], /exactly one queue/],
    [l => l[138].generators[0].id = 'another-machine', /queue authority/],
    [l => l[138].generators.push({...l[138].generators[0], id: 'another'}), /exactly one queue/],
    [l => l[138].generators[0].queueBlockIds.push('r138-q0'), /Duplicate queue/],
    [l => l[140].blocks[0].generatorId = 'r138-machine', /limited to Lv138/],
  ];
  for (const [change, pattern] of cases) {
    const f = fixture(change);
    assert.throws(() => transformPreparedSource(f.source, f.archive), pattern);
  }
});

test('archive source SHA, semantic row hash, exact ID coverage and canonical JSON are mandatory', () => {
  const f = fixture();
  assert.throws(() => transformPreparedSource(f.source + '\n', f.archive), /source SHA/);
  const changed = structuredClone(f.archive); changed.rows[0].layoutSha256 = '0'.repeat(64);
  assert.throws(() => transformPreparedSource(f.source, changed), /Layout hash/);
  const missing = structuredClone(f.archive); missing.rows.pop();
  assert.throws(() => transformPreparedSource(f.source, missing), /every layout/);
  const expected = structuredClone(f.archive); expected.expectedContinuationIds = [138];
  assert.throws(() => transformPreparedSource(f.source, expected), /Prepared IDs/);
  const noncanonical = f.source.replace('  138: {', '  138: { ');
  assert.throws(() => transformPreparedSource(noncanonical, {...f.archive, expectedDataSha256: bytesSha256(noncanonical)}), /Noncanonical/);
});

test('actual TypeScript accepts local constants but rejects malformed known properties and new unknown fields', () => {
  const f = fixture(), transformed = transformPreparedSource(f.source, f.archive);
  const positive = diagnoseTypedSource(transformed.source);
  assert.deepEqual(positive.diagnostics, []);
  assert(Object.keys(positive.bindings).some(p => p.replaceAll('\\', '/').endsWith('/src/core/types.ts')), 'Actual types.ts must be bound');
  assert(Object.keys(positive.bindings).some(p => p.replaceAll('\\', '/').endsWith('/src/core/revisedReviewedLayouts.generated.ts')));
  const variants = [
    [l => l[138].blocks[0].x = '1', /string.*number/],
    [l => l[138].blocks[0].color = 'not-a-color', /not-a-color/],
    [l => l[138].blocks[0].shape = [[0, 0, 1]], /Point/],
    [l => l[138].blocks[0].generatorID = 'typo', /generatorID/],
    [l => l[138].blocks[0].movementAxis = 'diagonal', /diagonal/],
    [l => delete l[138].blocks[0].shape, /shape/],
    [l => l[140].blocks[0].x = 'not-a-number', /string.*number/],
  ];
  for (const [change, error] of variants) {
    const bad = fixture(change), diagnostics = diagnoseTypedSource(transformPreparedSource(bad.source, bad.archive).source).diagnostics;
    assert(diagnostics.length, 'Negative fixture must fail');
    assert.match(diagnostics.map(d => d.message).join('\n'), error);
  }
  const directInline = "import type {BlockSpec} from './types'; export const blocks: BlockSpec[] = [" +
    f.layouts[138].blocks.map(block => `(${JSON.stringify(block)} satisfies BlockSpec & {generatorId:'r138-machine'})`).join(',') + '];';
  assert(diagnoseTypedSource(directInline).diagnostics.some(d => d.code === 2353), 'Regression: inline satisfies is not sufficient');
});

test('derivation writes exclusive new outputs, preserves archive history and verifies emitted runtime equality', () => {
  const args = writeFixture(fixture()), originalArchive = fs.readFileSync(args.archivePath), originalPatch = fs.readFileSync(args.patchPath);
  const output = prepareTypedContinuationEmission(args), derived = JSON.parse(fs.readFileSync(output.archivePath));
  const original = JSON.parse(originalArchive), {emissionCompatibility: c, ...rest} = derived;
  assert.deepEqual(rest, {...original, expectedDataSha256: output.typedSourceSha256});
  assert.equal(c.emittedObjectsDeepEqual, true);
  assert.equal(c.metadata.length, 2);
  assert.equal(verifyTypedContinuationEmission(output).status, 'passed-type-emission-only');
  assert.deepEqual(fs.readFileSync(args.archivePath), originalArchive);
  assert.deepEqual(fs.readFileSync(args.patchPath), originalPatch);
  assert.equal(sha(DATA_PATH), originalDataHash, 'Production must never be edited');
  assert.throws(() => prepareTypedContinuationEmission(args), /already exist/);
  assert.throws(() => verifyTypedContinuationEmission({...output, applied: true}), /production source/);
});

test('before-state drift and incorrect externally pinned hashes fail before outputs are written', () => {
  const args = writeFixture(fixture());
  assert.throws(() => prepareTypedContinuationEmission({...args, archiveSha256: '0'.repeat(64)}), /Evidence drift/);
  assert.throws(() => prepareTypedContinuationEmission({...args, patchSha256: '0'.repeat(64)}), /Evidence drift/);
  assert.throws(() => prepareTypedContinuationEmission({...args, archiveSha256: undefined}), /Explicit SHA/);
  const f = fixture(); f.archive.oldDataSha256 = '0'.repeat(64);
  const drifted = writeFixture(f);
  assert.throws(() => prepareTypedContinuationEmission(drifted), /BEFORE snapshot/);
  assert(!fs.existsSync(path.join(drifted.outputDirectory, 'adoption-typed.json')));
  assert(!fs.existsSync(path.join(drifted.outputDirectory, 'data-typed.patch')));
});

test('tampered derived rows, metadata, typed patch, original evidence and wrapper bindings are rejected', () => {
  const args = writeFixture(fixture()), output = prepareTypedContinuationEmission(args);
  const baseline = JSON.parse(fs.readFileSync(output.archivePath));
  let n = 0;
  for (const change of [
    d => d.before.push({levelId: 2}),
    d => d.rows[0].drags.push({forged: true}),
    d => d.emissionCompatibility.metadata[0].generatorId = 'wrong',
    d => d.emissionCompatibility.wrapper.sha256 = '0'.repeat(64),
    d => d.emissionCompatibility.originalArchive.sha256 = '0'.repeat(64),
    d => d.emissionCompatibility.typedPatchSha256 = '0'.repeat(64),
    d => d.emissionCompatibility.emittedObjectsDeepEqual = false,
    d => d.emissionCompatibility.typeValidation.inputs = {},
  ]) {
    const altered = structuredClone(baseline); change(altered);
    const p = path.join(args.outputDirectory, `altered-${n++}.json`);
    fs.writeFileSync(p, JSON.stringify(altered), {flag: 'wx'});
    assert.throws(() => verifyTypedContinuationEmission({archivePath: p, archiveSha256: sha(p)}));
  }
  assert.equal(sha(DATA_PATH), originalDataHash);
});

test('real cumulative62 fixture has exact original candidate semantics after type-only transformation', {skip: !fs.existsSync('.codex-temp/remaining161-v110/adoption-cumulative62/adoption.json')}, () => {
  const dir = '.codex-temp/remaining161-v110/adoption-cumulative62', archivePath = `${dir}/adoption.json`;
  assert.equal(sha(archivePath), 'cb4a47ee886b95b2dc577a3119b805c6e9f1cbad19d6816376d541e4245af407');
  const archive = JSON.parse(fs.readFileSync(archivePath)), parsed = parsePreparedPatch(fs.readFileSync(`${dir}/data.patch`, 'utf8'));
  const result = transformPreparedSource(parsed.source, archive);
  assert.equal(Object.keys(result.layouts).length, 62);
  assert.deepEqual(diagnoseTypedSource(result.source).diagnostics, []);
  assert.deepEqual(result.metadata.map(m => m.blockId), ['r138-q0', 'r138-q1']);
  assert.equal(sha(DATA_PATH), originalDataHash);
});
