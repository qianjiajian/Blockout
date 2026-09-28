import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import ts from 'typescript';
import {verifyRulesLock} from './verify-rules-lock.mjs';

export const DATA_PATH = 'src/core/revisedContinuationLayouts.generated.ts';
const SELF = fileURLToPath(import.meta.url);
const COMPILER = createRequire(import.meta.url).resolve('typescript');
const HEADER = "// Generated from independently reviewed v1.10 continuation batches; routes remain in evidence.\n" +
  "import type { RevisedLevelLayout } from './revisedReviewedLayouts.generated';\n";
const DECLARATION = 'export const REVISED_CONTINUATION_LAYOUTS: Record<number, RevisedLevelLayout> = {\n';
const EXPECTED_METADATA = ['r138-q0', 'r138-q1'];
export const bytesSha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const semanticSha = value => bytesSha256(JSON.stringify(canonical(value)));
const fileSha = p => bytesSha256(fs.readFileSync(p));
const pinned = (p, sha) => {
  assert.match(sha ?? '', /^[a-f0-9]{64}$/i, `Explicit SHA required: ${p}`);
  const bytes = fs.readFileSync(p);
  assert.equal(bytesSha256(bytes), sha.toLowerCase(), `Evidence drift: ${p}`);
  return bytes;
};
const readPinned = (p, sha) => JSON.parse(pinned(p, sha));

// The historical producer emits one complete-file patch, not arbitrary hunks.
export function parsePreparedPatch(patchText) {
  assert(!patchText.includes('\r'), 'Expected canonical LF patch');
  const lines = patchText.split('\n');
  assert.deepEqual(lines.splice(0, 3), ['*** Begin Patch', `*** Update File: ${DATA_PATH}`, '@@'], 'Unexpected patch target/header');
  assert.deepEqual(lines.splice(-2), ['*** End Patch', ''], 'Unexpected patch trailer');
  const oldLines = [], newLines = [];
  let additions = false;
  for (const line of lines) {
    if (line.startsWith('+')) { additions = true; newLines.push(line.slice(1)); }
    else { assert(!additions && line.startsWith('-'), 'Only full replacement patches are supported'); oldLines.push(line.slice(1)); }
  }
  assert(oldLines.length && newLines.length, 'Empty replacement');
  return {oldLines, source: newLines.join('\n') + '\n'};
}
const renderPatch = (oldLines, source) => ['*** Begin Patch', `*** Update File: ${DATA_PATH}`, '@@',
  ...oldLines.map(s => '-' + s), ...source.trimEnd().split('\n').map(s => '+' + s), '*** End Patch', ''].join('\n');

