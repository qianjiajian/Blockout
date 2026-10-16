import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import ts from 'typescript';
import {decodeLayoutBytes, encodeLayoutBytes, layoutChecksum} from '../tools/wechat-layout-codec.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const MODULES = [
  {key: 'league', path: 'src/core/leagueLevelData.ts', exportName: 'LEAGUE_LEVELS', wrapper: null},
  {key: 'daily', path: 'src/core/formalDailyChallengeData.ts', exportName: 'FORMAL_DAILY_CHALLENGE_CATALOG', wrapper: 'freezeTree'},
];
const RUNTIME_HELPER = 'src/core/clonePlainData.ts';
const HELPERS = ['scripts/wechat-event-level-data.mjs', 'tools/wechat-layout-codec.mjs', RUNTIME_HELPER];

function assertEventImport(node) {
  if (node.importClause?.isTypeOnly) return;
  const clause = node.importClause;
  const bindings = clause?.namedBindings;
  const allowed = ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === './clonePlainData'
    && !node.attributes && clause && !clause.name && bindings && ts.isNamedImports(bindings)
    && bindings.elements.length === 1 && bindings.elements[0].name.text === 'clonePlainData'
    && !bindings.elements[0].propertyName && !bindings.elements[0].isTypeOnly;
  assert(allowed, 'Event data runtime imports are limited to the unaliased named clonePlainData from ./clonePlainData');
}

function auditModuleImports(source, helper = false) {
  const file = ts.createSourceFile(helper ? 'clonePlainData.ts' : 'event-data.ts', source,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length, 0, 'Event module syntax error');
  const walk = node => {
    if (ts.isImportDeclaration(node)) {
      assert(!helper, 'The snapshotted clonePlainData helper must have no transitive imports');
      assertEventImport(node);
    }
    if (ts.isExportDeclaration(node)) assert(!node.moduleSpecifier, 'Event data must not re-export a runtime module');
    assert(!ts.isImportEqualsDeclaration(node), 'Event data must not use import-equals dependencies');
    if (ts.isCallExpression(node)) {
      assert(node.expression.kind !== ts.SyntaxKind.ImportKeyword, 'Event data must not dynamically import a module');
      assert(!(ts.isIdentifier(node.expression) && node.expression.text === 'require'), 'Event data must not require a module');
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  return file;
}

/** JSON must preserve every field and every reference relationship. Unlike the
 * campaign serializer, event directories currently need no undefined sentinel.
 * Refuse lossy future data rather than quietly deleting or rewriting it. */
export function auditEventJson(value) {
  const seen = new Map();
  let objects = 0, fields = 0;
  const visit = (item, path) => {
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return;
    if (typeof item === 'number') {
      assert(Number.isFinite(item) && !Object.is(item, -0), `Non-JSON number at ${path}`);
      return;
    }
    assert(item && typeof item === 'object', `Non-JSON ${typeof item} at ${path}`);
    assert(!seen.has(item), `Repeated/cyclic object at ${path}; first at ${seen.get(item)}`);
    seen.set(item, path); objects++;
    assert.equal(Object.getOwnPropertySymbols(item).length, 0, `Symbol field at ${path}`);
    const array = Array.isArray(item);
    assert.equal(Object.getPrototypeOf(item), array ? Array.prototype : Object.prototype, `Non-plain object at ${path}`);
    const descriptors = Object.getOwnPropertyDescriptors(item);
    if (array) {
      assert.equal(Object.keys(item).length, item.length, `Sparse/augmented array at ${path}`);
      for (let i = 0; i < item.length; i++) assert(Object.hasOwn(item, i), `Array hole at ${path}[${i}]`);
    }
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === 'length') continue;
      assert(descriptor.enumerable && Object.hasOwn(descriptor, 'value'), `Hidden/accessor field at ${path}.${key}`);
      fields++; visit(descriptor.value, `${path}.${key}`);
    }
  };
  visit(value, '$');
  return {jsonLegal: true, undefinedFields: 0, referenceAliases: 0, objects, fields};
}