export function transformPreparedSource(source, archive) {
  assert.equal(archive.ruleVersion, '1.10.0');
  assert(!archive.emissionCompatibility, 'Input must be the untouched historical producer archive');
  assert.equal(bytesSha256(source), archive.expectedDataSha256, 'Prepared source SHA mismatch');
  assert(source.startsWith(HEADER + DECLARATION) && source.endsWith('\n};\n'), 'Unexpected producer source envelope');
  const body = source.slice((HEADER + DECLARATION).length, -4);
  const layouts = {};
  for (const line of body.split('\n')) {
    const match = /^  (\d+): (.*),$/.exec(line);
    assert(match, 'Expected one canonical JSON layout per line');
    const id = Number(match[1]);
    assert(!Object.hasOwn(layouts, id), 'Duplicate level ID');
    const layout = JSON.parse(match[2]);
    assert.equal(JSON.stringify(layout), match[2], 'Noncanonical layout literal');
    layouts[id] = layout;
  }
  const ids = Object.keys(layouts).map(Number);
  assert.deepEqual(ids, archive.expectedContinuationIds, 'Prepared IDs differ from archive');
  assert.deepEqual(archive.rows.map(r => r.levelId), ids, 'Archive rows must cover every layout exactly once');
  for (const row of archive.rows) assert.equal(semanticSha(layouts[row.levelId]), row.layoutSha256, `Layout hash differs: ${row.levelId}`);
  const metadata = [], declarations = [];
  let typedSource = source;
  for (const [id, level] of Object.entries(layouts)) {
    assert(Array.isArray(level.blocks), 'Missing blocks');
    assert.equal(new Set(level.blocks.map(b => b.id)).size, level.blocks.length, 'Duplicate block ID');
    for (const block of level.blocks) {
      if (!Object.hasOwn(block, 'generatorId')) continue;
      assert.equal(Number(id), 138, 'Metadata emission exception is limited to Lv138');
      assert(EXPECTED_METADATA.includes(block.id), 'Unexpected metadata block');
      assert.equal(typeof block.generatorId, 'string', 'Generator metadata must be a string');
      assert.equal(block.generatorId, 'r138-machine', 'Unexpected authored generator ID');
      const owners = (level.generators ?? []).filter(g => g.queueBlockIds.includes(block.id));
      assert.equal(owners.length, 1, 'Metadata block must belong to exactly one queue');
      assert.equal(owners[0].id, block.generatorId, 'Metadata disagrees with queue authority');
      assert.equal(owners[0].queueBlockIds.filter(id => id === block.id).length, 1, 'Duplicate queue membership');
      const literal = JSON.stringify(block), variable = `REVISED_LV138_QUEUE_${EXPECTED_METADATA.indexOf(block.id)}`;
      assert.equal(typedSource.split(literal).length - 1, 1, 'Block literal must occur exactly once');
      typedSource = typedSource.replace(literal, variable);
      declarations.push(`const ${variable} = ${literal} satisfies BlockSpec & { generatorId: ${JSON.stringify(block.generatorId)} };\n`);
      metadata.push({levelId: 138, blockId: block.id, generatorId: block.generatorId, variable, objectSha256: semanticSha(block)});
    }
  }
  assert.deepEqual(metadata.map(r => r.blockId), EXPECTED_METADATA, 'Expected exactly the two reviewed metadata blocks');
  typedSource = typedSource.replace(HEADER, HEADER + "import type { BlockSpec } from './types';\n" + declarations.join(''));
  return {source: typedSource, layouts, metadata, layoutSemanticSha256: semanticSha(layouts)};
}

// Virtual source: no generated/runtime file is touched. Check the whole table,
// not only metadata fields, against the actual BlockSpec and layout interfaces.
export function diagnoseTypedSource(source, root = process.cwd()) {
  const filename = path.resolve(root, DATA_PATH);
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true, skipLibCheck: true, types: []};
  const host = ts.createCompilerHost(options), originalGet = host.getSourceFile, originalRead = host.readFile;
  const bindings = {};
  host.readFile = p => {
    const value = originalRead(p);
    if (value !== undefined && !p.includes('node_modules') && path.resolve(p) !== filename) {
      const key = path.resolve(p), hash = bytesSha256(value);
      if (bindings[key]) assert.equal(bindings[key], hash, 'Type source changed during compiler read');
      bindings[key] = hash;
    }
    return value;
  };
  host.getSourceFile = (p, language, onError, fresh) => path.resolve(p) === filename
    ? ts.createSourceFile(p, source, language, true) : originalGet(p, language, onError, fresh);
  const program = ts.createProgram([filename], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, ' '), file: d.file?.fileName,
    line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : undefined}));
  for (const [p, sha] of Object.entries(bindings)) assert.equal(fileSha(p), sha, `Type input drift: ${p}`);
  return {diagnostics, bindings};
}
function emittedLayouts(source) {
  const js = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
  const context = {exports: {}};
  vm.runInNewContext(js, context, {timeout: 2000});
  return JSON.parse(JSON.stringify(context.exports.REVISED_CONTINUATION_LAYOUTS));
}
function validateTransformation(source, archive) {
  const transformed = transformPreparedSource(source, archive), typecheck = diagnoseTypedSource(transformed.source);
  assert.deepEqual(typecheck.diagnostics, [], 'Typed emission must pass real TypeScript validation');
  assert.deepEqual(emittedLayouts(source), transformed.layouts, 'Original emitted values differ');
  assert.deepEqual(emittedLayouts(transformed.source), transformed.layouts, 'Typed emission changed runtime objects');
  return {...transformed, typeBindings: typecheck.bindings};
}
const ruleGate = () => { const lock = verifyRulesLock(); assert(lock.ok && lock.activeVersion === '1.10.0', 'Rule lock must pass v1.10'); };
const inputBinding = p => ({path: path.resolve(p), sha256: fileSha(p)});
const checkInputs = bindings => { for (const binding of bindings) pinned(binding.path, binding.sha256); };