/** Only the array literal is replaced. Freeze wrappers, exports, map creation,
 * lookup closures, and clone functions remain authored source text. */
export function replaceEventArray(source, exportName, wrapper, packed) {
  const file = auditModuleImports(source);
  const declarations = [];
  const identifiers = new Set();
  const walk = node => {
    if (ts.isIdentifier(node)) identifiers.add(node.text);
    ts.forEachChild(node, walk);
  };
  walk(file);
  for (const statement of file.statements) if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) {
        assert(statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword), 'Catalog must remain exported');
        declarations.push(declaration);
      }
    }
  }
  assert.equal(declarations.length, 1, `Expected exactly one ${exportName} declaration`);
  let expression = declarations[0].initializer;
  if (wrapper) {
    assert(expression && ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) &&
      expression.expression.text === wrapper && expression.arguments.length === 1, `Expected ${wrapper}(array) initializer`);
    expression = expression.arguments[0];
  }
  assert(expression && ts.isArrayLiteralExpression(expression), 'Catalog initializer must be an array literal');
  for (const name of ['layoutChecksum', 'decodeLayoutBytes']) assert(!identifiers.has(name), `Codec identifier collision: ${name}`);
  const start = expression.getStart(file), end = expression.getEnd();
  const replacement = `JSON.parse(decodeLayoutBytes(${JSON.stringify(packed.base64)},${packed.outputLength},${packed.checksum}))`;
  const preamble = `${layoutChecksum.toString()}\n${decodeLayoutBytes.toString()}\n`;
  return {source: preamble + source.slice(0, start) + replacement + source.slice(end),
    sourcePrefix: source.slice(0, start), sourceSuffix: source.slice(end), preamble,
    replacedSpan: {start, end}, replacement};
}

/** Resolve the single runtime dependency from bytes already included in the
 * input snapshot. No on-disk resolution or unbound transitive read is allowed. */
export async function evaluateEventSource(source, helperSource) {
  auditModuleImports(source);
  assert.equal(typeof helperSource, 'string', 'A snapshotted clonePlainData source is required');
  auditModuleImports(helperSource, true);
  const result = await build({
    stdin: {contents: source, loader: 'ts', sourcefile: 'event-data.ts'},
    bundle: true, write: false, platform: 'neutral', format: 'esm', target: 'es2020', charset: 'ascii',
    logLevel: 'silent',
    plugins: [{
      name: 'bound-event-clone-helper',
      setup(bundler) {
        bundler.onResolve({filter: /.*/}, args => {
          assert(args.path === './clonePlainData' && args.importer === 'event-data.ts',
            `Unbound event runtime dependency: ${args.path}`);
          return {path: RUNTIME_HELPER, namespace: 'event-source-snapshot'};
        });
        bundler.onLoad({filter: /.*/, namespace: 'event-source-snapshot'}, args => {
          assert.equal(args.path, RUNTIME_HELPER, 'Unexpected snapshotted event helper');
          return {contents: helperSource, loader: 'ts'};
        });
      },
    }],
  });
  assert.equal(result.outputFiles.length, 1, 'Event evaluation must produce exactly one in-memory module');
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}

function compareTree(original, compiled, path = '$') {
  assert.deepEqual(compiled, original, `Event data changed at ${path}`);
  const visit = (left, right, position) => {
    if (!left || typeof left !== 'object') return;
    assert.equal(Object.isFrozen(right), Object.isFrozen(left), `Freeze changed at ${position}`);
    assert.equal(Object.isSealed(right), Object.isSealed(left), `Seal changed at ${position}`);
    assert.equal(Object.isExtensible(right), Object.isExtensible(left), `Extensibility changed at ${position}`);
    assert.deepEqual(Reflect.ownKeys(right), Reflect.ownKeys(left), `Field order changed at ${position}`);
    for (const key of Reflect.ownKeys(left)) {
      const a = Object.getOwnPropertyDescriptor(left, key), b = Object.getOwnPropertyDescriptor(right, key);
      assert.deepEqual({w: b.writable, e: b.enumerable, c: b.configurable},
        {w: a.writable, e: a.enumerable, c: a.configurable}, `Descriptor changed at ${position}.${key}`);
      visit(a.value, b.value, `${position}.${key}`);
    }
  };
  visit(original, compiled, path);
}