/** Derive an unapplied producer patch. Does not apply it or modify old evidence. */
export function prepareTypedContinuationEmission({archivePath, archiveSha256, patchPath, patchSha256, outputDirectory}) {
  ruleGate();
  const archive = readPinned(archivePath, archiveSha256), patchText = pinned(patchPath, patchSha256).toString('utf8');
  const {oldLines, source} = parsePreparedPatch(patchText), before = fs.readFileSync(DATA_PATH, 'utf8');
  assert.equal(bytesSha256(before), archive.oldDataSha256, 'Current production source is not the prepared BEFORE snapshot');
  assert.deepEqual(before.trimEnd().split(/\r?\n/), oldLines, 'Patch removal differs from current source');
  const baseBindings = [inputBinding(SELF), inputBinding(COMPILER), inputBinding(archivePath), inputBinding(patchPath),
    inputBinding(DATA_PATH), inputBinding('docs/rules/manifest.json'), inputBinding('docs/mechanism-rules-v1.10.0.md')];
  const checked = validateTransformation(source, archive), typedPatch = renderPatch(oldLines, checked.source);
  const compatibility = {schemaVersion: 1, kind: 'lv138-authored-queue-metadata-type-emission',
    wrapper: inputBinding(SELF), originalArchive: {path: path.resolve(archivePath), sha256: archiveSha256.toLowerCase()},
    originalPatch: {path: path.resolve(patchPath), sha256: patchSha256.toLowerCase()},
    originalExpectedDataSha256: archive.expectedDataSha256, beforeSourceSha256: archive.oldDataSha256,
    typedSourceSha256: bytesSha256(checked.source), typedPatchSha256: bytesSha256(typedPatch),
    layoutSemanticSha256: checked.layoutSemanticSha256, metadata: checked.metadata,
    typeValidation: {typescriptVersion: ts.version, compiler: inputBinding(COMPILER), inputs: checked.typeBindings,
      diagnostics: [], fullGeneratedTableChecked: true},
    emittedObjectsDeepEqual: true, ruleBindings: baseBindings.slice(-2),
    note: 'Type-only emission. Original rows/before/previousArchive and all candidate/source evidence are retained unchanged. Not UI, timing, difficulty or release approval.'};
  const derived = {...archive, expectedDataSha256: compatibility.typedSourceSha256, emissionCompatibility: compatibility};
  const archiveOut = path.resolve(outputDirectory, 'adoption-typed.json'), patchOut = path.resolve(outputDirectory, 'data-typed.patch');
  assert(!fs.existsSync(archiveOut) && !fs.existsSync(patchOut), 'Derived outputs already exist; never overwrite');
  checkInputs(baseBindings);
  for (const [p, sha] of Object.entries(checked.typeBindings)) pinned(p, sha);
  fs.mkdirSync(outputDirectory, {recursive: true});
  fs.writeFileSync(archiveOut, JSON.stringify(derived, null, 2) + '\n', {flag: 'wx'});
  fs.writeFileSync(patchOut, typedPatch, {flag: 'wx'});
  checkInputs(baseBindings);
  return {archivePath: archiveOut, archiveSha256: fileSha(archiveOut), patchPath: patchOut,
    patchSha256: fileSha(patchOut), typedSourceSha256: compatibility.typedSourceSha256,
    layoutSemanticSha256: checked.layoutSemanticSha256, metadata: checked.metadata};
}