const resultOf = (fn, ...args) => {
  try { return {value: fn(...args)}; }
  catch (error) { return {error: error.constructor.name, message: error.message}; }
};

/** Verify the exact emitted module, including the original Map-backed object
 * identities and independent mutable level clones. No player state is used. */
export function verifyEventModules(original, compiled) {
  for (const key of ['league', 'daily']) {
    assert.deepEqual(Object.keys(compiled[key]), Object.keys(original[key]), `${key} exports changed`);
    for (const name of Object.keys(original[key])) {
      assert.equal(typeof compiled[key][name], typeof original[key][name], `${key}.${name} type changed`);
      if (typeof original[key][name] !== 'function') compareTree(original[key][name], compiled[key][name], `${key}.${name}`);
    }
  }
  assert.equal(original.league.LEAGUE_LEVELS.length, 100, 'Expected current formal league 100');
  assert.deepEqual(original.league.LEAGUE_LEVELS.map(entry => entry.index), Array.from({length: 100}, (_, i) => i + 1));
  const stages = original.daily.FORMAL_DAILY_CHALLENGE_CATALOG;
  assert.equal(stages.length, 15, 'Expected current production daily 15 stages; draft 300 is not admitted');
  let count = 0;
  const ids = new Set();
  for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
    const stage = stages[stageIndex], materialized = compiled.daily.FORMAL_DAILY_CHALLENGE_CATALOG[stageIndex];
    assert.equal(compiled.daily.getFormalDailyChallengeStage(stage.stageKey), materialized);
    for (const difficulty of [1, 2, 3]) {
      const sourceCandidates = stage.difficulties[difficulty].candidates;
      assert.equal(sourceCandidates.length, 10);
      const a = original.daily.getFormalDailyChallengeAssignments(stage.stageKey, difficulty);
      const b = compiled.daily.getFormalDailyChallengeAssignments(stage.stageKey, difficulty);
      compareTree(a, b, `assignments.${stage.stageKey}.${difficulty}`);
      assert.notEqual(b, compiled.daily.getFormalDailyChallengeAssignments(stage.stageKey, difficulty));
      for (let i = 0; i < sourceCandidates.length; i++) {
        const candidate = sourceCandidates[i], restored = materialized.difficulties[difficulty].candidates[i];
        assert(!ids.has(candidate.formalId), `Duplicate formal daily ID: ${candidate.formalId}`);
        ids.add(candidate.formalId); count++;
        assert.equal(compiled.daily.getFormalDailyChallengeCandidate(candidate.formalId), restored);
        const sourceClone = original.daily.getFormalDailyChallengeLevel(candidate.formalId);
        const clone = compiled.daily.getFormalDailyChallengeLevel(candidate.formalId);
        compareTree(sourceClone, clone, `clone.${candidate.formalId}`);
        assert.notEqual(clone, restored.level);
        assert.notEqual(clone.blocks, restored.level.blocks);
        assert.notEqual(clone, compiled.daily.getFormalDailyChallengeLevel(candidate.formalId));
        const name = restored.level.name;
        clone.name = '__wechat_clone_isolation_probe__';
        assert.equal(restored.level.name, name);
        if (clone.blocks.length) {
          const blockId = restored.level.blocks[0].id;
          clone.blocks[0].id = '__wechat_nested_clone_isolation_probe__';
          assert.equal(restored.level.blocks[0].id, blockId);
        }
        assert.equal(compiled.daily.getFormalDailyChallengeLevel(candidate.formalId).name, name);
        for (const [field, value] of Object.entries(restored)) {
          if (field === 'level' || field === 'formalId') continue;
          if (value && typeof value === 'object') assert.equal(b[i][field], value, `Assignment metadata identity changed: ${field}`);
        }
      }
    }
  }
  assert.equal(count, 450, 'Expected current production daily 450');
  const absent = [undefined, null, '', 'missing', 0, 1, true, {}, [], Symbol('id')];
  for (const name of ['getFormalDailyChallengeStage', 'getFormalDailyChallengeCandidate', 'getFormalDailyChallengeLevel']) {
    for (const id of absent) assert.deepEqual(resultOf(compiled.daily[name], id), resultOf(original.daily[name], id), `${name} missing-key semantics`);
  }
  for (const stageKey of [stages[0].stageKey, 'missing', undefined]) {
    for (const difficulty of [1, 2, 3, '1', 0, 4, undefined, null, Symbol('difficulty')]) {
      assert.deepEqual(resultOf(compiled.daily.getFormalDailyChallengeAssignments, stageKey, difficulty),
        resultOf(original.daily.getFormalDailyChallengeAssignments, stageKey, difficulty), 'Assignment lookup semantics');
    }
  }
  return {leagueCount: 100, dailyStageCount: 15, dailyLevelCount: count, exactDataEqual: true,
    exportSemanticsEqual: true, deepFreezeSemanticsEqual: true, mapIdentityPreserved: true,
    lookupSemanticsEqual: true, assignmentIdentityPreserved: true, mutableCloneIsolationEqual: true};
}