/** Run alongside verifyContinuationBatch: its historical verifier has no knowledge of this new metadata. */
export function verifyTypedContinuationEmission({archivePath, archiveSha256, applied = false}) {
  ruleGate();
  const derived = readPinned(archivePath, archiveSha256), c = derived.emissionCompatibility;
  assert.equal(c?.schemaVersion, 1, 'Missing typed emission evidence');
  assert.equal(c.kind, 'lv138-authored-queue-metadata-type-emission');
  assert.equal(path.resolve(c.wrapper.path), SELF, 'Wrong emission wrapper');
  pinned(SELF, c.wrapper.sha256); pinned(COMPILER, c.typeValidation.compiler.sha256);
  assert.equal(path.resolve(c.typeValidation.compiler.path), COMPILER);
  assert.equal(c.typeValidation.typescriptVersion, ts.version);
  checkInputs(c.ruleBindings);
  for (const [p, sha] of Object.entries(c.typeValidation.inputs)) pinned(p, sha);
  const original = readPinned(c.originalArchive.path, c.originalArchive.sha256);
  const originalPatch = pinned(c.originalPatch.path, c.originalPatch.sha256).toString('utf8');
  const {oldLines, source} = parsePreparedPatch(originalPatch), checked = validateTransformation(source, original);
  const {emissionCompatibility: ignored, ...rest} = derived;
  assert.deepEqual(rest, {...original, expectedDataSha256: bytesSha256(checked.source)}, 'Derived archive changed historical fields');
  assert.equal(c.originalExpectedDataSha256, original.expectedDataSha256);
  assert.equal(c.beforeSourceSha256, original.oldDataSha256);
  assert.equal(c.typedSourceSha256, bytesSha256(checked.source));
  assert.equal(c.layoutSemanticSha256, checked.layoutSemanticSha256);
  assert.deepEqual(c.metadata, checked.metadata);
  assert.deepEqual(c.typeValidation.inputs, checked.typeBindings);
  assert.deepEqual(c.typeValidation.diagnostics, []);
  assert.equal(c.typeValidation.fullGeneratedTableChecked, true);
  assert.equal(c.emittedObjectsDeepEqual, true);
  const patchPath = path.resolve(path.dirname(archivePath), 'data-typed.patch');
  assert.equal(pinned(patchPath, c.typedPatchSha256).toString('utf8'), renderPatch(oldLines, checked.source), 'Typed patch differs from exact transformation');
  const current = fs.readFileSync(DATA_PATH, 'utf8');
  assert.equal(bytesSha256(current), applied ? c.typedSourceSha256 : original.oldDataSha256, 'Unexpected current production source');
  if (!applied) assert.deepEqual(current.trimEnd().split(/\r?\n/), oldLines);
  return {status: 'passed-type-emission-only', applied, archivePath, archiveSha256,
    layoutSemanticSha256: checked.layoutSemanticSha256, metadata: checked.metadata,
    pointerValidated: false, naturalClockValidated: false, lowerBoundCertified: false, releaseApproved: false};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, archivePath, archiveSha256, patchPath, patchSha256, outputDirectory] = process.argv.slice(2);
  const result = mode === 'prepare'
    ? prepareTypedContinuationEmission({archivePath, archiveSha256, patchPath, patchSha256, outputDirectory})
    : mode === 'verify' ? verifyTypedContinuationEmission({archivePath, archiveSha256, applied: patchPath === '--applied'})
    : assert.fail('Usage: prepare ARCHIVE SHA PATCH SHA OUTPUT | verify TYPED_ARCHIVE SHA [--applied]');
  console.log(JSON.stringify(result, null, 2));
}