/** Build-only replacement modules; never writes authored source or runtime data.
 * replacements keys are absolute paths suitable for esbuild onLoad args.path.
 * Every input is snapshotted before compilation and compared after validation. */
export async function createWechatEventLevelModules(root = process.cwd()) {
  root = resolve(root);
  const paths = [...MODULES.map(item => item.path), ...HELPERS];
  const inputs = new Map(await Promise.all(paths.map(async path => [path, await readFile(resolve(root, path))])));
  const original = {}, compiled = {}, sources = {}, replacements = new Map(), modules = [];
  const helperSource = inputs.get(RUNTIME_HELPER).toString('utf8');
  replacements.set(resolve(root, RUNTIME_HELPER), {contents: helperSource, loader: 'ts'});
  for (const spec of MODULES) {
    const source = inputs.get(spec.path).toString('utf8');
    original[spec.key] = await evaluateEventSource(source, helperSource);
    const data = original[spec.key][spec.exportName];
    const audit = auditEventJson(data);
    const json = JSON.stringify(data);
    const packed = encodeLayoutBytes(json);
    assert.deepEqual(JSON.parse(decodeLayoutBytes(packed.base64, packed.outputLength, packed.checksum)), data);
    const generated = replaceEventArray(source, spec.exportName, spec.wrapper, packed);
    sources[spec.key] = generated.source;
    compiled[spec.key] = await evaluateEventSource(generated.source, helperSource);
    replacements.set(resolve(root, spec.path), {contents: generated.source, loader: 'ts'});
    modules.push({key: spec.key, path: spec.path, exportName: spec.exportName, ...audit,
      sourceSha256: hash(inputs.get(spec.path)), jsonSha256: hash(json), generatedModuleSha256: hash(generated.source),
      sourceBytes: inputs.get(spec.path).length, generatedModuleBytes: Buffer.byteLength(generated.source),
      jsonBytes: Buffer.byteLength(json), asciiBytes: packed.outputLength, compressedBytes: packed.bytes,
      packedBytes: packed.encodedBytes, adler32: packed.checksum, replacedSpan: generated.replacedSpan,
      authoredNonArraySourcePreserved: true});
  }
  const semantics = verifyEventModules(original, compiled);
  const inputHashes = await Promise.all(paths.map(async path => ({path, before: hash(inputs.get(path)), after: hash(await readFile(resolve(root, path)))})));
  assert(inputHashes.every(input => input.before === input.after), 'Event source changed during WeChat materialization');
  return {replacements, sources, original, compiled, report: {schemaVersion: 1,
    codec: 'ascii-lz77-base64-adler32-v1', ...semantics, modules,
    sourceInputsStable: true, inputHashes, sourceInputsSha256: hash(JSON.stringify(inputHashes)),
    sourceFilesWritten: false, note: 'Build-time byte packing only; current formal league 100 and production daily 450 retain all fields, authored lookup functions and deep-freeze behavior.'}};
}
